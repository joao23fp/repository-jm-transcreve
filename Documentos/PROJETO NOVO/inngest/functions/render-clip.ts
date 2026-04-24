import path from 'path'
import fs from 'fs/promises'
import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { StatusClipe } from '@/lib/enums'
import { IS_LOCAL_STORAGE, localStorageRead, localStorageSave } from '@/lib/storage'
import { sendClipReadyEmail, sendClipErrorEmail } from '@/lib/email/upload-notifications'

export const renderClip = inngest.createFunction(
  {
    id: 'render-clip',
    retries: 3,
    triggers: [{ event: 'clip/render.requested' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { clipId, userId, fileId, startMs, endMs } = event.data

    await step.run('mark-processing', async () => {
      await prisma.videoClip.update({
        where: { id: clipId },
        data: { status: StatusClipe.PROCESSING },
      })
    })

    const inputTmp = `/tmp/${clipId}-input`
    const outputTmp = `/tmp/${clipId}-output.mp4`
    const thumbTmp = `/tmp/${clipId}-thumb.jpg`

    try {
      // Etapa 1: baixar vídeo original
      await step.run('download-original', async () => {
        const upload = await prisma.fileUpload.findFirst({ where: { jobId: fileId } })
        if (!upload) throw new Error('Arquivo original não encontrado')

        const ext = path.extname(upload.storagePath) || '.mp4'
        const inputPath = `${inputTmp}${ext}`

        if (IS_LOCAL_STORAGE) {
          const data = await localStorageRead(upload.storagePath)
          await fs.mkdir(path.dirname(inputPath), { recursive: true })
          await fs.writeFile(inputPath, data)
        } else {
          const { createSupabaseServiceClient } = await import('@/lib/supabase/server')
          const supabase = createSupabaseServiceClient()
          const { data, error } = await supabase.storage
            .from('transcribeadv-uploads')
            .download(upload.storagePath)
          if (error || !data) throw new Error(`Erro ao baixar vídeo: ${error?.message}`)
          const buf = Buffer.from(await data.arrayBuffer())
          await fs.mkdir(path.dirname(inputPath), { recursive: true })
          await fs.writeFile(inputPath, buf)
        }

        return inputPath
      })

      // Etapa 2: renderizar clipe
      const ext = '.mp4'
      const inputPath = `${inputTmp}${ext}`

      await step.run('render-clip', async () => {
        const { cutVideoClip } = await import('@/lib/ffmpeg-server')
        await cutVideoClip(inputPath, outputTmp, startMs, endMs)
      })

      // Etapa 3: gerar thumbnail
      await step.run('generate-thumbnail', async () => {
        const { extractThumbnail } = await import('@/lib/ffmpeg-server')
        const seekMs = startMs + Math.floor((endMs - startMs) / 2)
        await extractThumbnail(inputPath, thumbTmp, seekMs).catch(() => null)
      })

      // Etapa 4: upload para Storage
      const clipStoragePath = `clips/${userId}/${clipId}.mp4`
      const thumbnailPath = `clips/${userId}/${clipId}-thumb.jpg`

      await step.run('upload-to-storage', async () => {
        const clipData = await fs.readFile(outputTmp)
        const thumbData = await fs.readFile(thumbTmp).catch(() => null)

        if (IS_LOCAL_STORAGE) {
          await localStorageSave(clipStoragePath, clipData)
          if (thumbData) await localStorageSave(thumbnailPath, thumbData)
        } else {
          const { createSupabaseServiceClient } = await import('@/lib/supabase/server')
          const supabase = createSupabaseServiceClient()
          await supabase.storage.from('transcribeadv-uploads').upload(clipStoragePath, clipData, { contentType: 'video/mp4', upsert: true })
          if (thumbData) await supabase.storage.from('transcribeadv-uploads').upload(thumbnailPath, thumbData, { contentType: 'image/jpeg', upsert: true })
        }
      })

      // Etapa 5: atualizar status para COMPLETED
      await step.run('update-status', async () => {
        await prisma.videoClip.update({
          where: { id: clipId },
          data: {
            status: StatusClipe.COMPLETED,
            clipStoragePath,
            thumbnailPath,
            completedAt: new Date(),
          },
        })
      })

      // Etapa 6: notificar usuário
      await step.run('notify-user', async () => {
        const clip = await prisma.videoClip.findUnique({ where: { id: clipId } })
        if (clip) await sendClipReadyEmail(userId, clip.name).catch(() => null)
      })

    } catch (err: any) {
      await prisma.videoClip.update({
        where: { id: clipId },
        data: { status: StatusClipe.FAILED, errorMessage: err?.message ?? 'Erro desconhecido' },
      }).catch(() => null)

      const clip = await prisma.videoClip.findUnique({ where: { id: clipId } })
      if (clip) await sendClipErrorEmail(userId, clip.name).catch(() => null)

      throw err
    } finally {
      // Limpar arquivos temporários
      for (const f of [outputTmp, thumbTmp]) {
        await fs.unlink(f).catch(() => null)
      }
    }
  }
)
