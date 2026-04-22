'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { estimateCredits, InsufficientBalanceError } from './uploads.service'
import { createTransaction } from '@/app/billing/billing.service'
import { inngest } from '@/inngest/client'
import {
  MIME_TYPES_ACEITOS,
  LIMITE_TAMANHO_BYTES,
  LIMITE_DURACAO_SEGUNDOS,
  MAX_ARQUIVOS_SIMULTANEOS,
  TTL_PRESIGNED_URL_MINUTOS,
  StatusProcessamento,
  EtapaProcessamento,
  StatusReserva,
  TipoTransacao,
} from '@/lib/enums'

type FileRequest = {
  fileName: string
  fileSizeBytes: number
  mimeType: string
  durationSeconds: number
}

export async function requestPresignedUrl(files: FileRequest[], promptId?: string) {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'UNAUTHORIZED', message: 'Não autenticada' }

  if (files.length < 1 || files.length > MAX_ARQUIVOS_SIMULTANEOS) {
    return { error: 'VALIDATION_ERROR', message: `Entre 1 e ${MAX_ARQUIVOS_SIMULTANEOS} arquivos` }
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!MIME_TYPES_ACEITOS.includes(f.mimeType)) {
      return { error: 'VALIDATION_ERROR', message: `Formato não suportado: ${f.mimeType}` }
    }
    if (f.fileSizeBytes > LIMITE_TAMANHO_BYTES) {
      return { error: 'VALIDATION_ERROR', message: 'Arquivo excede o limite de 2 GB' }
    }
    if (f.durationSeconds <= 0 || f.durationSeconds > LIMITE_DURACAO_SEGUNDOS) {
      return { error: 'VALIDATION_ERROR', message: 'Duração inválida (máx. 4 horas)' }
    }
  }

  const filesWithMinutes = files.map((f) => ({
    ...f,
    estimatedMinutes: estimateCredits(f.durationSeconds),
  }))
  const totalMinutes = filesWithMinutes.reduce((s, f) => s + f.estimatedMinutes, 0)
  const expiresAt = new Date(Date.now() + TTL_PRESIGNED_URL_MINUTOS * 60 * 1000)

  try {
    const createdJobs = await prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })
      const saldoDisponivel = wallet.saldoTotal - wallet.saldoBloqueado
      if (saldoDisponivel < totalMinutes) throw new InsufficientBalanceError(saldoDisponivel, totalMinutes)

      const updatedWallet = await tx.wallet.update({ where: { userId }, data: { saldoBloqueado: { increment: totalMinutes } } })

      const jobs = []
      let runningBalance = updatedWallet.saldoTotal - updatedWallet.saldoBloqueado
      for (const f of filesWithMinutes) {
        const storagePath = `${userId}/${Date.now()}-${f.fileName}`
        const job = await tx.processingJob.create({
          data: {
            userId, fileName: f.fileName, storagePath,
            fileSizeBytes: f.fileSizeBytes, mimeType: f.mimeType,
            estimatedMinutes: f.estimatedMinutes, blockedMinutes: f.estimatedMinutes,
            promptId: promptId ?? null,
            status: StatusProcessamento.PENDING, currentStage: EtapaProcessamento.UPLOADING,
          },
        })
        await tx.fileUpload.create({
          data: {
            userId, jobId: job.id, fileName: f.fileName,
            fileSizeBytes: f.fileSizeBytes, mimeType: f.mimeType,
            storagePath, presignedUrlExpiresAt: expiresAt,
          },
        })
        await tx.creditReservation.create({
          data: { userId, jobId: job.id, reservedMinutes: f.estimatedMinutes, status: StatusReserva.ACTIVE },
        })
        await createTransaction(
          tx, userId, TipoTransacao.BLOQUEIO,
          -f.estimatedMinutes, 'ProcessingJob', job.id,
          runningBalance, `Bloqueio: ${f.fileName}`
        )
        jobs.push({ jobId: job.id, storagePath, estimatedMinutes: f.estimatedMinutes })
      }
      return jobs
    })

    const { IS_LOCAL_STORAGE, localStorageUrl } = await import('@/lib/storage')

    const presignedJobs = await Promise.all(
      createdJobs.map(async ({ jobId, storagePath, estimatedMinutes }: any) => {
        let uploadUrl: string
        if (IS_LOCAL_STORAGE) {
          uploadUrl = localStorageUrl(storagePath)
        } else {
          const { createSupabaseServiceClient } = await import('@/lib/supabase/server')
          const supabase = createSupabaseServiceClient()
          const { data, error } = await supabase.storage
            .from('transcribeadv-uploads')
            .createSignedUploadUrl(storagePath)
          if (error || !data) throw new Error(`Erro ao gerar presigned URL: ${error?.message}`)
          uploadUrl = data.signedUrl
        }
        return { jobId, uploadUrl, storagePath, expiresAt: expiresAt.toISOString(), estimatedMinutes }
      })
    )

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } })
    return {
      jobs: presignedJobs,
      walletSnapshot: {
        saldoDisponivel: wallet.saldoTotal - wallet.saldoBloqueado,
        saldoBloqueado: wallet.saldoBloqueado,
      },
    }
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      const wallet = await prisma.wallet.findUnique({ where: { userId } })
      const saldoDisponivel = (wallet?.saldoTotal ?? 0) - (wallet?.saldoBloqueado ?? 0)
      return {
        error: 'INSUFFICIENT_BALANCE',
        message: 'Saldo insuficiente para processar os arquivos selecionados',
        detail: { saldoDisponivel, estimatedTotal: totalMinutes, deficit: totalMinutes - saldoDisponivel },
      }
    }
    throw err
  }
}

export async function confirmUpload(jobId: string) {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'UNAUTHORIZED' }

  const fileUpload = await prisma.fileUpload.findFirst({
    where: { jobId, userId },
    include: { job: true },
  })
  if (!fileUpload) return { error: 'JOB_NOT_FOUND', message: 'Job não encontrado' }
  if (fileUpload.uploadConfirmedAt) return { jobId, status: 'QUEUED', message: 'Já confirmado' }

  await prisma.fileUpload.update({ where: { id: fileUpload.id }, data: { uploadConfirmedAt: new Date() } })
  await prisma.processingJob.update({ where: { id: jobId }, data: { currentStage: EtapaProcessamento.QUEUED } })

  try {
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
  } catch (err) {
    // Inngest dev server offline — job stays QUEUED; will be picked up when server restarts
    console.warn('[confirmUpload] inngest.send falhou (dev server offline?):', err)
  }

  return { jobId, status: 'QUEUED', message: 'Processamento iniciado' }
}

export async function getJobStatuses(jobIds: string[]) {
  const userId = await getAuthUserId()
  if (!userId) return []
  const jobs = await prisma.processingJob.findMany({
    where: { id: { in: jobIds }, userId },
    select: { id: true, currentStage: true, errorMessage: true },
  })
  return jobs.map((j: any) => ({ jobId: j.id, currentStage: j.currentStage, errorMessage: j.errorMessage }))
}

export async function cancelJob(jobId: string) {
  const userId = await getAuthUserId()
  if (!userId) return { error: 'UNAUTHORIZED' }
  await prisma.processingJob.update({
    where: { id: jobId, userId },
    data: { status: StatusProcessamento.FAILED },
  })
  return { ok: true }
}
