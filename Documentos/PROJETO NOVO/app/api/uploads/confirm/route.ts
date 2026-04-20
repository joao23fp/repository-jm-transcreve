import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { inngest } from '@/inngest/client'
import { getAuthUserId } from '@/lib/auth-local'
import { EtapaProcessamento } from '@/lib/enums'

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId obrigatório' }, { status: 400 })

  const fileUpload = await prisma.fileUpload.findFirst({
    where: { jobId, userId },
    include: { job: true },
  })

  if (!fileUpload) {
    return NextResponse.json(
      { error: 'JOB_NOT_FOUND', message: 'Job não encontrado ou não pertence à usuária autenticada' },
      { status: 404 }
    )
  }

  // Idempotência: se já confirmado, retornar 200 sem re-emitir evento
  if (fileUpload.uploadConfirmedAt) {
    return NextResponse.json({ jobId, status: 'QUEUED', message: 'Processamento já iniciado' })
  }

  await prisma.fileUpload.update({
    where: { id: fileUpload.id },
    data: { uploadConfirmedAt: new Date() },
  })

  await prisma.processingJob.update({
    where: { id: jobId },
    data: { currentStage: EtapaProcessamento.QUEUED },
  })

  await inngest.send({
    name: 'upload/confirmed',
    data: {
      jobId,
      userId,
      storageUrl: fileUpload.storagePath,
      estimatedMinutes: fileUpload.job.estimatedMinutes,
      promptId: fileUpload.job.promptId,
      mimeType: fileUpload.mimeType,
      fileName: fileUpload.fileName,
    },
  })

  return NextResponse.json({ jobId, status: 'QUEUED', message: 'Processamento iniciado' })
}
