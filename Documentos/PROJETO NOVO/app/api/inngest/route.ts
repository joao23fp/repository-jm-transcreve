import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { processTranscription } from '@/inngest/functions/process-transcription'
import { processAiAnalysis } from '@/inngest/functions/process-ai-analysis'
import { reconcileCreditsFunction } from '@/inngest/functions/reconcile-credits'
import { expirePendingUploads } from '@/inngest/functions/expire-pending-uploads'
import { expirePaymentIntents } from '@/inngest/functions/expire-payment-intents'
import { requeueStuckJobs } from '@/inngest/functions/requeue-stuck-jobs'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTranscription,
    processAiAnalysis,
    reconcileCreditsFunction,
    expirePendingUploads,
    expirePaymentIntents,
    requeueStuckJobs,
  ],
})
