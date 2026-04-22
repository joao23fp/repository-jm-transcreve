import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { prisma } from '@/lib/prisma'
import { inngest } from '@/inngest/client'
import { EtapaProcessamento, StatusProcessamento } from '@/lib/enums'

// POST /api/uploads/retry?jobId=xxx  — re-fires upload/confirmed for a stuck QUEUED job
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const upload = await prisma.fileUpload.findFirst({
    where: { jobId, userId },
    include: { job: true },
  })

  if (!upload) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (upload.job.currentStage !== EtapaProcessamento.QUEUED) {
    return NextResponse.json({ error: 'NOT_QUEUED', stage: upload.job.currentStage }, { status: 409 })
  }

  await inngest.send({
    name: 'upload/confirmed',
    data: {
      jobId,
      userId,
      storageUrl: upload.storagePath,
      estimatedMinutes: upload.job.estimatedMinutes,
      promptId: upload.job.promptId,
      mimeType: upload.mimeType,
      fileName: upload.fileName,
    },
  })

  await prisma.processingJob.update({
    where: { id: jobId },
    data: { currentStage: EtapaProcessamento.TRANSCRIBING },
  })

  return NextResponse.json({ ok: true, jobId, message: 'Reprocessamento iniciado' })
}
