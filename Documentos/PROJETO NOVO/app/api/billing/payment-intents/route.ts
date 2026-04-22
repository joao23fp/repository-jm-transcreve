import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, isValidPlanId } from '@/app/billing/billing.service'
import { StatusPagamento } from '@/lib/enums'

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { planId } = body

  if (!planId || !isValidPlanId(planId)) {
    return NextResponse.json({ error: 'INVALID_PLAN', message: 'planId inválido' }, { status: 400 })
  }

  // Check for existing PENDING intent
  const existing = await prisma.paymentIntent.findFirst({
    where: { userId, status: StatusPagamento.PENDING },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return NextResponse.json(
      {
        error: 'PENDING_INTENT_EXISTS',
        paymentIntentId: existing.id,
        checkoutUrl: existing.checkoutUrl,
        expiresAt: existing.expiresAt.toISOString(),
        planLabel: existing.planLabel,
      },
      { status: 409 }
    )
  }

  const result = await createPaymentIntent(userId, planId)
  return NextResponse.json(result, { status: 201 })
}
