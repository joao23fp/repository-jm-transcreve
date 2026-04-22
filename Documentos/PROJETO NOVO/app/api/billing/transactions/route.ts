import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  const items = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      amountMinutes: true,
      balanceAfter: true,
      description: true,
      createdAt: true,
    },
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  })
}
