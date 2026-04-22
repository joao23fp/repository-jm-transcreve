import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { StatusPagamento } from '@/lib/enums'

export const expirePaymentIntents = inngest.createFunction(
  {
    id: 'expire-payment-intents',
    triggers: [{ cron: '0 * * * *' }],
  },
  async ({ step }: { step: any }) => {
    const expired = await step.run('find-expired-intents', async () => {
      return prisma.paymentIntent.findMany({
        where: {
          status: StatusPagamento.PENDING,
          expiresAt: { lt: new Date() },
        },
        select: { id: true, userId: true },
      })
    })

    if (!expired.length) return { expired: 0 }

    await step.run('mark-expired', async () => {
      await prisma.paymentIntent.updateMany({
        where: {
          id: { in: expired.map((p: { id: string }) => p.id) },
          status: StatusPagamento.PENDING,
        },
        data: { status: StatusPagamento.EXPIRED },
      })
    })

    return { expired: expired.length }
  }
)
