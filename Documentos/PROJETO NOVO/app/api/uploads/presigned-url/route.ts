import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { prisma } from '@/lib/prisma'
import { estimateCredits, InsufficientBalanceError } from '@/app/uploads/uploads.service'
import {
  MIME_TYPES_ACEITOS,
  LIMITE_TAMANHO_BYTES,
  LIMITE_DURACAO_SEGUNDOS,
  MAX_ARQUIVOS_SIMULTANEOS,
  TTL_PRESIGNED_URL_MINUTOS,
  StatusProcessamento,
  EtapaProcessamento,
  StatusReserva,
} from '@/lib/enums'

type FileInput = {
  fileName: string
  fileSizeBytes: number
  mimeType: string
  durationSeconds: number
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const files: FileInput[] = body.files ?? []
  const promptId: string | null = body.promptId ?? null

  if (files.length < 1 || files.length > MAX_ARQUIVOS_SIMULTANEOS) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: `Entre 1 e ${MAX_ARQUIVOS_SIMULTANEOS} arquivos`, field: 'files' },
      { status: 400 }
    )
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (!MIME_TYPES_ACEITOS.includes(f.mimeType)) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: `Formato não suportado: ${f.mimeType}`, field: `files[${i}].mimeType` },
        { status: 400 }
      )
    }
    if (f.fileSizeBytes > LIMITE_TAMANHO_BYTES) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Arquivo excede o limite de 2 GB', field: `files[${i}].fileSizeBytes` },
        { status: 400 }
      )
    }
    if (f.durationSeconds <= 0 || f.durationSeconds > LIMITE_DURACAO_SEGUNDOS) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Duração inválida (máx. 4 horas)', field: `files[${i}].durationSeconds` },
        { status: 400 }
      )
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

      if (saldoDisponivel < totalMinutes) {
        throw new InsufficientBalanceError(saldoDisponivel, totalMinutes)
      }

      await tx.wallet.update({
        where: { userId },
        data: { saldoBloqueado: { increment: totalMinutes } },
      })

      const jobs = []
      for (const f of filesWithMinutes) {
        const storagePath = `${userId}/${Date.now()}-${f.fileName}`

        const job = await tx.processingJob.create({
          data: {
            userId,
            fileName: f.fileName,
            storagePath,
            fileSizeBytes: f.fileSizeBytes,
            mimeType: f.mimeType,
            estimatedMinutes: f.estimatedMinutes,
            blockedMinutes: f.estimatedMinutes,
            promptId,
            status: StatusProcessamento.PENDING,
            currentStage: EtapaProcessamento.UPLOADING,
          },
        })

        await tx.fileUpload.create({
          data: {
            userId,
            jobId: job.id,
            fileName: f.fileName,
            fileSizeBytes: f.fileSizeBytes,
            mimeType: f.mimeType,
            storagePath,
            presignedUrlExpiresAt: expiresAt,
          },
        })

        await tx.creditReservation.create({
          data: {
            userId,
            jobId: job.id,
            reservedMinutes: f.estimatedMinutes,
            status: StatusReserva.ACTIVE,
          },
        })

        jobs.push({ jobId: job.id, storagePath, estimatedMinutes: f.estimatedMinutes })
      }

      return jobs
    })

    const { IS_LOCAL_STORAGE, localStorageUrl } = await import('@/lib/storage')

    const presignedJobs = await Promise.all(
      createdJobs.map(async ({ jobId, storagePath, estimatedMinutes }: { jobId: string; storagePath: string; estimatedMinutes: number }) => {
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

    return NextResponse.json({
      jobs: presignedJobs,
      walletSnapshot: {
        saldoDisponivel: wallet.saldoTotal - wallet.saldoBloqueado,
        saldoBloqueado: wallet.saldoBloqueado,
      },
    })
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      const wallet = await prisma.wallet.findUnique({ where: { userId } })
      const saldoDisponivel = (wallet?.saldoTotal ?? 0) - (wallet?.saldoBloqueado ?? 0)
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_BALANCE',
          message: 'Saldo insuficiente para processar os arquivos selecionados',
          detail: { saldoDisponivel, estimatedTotal: totalMinutes, deficit: totalMinutes - saldoDisponivel },
        },
        { status: 422 }
      )
    }
    throw err
  }
}
