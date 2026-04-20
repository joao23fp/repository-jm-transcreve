import { prisma } from '@/lib/prisma'
import { StatusReserva, StatusProcessamento, EtapaProcessamento } from '@/lib/enums'

export function estimateCredits(durationSeconds: number): number {
  return Math.ceil(durationSeconds / 60)
}

export async function checkBalance(
  userId: string,
  requiredMinutes: number
): Promise<{ sufficient: boolean; saldoDisponivel: number; saldoBloqueado: number }> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } })
  if (!wallet) throw new Error(`Wallet não encontrada para userId: ${userId}`)
  const saldoDisponivel = wallet.saldoTotal - wallet.saldoBloqueado
  return {
    sufficient: saldoDisponivel >= requiredMinutes,
    saldoDisponivel,
    saldoBloqueado: wallet.saldoBloqueado,
  }
}

export async function blockCredits(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  jobId: string,
  minutes: number
): Promise<void> {
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })
  const saldoDisponivel = wallet.saldoTotal - wallet.saldoBloqueado
  if (saldoDisponivel < minutes) {
    throw new InsufficientBalanceError(saldoDisponivel, minutes)
  }
  await tx.wallet.update({
    where: { userId },
    data: { saldoBloqueado: { increment: minutes } },
  })
  await tx.creditReservation.create({
    data: { userId, jobId, reservedMinutes: minutes, status: StatusReserva.ACTIVE },
  })
}

export async function refundCredits(
  jobId: string,
  reason: 'FAILURE' | 'EXPIRED' | 'CANCELLED'
): Promise<number> {
  const reservation = await prisma.creditReservation.findUniqueOrThrow({
    where: { jobId },
    include: { job: true },
  })
  if (reservation.status !== StatusReserva.ACTIVE) return 0

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: reservation.userId },
      data: { saldoBloqueado: { decrement: reservation.reservedMinutes } },
    }),
    prisma.creditReservation.update({
      where: { jobId },
      data: { status: StatusReserva.REFUNDED, releasedAt: new Date() },
    }),
  ])
  return reservation.reservedMinutes
}

export async function reconcileCredits(
  jobId: string,
  actualMinutes: number
): Promise<void> {
  const reservation = await prisma.creditReservation.findUniqueOrThrow({
    where: { jobId },
  })
  if (reservation.status !== StatusReserva.ACTIVE) return

  const refundMinutes = Math.max(0, reservation.reservedMinutes - actualMinutes)

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId: reservation.userId },
      data: { saldoBloqueado: { decrement: reservation.reservedMinutes } },
    }),
    ...(refundMinutes > 0
      ? []
      : []),
    prisma.creditReservation.update({
      where: { jobId },
      data: { status: StatusReserva.RELEASED, releasedAt: new Date() },
    }),
    prisma.processingJob.update({
      where: { id: jobId },
      data: {
        actualMinutesConsumed: actualMinutes,
        status: StatusProcessamento.COMPLETED,
        currentStage: EtapaProcessamento.COMPLETED,
        completedAt: new Date(),
      },
    }),
  ])
}

export class InsufficientBalanceError extends Error {
  constructor(
    public readonly saldoDisponivel: number,
    public readonly required: number
  ) {
    super('Saldo insuficiente para processar os arquivos selecionados')
    this.name = 'InsufficientBalanceError'
  }
}
