import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const intent = await prisma.paymentIntent.findUnique({ where: { id } })

  if (!intent || intent.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: intent.id,
    status: intent.status,
    minutesGranted: intent.minutesGranted,
    planLabel: intent.planLabel,
  })
}
