import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { StatusClipe, FormatoExport } from '@/lib/enums'
import { generatePdf, generateWord } from '@/lib/export-generators'
import { IS_LOCAL_STORAGE, localStorageSave } from '@/lib/storage'

export const exportClipDocument = inngest.createFunction(
  { id: 'export-clip-document', retries: 2, triggers: [{ event: 'clip/export.requested' }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { exportJobId, clipId, userId, format, clipStoragePath, clipName, startMs, endMs, transcriptText } = event.data

    await step.run('mark-processing', async () => {
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: StatusClipe.PROCESSING },
      })
    })

    try {
      const fileStoragePath = await step.run('generate-file', async () => {
        if (format === FormatoExport.VIDEO) {
          // Para vídeo, apenas retorna o path já existente (presigned URL gerada no download)
          return clipStoragePath
        }

        const ext = format === FormatoExport.PDF ? 'pdf' : 'docx'
        const storagePath = `exports/${userId}/${exportJobId}.${ext}`

        let buffer: Buffer
        if (format === FormatoExport.PDF) {
          buffer = await generatePdf(clipName, startMs, endMs, transcriptText)
        } else {
          buffer = await generateWord(clipName, startMs, endMs, transcriptText)
        }

        if (IS_LOCAL_STORAGE) {
          await localStorageSave(storagePath, buffer)
        } else {
          const { createSupabaseServiceClient } = await import('@/lib/supabase/server')
          const supabase = createSupabaseServiceClient()
          const contentType = format === FormatoExport.PDF
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          await supabase.storage.from('transcribeadv-uploads').upload(storagePath, buffer, { contentType, upsert: true })
        }

        return storagePath
      })

      await step.run('update-status', async () => {
        await prisma.exportJob.update({
          where: { id: exportJobId },
          data: {
            status: StatusClipe.COMPLETED,
            fileStoragePath,
            completedAt: new Date(),
          },
        })
      })

    } catch (err: any) {
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: StatusClipe.FAILED, errorMessage: err?.message ?? 'Erro desconhecido' },
      }).catch(() => null)
      throw err
    }
  }
)
