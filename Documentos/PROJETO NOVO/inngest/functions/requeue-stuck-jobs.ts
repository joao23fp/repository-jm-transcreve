import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { EtapaProcessamento, StatusProcessamento } from '@/lib/enums'

// Re-fires upload/confirmed for jobs stuck in QUEUED for more than 3 minutes.
// Handles the case where inngest.send() failed silently when Inngest was offline.
export const requeueStuckJobs = inngest.createFunction(
  {
    id: 'requeue-stuck-jobs',
    triggers: [{ cron: '*/5 * * * *' }],
  },
  async ({ step }: { step: any }) => {
    const cutoff = new Date(Date.now() - 3 * 60 * 1000)

    const stuck = await step.run('find-stuck', async () => {
      return prisma.fileUpload.findMany({
        where: {
          uploadConfirmedAt: { not: null, lt: cutoff },
          job: {
            currentStage: EtapaProcessamento.QUEUED,
            status: StatusProcessamento.PENDING,
          },
        },
        include: { job: true },
        take: 20,
      })
    })

    if (!stuck.length) return { requeued: 0 }

    await step.run('refire-events', async () => {
      for (const upload of stuck) {
        await inngest.send({
          name: 'upload/confirmed',
          data: {
            jobId: upload.jobId,
            userId: upload.userId,
            storageUrl: upload.storagePath,
            estimatedMinutes: upload.job.estimatedMinutes,
            promptId: upload.job.promptId,
            mimeType: upload.mimeType,
            fileName: upload.fileName,
          },
        })
        // Mark as TRANSCRIBING to avoid double-firing on next cron tick
        await prisma.processingJob.update({
          where: { id: upload.jobId },
          data: { currentStage: EtapaProcessamento.TRANSCRIBING },
        })
      }
    })

    return { requeued: stuck.length }
  }
)
