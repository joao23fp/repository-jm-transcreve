import * as Sentry from '@sentry/nextjs'
import { NonRetriableError } from 'inngest'
import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { refundCredits } from '@/app/uploads/uploads.service'
import { EtapaProcessamento, StatusProcessamento } from '@/lib/enums'
import Groq from 'groq-sdk'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, readFile, unlink } from 'fs/promises'

const execFileAsync = promisify(execFile)

async function extractAudioBuffer(inputBuffer: Buffer, inputExt: string): Promise<Buffer> {
  const tmpIn = join(tmpdir(), `ta-in-${Date.now()}.${inputExt}`)
  const tmpOut = join(tmpdir(), `ta-out-${Date.now()}.mp3`)
  try {
    await writeFile(tmpIn, inputBuffer)
    await execFileAsync('ffmpeg', ['-y', '-i', tmpIn, '-vn', '-ar', '16000', '-ac', '1', '-b:a', '32k', tmpOut])
    return await readFile(tmpOut)
  } finally {
    await unlink(tmpIn).catch(() => {})
    await unlink(tmpOut).catch(() => {})
  }
}

const GROQ_NO_RETRY_ERRORS = ['invalid_file', 'unsupported_format', 'file_too_large', 'invalid_request_error']

export const processTranscription = inngest.createFunction(
  {
    id: 'process-transcription',
    retries: 3,
    triggers: [{ event: 'upload/confirmed' }],
    onFailure: async ({ event, error }: { event: any; error: any }) => {
      const { jobId, userId } = (event.data?.event?.data ?? {}) as { jobId: string; userId: string }
      if (!jobId) return
      await refundCredits(jobId, 'FAILURE')
      await prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: StatusProcessamento.FAILED,
          currentStage: EtapaProcessamento.FAILED,
          errorMessage: error.message,
          completedAt: new Date(),
        },
      })
      Sentry.captureException(error, { tags: { jobId, inngestFunction: 'process-transcription' } })
      console.error(`[onFailure] job ${jobId} falhou após retries — créditos estornados`)
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, userId, storageUrl, estimatedMinutes, promptId, mimeType, fileName } = event.data

    await step.run('set-transcribing', async () => {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { status: StatusProcessamento.PROCESSING, currentStage: EtapaProcessamento.TRANSCRIBING },
      })
    })

    const transcript = await step.run('transcribe', async () => {
      const { IS_LOCAL_STORAGE, localStorageRead, localStorageUrl } = await import('@/lib/storage')

      let audioBuffer: ArrayBuffer
      if (IS_LOCAL_STORAGE) {
        const buf = await localStorageRead(storageUrl)
        audioBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
      } else {
        const { createSupabaseServiceClient } = await import('@/lib/supabase/server')
        const supabase = createSupabaseServiceClient()
        const { data, error } = await supabase.storage
          .from('transcribeadv-uploads')
          .createSignedUrl(storageUrl, 3600)
        if (error || !data) throw new Error(`Erro ao gerar URL para transcrição: ${error?.message}`)
        const res = await fetch(data.signedUrl)
        audioBuffer = await res.arrayBuffer()
      }

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
      const inputBuf = Buffer.from(audioBuffer)
      const ext = (fileName ?? 'audio.mp4').split('.').pop() ?? 'mp4'
      const audioBuf = await extractAudioBuffer(inputBuf, ext)
      const audioFile = new File([audioBuf], 'audio.mp3', { type: 'audio/mpeg' })

      try {
        const result = await groq.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-large-v3',
          response_format: 'verbose_json',
          timestamp_granularities: ['word', 'segment'],
        } as any)
        return {
          text: result.text,
          durationSeconds: (result as any).duration ?? estimatedMinutes * 60,
          segments: (result as any).segments ?? [],
          words: (result as any).words ?? [],
        }
      } catch (err: any) {
        const errorCode = err?.error?.code ?? err?.error?.type ?? err?.code ?? ''
        if (GROQ_NO_RETRY_ERRORS.some((c) => errorCode.includes(c))) {
          throw new NonRetriableError(`Arquivo inválido ou corrompido: ${err.message}`)
        }
        throw err
      }
    })

    await step.run('save-transcript-segments', async () => {
      const { segments, words } = transcript

      if (segments && segments.length > 0) {
        // Delete stale segments from a previous attempt
        await prisma.transcriptSegment.deleteMany({ where: { jobId } })
        await prisma.speakerProfile.deleteMany({ where: { jobId } })

        const speaker = await prisma.speakerProfile.create({
          data: { jobId, suggestedTag: 'Pessoa A', displayName: 'Pessoa A' },
        })

        await prisma.transcriptSegment.createMany({
          data: segments.map((seg: any, i: number) => {
            const startMs = Math.round(seg.start * 1000)
            const endMs = Math.round(seg.end * 1000)
            const segWords = (words as any[]).filter(
              (w: any) => w.start >= seg.start && w.start < seg.end
            )
            return {
              jobId,
              sequenceIndex: i,
              startMs,
              endMs,
              speakerId: speaker.id,
              originalText: seg.text.trim(),
              wordTimestamps: segWords.map((w: any) => ({
                word: w.word,
                startMs: Math.round(w.start * 1000),
                endMs: Math.round(w.end * 1000),
              })),
            }
          }),
        })
      }

      await prisma.processingJob.update({
        where: { id: jobId },
        data: { currentStage: EtapaProcessamento.ANALYZING },
      })
    })

    await step.run('emit-completed', async () => {
      await inngest.send({
        name: 'transcript/completed',
        data: {
          jobId,
          userId,
          transcriptText: transcript.text,
          actualDurationSeconds: transcript.durationSeconds,
          promptId,
        },
      })
    })
  }
)
