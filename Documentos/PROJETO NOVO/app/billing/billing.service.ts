import { prisma } from '@/lib/prisma'
import { TipoTransacao, StatusPagamento } from '@/lib/enums'
import type { Prisma } from '@prisma/client'

const PLANS = {
  plan_99:  { minutes: 99,  amountCents: 4990,  label: '99 minutos' },
  plan_199: { minutes: 199, amountCents: 8990,  label: '199 minutos' },
  plan_499: { minutes: 499, amountCents: 18990, label: '499 minutos' },
} as const

export type PlanId = keyof typeof PLANS

export function isValidPlanId(id: string): id is PlanId {
  return id in PLANS
}

export async function getWalletWithStats(userId: string) {
  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { userId } }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: [TipoTransacao.CONSUMO, TipoTransacao.COMPRA] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true, amountMinutes: true, type: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Build daily usage array for last 30 days
  const usageMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    usageMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const t of transactions) {
    const date = t.createdAt.toISOString().slice(0, 10)
    if (t.type === TipoTransacao.CONSUMO && usageMap.has(date)) {
      usageMap.set(date, (usageMap.get(date) ?? 0) + Math.abs(t.amountMinutes))
    }
  }
  const usageLast30Days = Array.from(usageMap.entries()).map(([date, minutesConsumed]) => ({
    date,
    minutesConsumed,
  }))

  const pendingPaymentIntent = await prisma.paymentIntent.findFirst({
    where: { userId, status: StatusPagamento.PENDING },
    select: { id: true, planLabel: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return {
    saldoTotal: wallet.saldoTotal,
    saldoBloqueado: wallet.saldoBloqueado,
    saldoDisponivel: wallet.saldoTotal - wallet.saldoBloqueado,
    usageLast30Days,
    pendingPaymentIntent,
  }
}

export async function createPaymentIntent(userId: string, planId: PlanId) {
  const plan = PLANS[planId]

  const apiKey = process.env.PAGARME_API_KEY
  if (!apiKey || apiKey.includes('[YOUR-')) {
    // Sandbox stub for local dev
    const stubId = `or_test_${Date.now()}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.paymentIntent.create({
      data: {
        id: stubId,
        userId,
        amountCents: plan.amountCents,
        minutesGranted: plan.minutes,
        planLabel: plan.label,
        checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=${stubId}&stub=1`,
        expiresAt,
      },
    })
    return {
      paymentIntentId: stubId,
      checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=${stubId}&stub=1`,
      expiresAt: expiresAt.toISOString(),
    }
  }

  // Pagar.me Orders API
  const response = await fetch('https://api.pagar.me/core/v5/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ amount: plan.amountCents, description: plan.label, quantity: 1 }],
      customer: { type: 'individual' },
      payments: [{ payment_method: 'checkout', checkout: { accepted_payment_methods: ['credit_card', 'pix', 'boleto'] } }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Pagar.me error: ${err}`)
  }

  const order = await response.json()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.paymentIntent.create({
    data: {
      id: order.id,
      userId,
      amountCents: plan.amountCents,
      minutesGranted: plan.minutes,
      planLabel: plan.label,
      checkoutUrl: order.checkouts?.[0]?.payment_url ?? '',
      expiresAt,
    },
  })

  return {
    paymentIntentId: order.id,
    checkoutUrl: order.checkouts?.[0]?.payment_url ?? '',
    expiresAt: expiresAt.toISOString(),
  }
}

export async function confirmPayment(paymentIntentId: string) {
  const intent = await prisma.paymentIntent.findUniqueOrThrow({ where: { id: paymentIntentId } })

  await prisma.$transaction(async (tx) => {
    await tx.paymentIntent.update({
      where: { id: paymentIntentId },
      data: { status: StatusPagamento.SUCCEEDED, webhookReceivedAt: new Date() },
    })

    const wallet = await tx.wallet.update({
      where: { userId: intent.userId },
      data: { saldoTotal: { increment: intent.minutesGranted } },
    })

    await createTransaction(tx, intent.userId, TipoTransacao.COMPRA, intent.minutesGranted, 'PaymentIntent', paymentIntentId, wallet.saldoTotal - wallet.saldoBloqueado, `Pacote ${intent.planLabel}`)
  })

  const { sendSuccessPaymentEmail } = await import('@/lib/email/upload-notifications')
  await sendSuccessPaymentEmail(intent.userId, intent.planLabel, intent.minutesGranted).catch(() => null)
}

export async function expireIntent(paymentIntentId: string) {
  await prisma.paymentIntent.update({
    where: { id: paymentIntentId },
    data: { status: StatusPagamento.EXPIRED },
  })
}

export async function createTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  type: TipoTransacao,
  amountMinutes: number,
  refType: string,
  refId: string,
  balanceAfter: number,
  description: string
) {
  return tx.transaction.create({
    data: { userId, type, amountMinutes, refType, refId, balanceAfter, description },
  })
}

export async function checkAndNotifyLowBalance(userId: string, saldoDisponivel: number, saldoTotal: number) {
  if (saldoTotal <= 0) return
  const pct = saldoDisponivel / saldoTotal

  const thresholds = pct <= 0.05 ? [5, 20] : pct <= 0.20 ? [20] : []
  if (!thresholds.length) return

  const { sendLowBalanceEmail } = await import('@/lib/email/upload-notifications')

  for (const threshold of thresholds) {
    // Spam guard: check if already notified in last 24h via Transaction description
    const recent = await prisma.transaction.findFirst({
      where: {
        userId,
        description: { contains: `Alerta saldo ${threshold}%` },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
    if (recent) continue
    await sendLowBalanceEmail(userId, threshold)
  }
}
