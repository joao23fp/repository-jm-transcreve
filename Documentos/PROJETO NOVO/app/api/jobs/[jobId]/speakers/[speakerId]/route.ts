import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; speakerId: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { jobId, speakerId } = await params

  const job = await prisma.processingJob.findFirst({ where: { id: jobId, userId } })
  if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 })

  const body = await req.json()
  const displayName = String(body.displayName ?? '').trim().slice(0, 100)
  if (!displayName) return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })

  const speaker = await prisma.speakerProfile.findFirst({ where: { id: speakerId, jobId } })
  if (!speaker) return NextResponse.json({ error: 'SPEAKER_NOT_FOUND' }, { status: 404 })

  await prisma.speakerProfile.update({
    where: { id: speakerId },
    data: { displayName, isRenamed: true },
  })

  const affectedSegments = await prisma.transcriptSegment.count({
    where: { speakerId, jobId },
  })

  return NextResponse.json({ speakerId, displayName, affectedSegments })
}
