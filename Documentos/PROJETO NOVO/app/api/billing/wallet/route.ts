import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { getWalletWithStats } from '@/app/billing/billing.service'
import { logLgpdAccess } from '@/lib/lgpd-logger'

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getWalletWithStats(userId)
    logLgpdAccess({ userId, action: 'ACCESS', resourceType: 'Wallet', resourceId: userId, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(data)
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    throw err
  }
}
