import * as Sentry from '@sentry/nextjs'
import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { refundCredits, reconcileCredits } from '@/app/uploads/uploads.service'
import { EtapaProcessamento, StatusProcessamento } from '@/lib/enums'

export const processAiAnalysis = inngest.createFunction(
  {
    id: 'process-ai-analysis',
    retries: 3,
    triggers: [{ event: 'transcript/completed' }],
    onFailure: async ({ event, error }: { event: any; error: any }) => {
      const { jobId } = (event.data?.event?.data ?? {}) as { jobId: string }
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
      Sentry.captureException(error, { tags: { jobId, inngestFunction: 'process-ai-analysis' } })
      console.error(`[onFailure] AI analysis job ${jobId} falhou — créditos estornados`)
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, userId, transcriptText, actualDurationSeconds, promptId } = event.data

    const analysisResult = await step.run('analyze', async () => {
      let systemPrompt = 'Você é um assistente jurídico especializado em análise de audiências e reuniões.'

      if (promptId) {
        // Em produção: buscar prompt customizado do banco
        // const prompt = await prisma.contextPrompt.findUnique({ where: { id: promptId } })
        // systemPrompt = prompt?.content ?? systemPrompt
      }

      // Placeholder para integração LLM — substituir por chamada real
      return { summary: `Transcrição processada: ${transcriptText.slice(0, 100)}...` }
    })

    await step.run('save-result', async () => {
      const actualMinutes = Math.ceil(actualDurationSeconds / 60)
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { transcriptText },
      })
      await reconcileCredits(jobId, actualMinutes)
    })

    console.log(`[process-ai-analysis] job ${jobId} concluído`)
  }
)
