import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    wallet: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    paymentIntent: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/email/upload-notifications', () => ({
  sendSuccessPaymentEmail: vi.fn().mockResolvedValue(undefined),
  sendLowBalanceEmail: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'
import {
  isValidPlanId,
  getWalletWithStats,
  confirmPayment,
  expireIntent,
  createTransaction,
  checkAndNotifyLowBalance,
} from '@/app/billing/billing.service'
import { TipoTransacao, StatusPagamento } from '@/lib/enums'

const mockPrisma = prisma as any

describe('isValidPlanId', () => {
  it('accepts valid plan IDs', () => {
    expect(isValidPlanId('plan_99')).toBe(true)
    expect(isValidPlanId('plan_199')).toBe(true)
    expect(isValidPlanId('plan_499')).toBe(true)
  })

  it('rejects invalid plan IDs', () => {
    expect(isValidPlanId('plan_1000')).toBe(false)
    expect(isValidPlanId('')).toBe(false)
    expect(isValidPlanId('free')).toBe(false)
  })
})

describe('getWalletWithStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns wallet stats with empty usage when no transactions', async () => {
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({
      saldoTotal: 100,
      saldoBloqueado: 20,
    })
    mockPrisma.transaction.findMany.mockResolvedValue([])
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)

    const result = await getWalletWithStats('user-1')

    expect(result.saldoTotal).toBe(100)
    expect(result.saldoBloqueado).toBe(20)
    expect(result.saldoDisponivel).toBe(80)
    expect(result.usageLast30Days).toHaveLength(30)
    expect(result.pendingPaymentIntent).toBeNull()
  })

  it('accumulates CONSUMO transactions into daily usage', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({ saldoTotal: 200, saldoBloqueado: 0 })
    mockPrisma.transaction.findMany.mockResolvedValue([
      { createdAt: new Date(today), amountMinutes: -10, type: TipoTransacao.CONSUMO },
      { createdAt: new Date(today), amountMinutes: -5, type: TipoTransacao.CONSUMO },
    ])
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)

    const result = await getWalletWithStats('user-1')
    const todayEntry = result.usageLast30Days.find((d: any) => d.date === today)
    expect(todayEntry?.minutesConsumed).toBe(15)
  })

  it('ignores COMPRA transactions in daily usage chart', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({ saldoTotal: 200, saldoBloqueado: 0 })
    mockPrisma.transaction.findMany.mockResolvedValue([
      { createdAt: new Date(today), amountMinutes: 99, type: TipoTransacao.COMPRA },
    ])
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)

    const result = await getWalletWithStats('user-1')
    const todayEntry = result.usageLast30Days.find((d: any) => d.date === today)
    expect(todayEntry?.minutesConsumed).toBe(0)
  })

  it('includes pending payment intent when present', async () => {
    mockPrisma.wallet.findUniqueOrThrow.mockResolvedValue({ saldoTotal: 50, saldoBloqueado: 0 })
    mockPrisma.transaction.findMany.mockResolvedValue([])
    const fakeIntent = { id: 'or_test_1', planLabel: '99 minutos', createdAt: new Date(), expiresAt: new Date() }
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(fakeIntent)

    const result = await getWalletWithStats('user-1')
    expect(result.pendingPaymentIntent?.id).toBe('or_test_1')
  })
})

describe('confirmPayment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs prisma transaction to update intent and wallet', async () => {
    mockPrisma.paymentIntent.findUniqueOrThrow.mockResolvedValue({
      id: 'or_test_1',
      userId: 'user-1',
      minutesGranted: 99,
      planLabel: '99 minutos',
    })
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        paymentIntent: { update: vi.fn().mockResolvedValue({}) },
        wallet: { update: vi.fn().mockResolvedValue({ saldoTotal: 199, saldoBloqueado: 0 }) },
        transaction: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    await confirmPayment('or_test_1')

    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

describe('expireIntent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets status to EXPIRED', async () => {
    mockPrisma.paymentIntent.update.mockResolvedValue({})

    await expireIntent('or_test_1')

    expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
      where: { id: 'or_test_1' },
      data: { status: StatusPagamento.EXPIRED },
    })
  })
})

describe('createTransaction', () => {
  it('creates a transaction row via tx client', async () => {
    const tx = {
      transaction: { create: vi.fn().mockResolvedValue({ id: 'txn-1' }) },
    } as any

    await createTransaction(tx, 'user-1', TipoTransacao.COMPRA, 99, 'PaymentIntent', 'or_1', 199, 'Pacote 99 minutos')

    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: TipoTransacao.COMPRA,
        amountMinutes: 99,
        refType: 'PaymentIntent',
        refId: 'or_1',
        balanceAfter: 199,
        description: 'Pacote 99 minutos',
      },
    })
  })
})

describe('checkAndNotifyLowBalance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when balance is above 20%', async () => {
    const { sendLowBalanceEmail } = await import('@/lib/email/upload-notifications')
    await checkAndNotifyLowBalance('user-1', 90, 100)
    expect(sendLowBalanceEmail).not.toHaveBeenCalled()
  })

  it('sends 20% alert when balance is at 15%', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null)
    const { sendLowBalanceEmail } = await import('@/lib/email/upload-notifications')

    await checkAndNotifyLowBalance('user-1', 15, 100)
    expect(sendLowBalanceEmail).toHaveBeenCalledWith('user-1', 20)
  })

  it('sends both 5% and 20% alerts when balance is at 3%', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null)
    const { sendLowBalanceEmail } = await import('@/lib/email/upload-notifications')

    await checkAndNotifyLowBalance('user-1', 3, 100)
    expect(sendLowBalanceEmail).toHaveBeenCalledTimes(2)
    expect(sendLowBalanceEmail).toHaveBeenCalledWith('user-1', 5)
    expect(sendLowBalanceEmail).toHaveBeenCalledWith('user-1', 20)
  })

  it('skips alert when recent notification exists', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'txn-recent' })
    const { sendLowBalanceEmail } = await import('@/lib/email/upload-notifications')

    await checkAndNotifyLowBalance('user-1', 15, 100)
    expect(sendLowBalanceEmail).not.toHaveBeenCalled()
  })

  it('does nothing when saldoTotal is zero', async () => {
    const { sendLowBalanceEmail } = await import('@/lib/email/upload-notifications')
    await checkAndNotifyLowBalance('user-1', 0, 0)
    expect(sendLowBalanceEmail).not.toHaveBeenCalled()
  })
})
