import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: { id: string }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Headers Svix ausentes' }, { status: 400 })
  }

  const payload = await req.text()
  const wh = new Webhook(webhookSecret)

  let event: ClerkUserCreatedEvent
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserCreatedEvent
  } catch {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    const userId = event.data.id
    await prisma.wallet.upsert({
      where: { userId },
      create: { userId, saldoTotal: 0, saldoBloqueado: 0 },
      update: {},
    })
  }

  return NextResponse.json({ received: true })
}
