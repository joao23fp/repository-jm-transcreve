import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { getWalletWithStats } from '@/app/billing/billing.service'

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getWalletWithStats(userId)
    return NextResponse.json(data)
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    throw err
  }
}
