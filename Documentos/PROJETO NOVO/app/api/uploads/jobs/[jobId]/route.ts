import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { StatusProcessamento, StatusReserva } from '@/lib/enums'
import { refundCredits } from '@/app/uploads/uploads.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const job = await prisma.processingJob.findFirst({
    where: { id: jobId, userId },
    include: { fileUpload: true, creditReservation: true },
  })

  if (!job) {
    return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    jobId: job.id,
    fileName: job.fileName,
    fileSizeBytes: job.fileUpload?.fileSizeBytes ?? 0,
    durationSeconds: job.estimatedMinutes * 60,
    status: job.status,
    currentStage: job.currentStage,
    retryCount: job.retryCount,
    estimatedMinutes: job.estimatedMinutes,
    blockedMinutes: job.blockedMinutes,
    actualMinutesConsumed: job.actualMinutesConsumed,
    promptId: job.promptId,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jobId } = await params
  const job = await prisma.processingJob.findFirst({ where: { id: jobId, userId } })

  if (!job) {
    return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 })
  }

  if (job.status === StatusProcessamento.COMPLETED) {
    return NextResponse.json(
      { error: 'JOB_ALREADY_COMPLETED', message: 'Não é possível cancelar um job já concluído' },
      { status: 409 }
    )
  }

  const refundedMinutes = await refundCredits(jobId, 'CANCELLED')

  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      status: StatusProcessamento.FAILED,
      errorMessage: 'Cancelado pela usuária',
      completedAt: new Date(),
    },
  })

  return NextResponse.json({
    message: 'Job cancelado e créditos estornados',
    refundedMinutes,
  })
}
