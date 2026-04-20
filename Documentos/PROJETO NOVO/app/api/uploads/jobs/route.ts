import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { StatusProcessamento } from '@/lib/enums'

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') as StatusProcessamento | null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const cursor = searchParams.get('cursor')

  const jobs = await prisma.processingJob.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      status: true,
      currentStage: true,
      estimatedMinutes: true,
      actualMinutesConsumed: true,
      createdAt: true,
      completedAt: true,
      errorMessage: true,
    },
  })

  const hasMore = jobs.length > limit
  const items = hasMore ? jobs.slice(0, -1) : jobs

  return NextResponse.json({
    jobs: items.map((j: any) => ({ ...j, jobId: j.id })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}
