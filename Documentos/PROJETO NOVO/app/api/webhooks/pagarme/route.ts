import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { confirmPayment, expireIntent } from '@/app/billing/billing.service'
import { StatusPagamento } from '@/lib/enums'
import { logLgpdAccess } from '@/lib/lgpd-logger'

const OK = NextResponse.json({ received: true })

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-pagarme-signature') ?? ''
  const secret = process.env.PAGARME_WEBHOOK_SECRET ?? ''

  // In local dev (no real secret), skip HMAC validation on stub events
  const isStubMode = !secret || secret.includes('[YOUR-')
  if (!isStubMode && !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType: string = payload.type ?? ''
  const orderId: string = payload.data?.id ?? ''
  if (!orderId) return OK

  const intent = await prisma.paymentIntent.findUnique({ where: { id: orderId } })
  if (!intent) return OK

  // Idempotency: already processed
  if (intent.webhookReceivedAt) return OK

  if (eventType === 'order.paid') {
    await confirmPayment(orderId)
    logLgpdAccess({ userId: intent.userId, action: 'UPDATE', resourceType: 'PaymentIntent', resourceId: orderId }).catch(() => null)
  } else if (eventType === 'order.payment_failed' || eventType === 'order.canceled') {
    const updated = await prisma.paymentIntent.update({
      where: { id: orderId },
      data: {
        status: StatusPagamento.FAILED,
        webhookReceivedAt: new Date(),
        webhookAttempts: { increment: 1 },
      },
    })

    // Escalate after 3 failed attempts
    if (updated.webhookAttempts >= 3 && updated.status !== StatusPagamento.SUCCEEDED) {
      await prisma.webhookAlert.create({
        data: { paymentIntentId: orderId, userId: intent.userId },
      })
    }
  }

  return OK
}

// Stub endpoint for local testing — simulate order.paid
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const intent = await prisma.paymentIntent.findUnique({ where: { id: orderId } })
  if (!intent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (intent.webhookReceivedAt) return NextResponse.json({ message: 'Already processed' })

  await confirmPayment(orderId)
  return NextResponse.json({ message: 'Payment confirmed (stub)', orderId })
}
