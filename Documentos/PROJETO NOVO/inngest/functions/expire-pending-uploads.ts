import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { StatusProcessamento, EtapaProcessamento, StatusReserva } from '@/lib/enums'

export const expirePendingUploads = inngest.createFunction(
  {
    id: 'expire-pending-uploads',
    triggers: [{ cron: '*/15 * * * *' }],
  },
  async ({ step }: { step: any }) => {
    const expired = await step.run('find-expired', async () => {
      return prisma.fileUpload.findMany({
        where: {
          presignedUrlExpiresAt: { lt: new Date() },
          uploadConfirmedAt: null,
          job: { status: StatusProcessamento.PENDING },
        },
        include: { job: true },
      })
    })

    if (!expired.length) return { expired: 0 }

    await step.run('expire-jobs', async () => {
      for (const upload of expired) {
        await prisma.$transaction([
          prisma.processingJob.update({
            where: { id: upload.jobId },
            data: {
              status: StatusProcessamento.FAILED,
              currentStage: EtapaProcessamento.FAILED,
              errorMessage: 'Upload não confirmado — presigned URL expirada',
              completedAt: new Date(),
            },
          }),
          prisma.wallet.update({
            where: { userId: upload.userId },
            data: { saldoBloqueado: { decrement: upload.job.blockedMinutes } },
          }),
          prisma.creditReservation.updateMany({
            where: { jobId: upload.jobId, status: StatusReserva.ACTIVE },
            data: { status: StatusReserva.REFUNDED, releasedAt: new Date() },
          }),
        ])

        console.log(`[expire-pending-uploads] job ${upload.jobId} expirado — créditos estornados`)
      }
    })

    return { expired: expired.length }
  }
)
