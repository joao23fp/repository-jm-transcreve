import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentIntent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    webhookAlert: {
      create: vi.fn(),
    },
  },
}))

// Mock billing service
vi.mock('@/app/billing/billing.service', () => ({
  confirmPayment: vi.fn().mockResolvedValue(undefined),
  expireIntent: vi.fn().mockResolvedValue(undefined),
  isValidPlanId: vi.fn().mockReturnValue(true),
  createPaymentIntent: vi.fn(),
}))

// Mock auth
vi.mock('@/lib/auth-local', () => ({
  getAuthUserId: vi.fn().mockResolvedValue('user-1'),
}))

// Mock LGPD logger
vi.mock('@/lib/lgpd-logger', () => ({
  logLgpdAccess: vi.fn().mockResolvedValue(undefined),
}))

// Mock inngest
vi.mock('@/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

import { prisma } from '@/lib/prisma'
import { StatusPagamento } from '@/lib/enums'

const mockPrisma = prisma as any

function makeSignature(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function callWebhook(body: string, signature: string, secret?: string) {
  process.env.PAGARME_WEBHOOK_SECRET = secret ?? 'test-secret'
  const { POST } = await import('@/app/api/webhooks/pagarme/route')
  const req = new Request('http://localhost/api/webhooks/pagarme', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pagarme-signature': signature,
    },
    body,
  }) as any
  return POST(req)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// ── 1. HMAC validation ────────────────────────────────────────────────────────

describe('HMAC webhook validation', () => {
  it('retorna 401 para assinatura inválida', async () => {
    process.env.PAGARME_WEBHOOK_SECRET = 'real-secret'
    const { POST } = await import('@/app/api/webhooks/pagarme/route')
    const body = JSON.stringify({ type: 'order.paid', data: { id: 'or_test' } })

    const req = new Request('http://localhost/api/webhooks/pagarme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pagarme-signature': 'assinatura-invalida',
      },
      body,
    }) as any

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('aceita requisição com assinatura HMAC válida', async () => {
    const secret = 'real-secret'
    process.env.PAGARME_WEBHOOK_SECRET = secret
    const { POST } = await import('@/app/api/webhooks/pagarme/route')

    const body = JSON.stringify({ type: 'order.paid', data: { id: 'or_test_valid' } })
    const sig = makeSignature(body, secret)

    mockPrisma.paymentIntent.findUnique.mockResolvedValue({
      id: 'or_test_valid',
      userId: 'user-1',
      webhookReceivedAt: null,
    })

    const req = new Request('http://localhost/api/webhooks/pagarme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pagarme-signature': sig,
      },
      body,
    }) as any

    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('verifySignature function — assinatura correta retorna true', () => {
    const secret = 'meu-secret'
    const body = 'payload de teste'
    const sig = makeSignature(body, secret)
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    expect(sig).toBe(expected)
  })
})

// ── 2. PaymentIntent duplicado → 409 ─────────────────────────────────────────

describe('POST /api/billing/payment-intents — idempotência', () => {
  it('retorna 409 quando já existe PaymentIntent PENDING para o userId', async () => {
    const existingIntent = {
      id: 'or_existing',
      checkoutUrl: 'https://checkout.pagar.me/test',
      expiresAt: new Date(Date.now() + 3600000),
      planLabel: '99 minutos',
    }
    mockPrisma.paymentIntent.findFirst = vi.fn().mockResolvedValue(existingIntent)

    const { POST } = await import('@/app/api/billing/payment-intents/route')
    const req = new Request('http://localhost/api/billing/payment-intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'plan_99' }),
    }) as any

    const res = await POST(req)
    expect(res.status).toBe(409)

    const data = await res.json()
    expect(data.error).toBe('PENDING_INTENT_EXISTS')
    expect(data.paymentIntentId).toBe('or_existing')
  })

  it('retorna 201 quando não há PaymentIntent PENDING', async () => {
    mockPrisma.paymentIntent.findFirst = vi.fn().mockResolvedValue(null)

    const { createPaymentIntent } = await import('@/app/billing/billing.service')
    ;(createPaymentIntent as any).mockResolvedValue({
      paymentIntentId: 'or_new',
      checkoutUrl: 'https://checkout.pagar.me/new',
      expiresAt: new Date().toISOString(),
    })

    const { POST } = await import('@/app/api/billing/payment-intents/route')
    const req = new Request('http://localhost/api/billing/payment-intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'plan_99' }),
    }) as any

    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
