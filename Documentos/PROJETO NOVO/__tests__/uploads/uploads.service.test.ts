import { describe, it, expect, vi, beforeEach } from 'vitest'
import { estimateCredits, InsufficientBalanceError } from '@/app/uploads/uploads.service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    wallet: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    creditReservation: {
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    processingJob: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { checkBalance, blockCredits, refundCredits, reconcileCredits } from '@/app/uploads/uploads.service'
import { StatusReserva, StatusProcessamento, EtapaProcessamento } from '@/lib/enums'

const mockPrisma = prisma as any

describe('estimateCredits', () => {
  it('rounds up to nearest minute', () => {
    expect(estimateCredits(60)).toBe(1)
    expect(estimateCredits(61)).toBe(2)
    expect(estimateCredits(120)).toBe(2)
    expect(estimateCredits(1)).toBe(1)
  })

  it('handles zero duration', () => {
    expect(estimateCredits(0)).toBe(0)
  })
})

describe('checkBalance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns sufficient=true when balance covers request', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({
      saldoTotal: 100,
      saldoBloqueado: 20,
    })
    const result = await checkBalance('user-1', 30)
    expect(result.sufficient).toBe(true)
    expect(result.saldoDisponivel).toBe(80)
    expect(result.saldoBloqueado).toBe(20)
  })

  it('returns sufficient=false when balance is short', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({
      saldoTotal: 10,
      saldoBloqueado: 8,
    })
    const result = await checkBalance('user-1', 5)
    expect(result.sufficient).toBe(false)
    expect(result.saldoDisponivel).toBe(2)
  })

  it('throws when wallet not found', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue(null)
    await expect(checkBalance('user-1', 10)).rejects.toThrow('Wallet não encontrada')
  })
})

describe('blockCredits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks credits when sufficient balance', async () => {
    const tx = {
      wallet: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ saldoTotal: 100, saldoBloqueado: 10 }),
        update: vi.fn().mockResolvedValue({}),
      },
      creditReservation: { create: vi.fn().mockResolvedValue({}) },
    } as any

    await blockCredits(tx, 'user-1', 'job-1', 30)
    expect(tx.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { saldoBloqueado: { increment: 30 } } })
    )
    expect(tx.creditReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reservedMinutes: 30 }) })
    )
  })

  it('throws InsufficientBalanceError when balance is short', async () => {
    const tx = {
      wallet: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ saldoTotal: 10, saldoBloqueado: 8 }),
        update: vi.fn(),
      },
      creditReservation: { create: vi.fn() },
    } as any

    await expect(blockCredits(tx, 'user-1', 'job-1', 5)).rejects.toThrow(InsufficientBalanceError)
  })
})

describe('refundCredits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refunds active reservation', async () => {
    mockPrisma.creditReservation.findUniqueOrThrow.mockResolvedValue({
      jobId: 'job-1',
      userId: 'user-1',
      reservedMinutes: 10,
      status: StatusReserva.ACTIVE,
    })
    mockPrisma.$transaction.mockResolvedValue([])

    const refunded = await refundCredits('job-1', 'FAILURE')
    expect(refunded).toBe(10)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('skips non-active reservations', async () => {
    mockPrisma.creditReservation.findUniqueOrThrow.mockResolvedValue({
      jobId: 'job-1',
      userId: 'user-1',
      reservedMinutes: 10,
      status: StatusReserva.REFUNDED,
    })

    const refunded = await refundCredits('job-1', 'FAILURE')
    expect(refunded).toBe(0)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('reconcileCredits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('releases reservation and marks job completed', async () => {
    mockPrisma.creditReservation.findUniqueOrThrow.mockResolvedValue({
      jobId: 'job-1',
      userId: 'user-1',
      reservedMinutes: 15,
      status: StatusReserva.ACTIVE,
    })
    mockPrisma.$transaction.mockResolvedValue([])

    await reconcileCredits('job-1', 12)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('is idempotent for non-active reservations', async () => {
    mockPrisma.creditReservation.findUniqueOrThrow.mockResolvedValue({
      jobId: 'job-1',
      userId: 'user-1',
      reservedMinutes: 15,
      status: StatusReserva.RELEASED,
    })

    await reconcileCredits('job-1', 12)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('InsufficientBalanceError', () => {
  it('carries saldoDisponivel and required fields', () => {
    const err = new InsufficientBalanceError(5, 20)
    expect(err.saldoDisponivel).toBe(5)
    expect(err.required).toBe(20)
    expect(err.name).toBe('InsufficientBalanceError')
    expect(err instanceof Error).toBe(true)
  })
})
