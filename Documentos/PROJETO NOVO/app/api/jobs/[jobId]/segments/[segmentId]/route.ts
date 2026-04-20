import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; segmentId: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { jobId, segmentId } = await params

  const job = await prisma.processingJob.findFirst({ where: { id: jobId, userId } })
  if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 })

  const segment = await prisma.transcriptSegment.findFirst({ where: { id: segmentId, jobId } })
  if (!segment) return NextResponse.json({ error: 'SEGMENT_NOT_FOUND' }, { status: 404 })

  const body = await req.json()
  const editedText = String(body.editedText ?? '').trim()
  if (!editedText) return NextResponse.json({ error: 'INVALID_TEXT' }, { status: 400 })

  const now = new Date()
  await prisma.transcriptSegment.update({
    where: { id: segmentId },
    data: { editedText, lastEditedAt: now },
  })

  return NextResponse.json({ segmentId, editedText, lastEditedAt: now.toISOString() })
}
