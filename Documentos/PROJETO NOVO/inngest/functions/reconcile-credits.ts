import { inngest } from '@/inngest/client'
import { reconcileCredits } from '@/app/uploads/uploads.service'

// Safety net para casos onde transcript/completed é disparado fora do fluxo normal (ex: reprocessamento manual).
export const reconcileCreditsFunction = inngest.createFunction(
  {
    id: 'reconcile-credits-safety-net',
    triggers: [{ event: 'credits/reconcile' }],
  },
  async ({ event }: { event: any }) => {
    const { jobId, actualMinutes } = event.data
    await reconcileCredits(jobId, actualMinutes)
  }
)
