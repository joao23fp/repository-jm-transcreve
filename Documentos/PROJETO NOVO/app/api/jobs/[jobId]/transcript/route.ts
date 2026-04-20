import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { localStorageUrl, IS_LOCAL_STORAGE } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { jobId } = await params

  const job = await prisma.processingJob.findFirst({
    where: { id: jobId, userId },
    include: {
      segments: { orderBy: { sequenceIndex: 'asc' }, include: { speaker: true } },
      speakers: { orderBy: { createdAt: 'asc' } },
      fileUpload: true,
    },
  })

  if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 })

  const videoUrl = job.fileUpload
    ? IS_LOCAL_STORAGE
      ? localStorageUrl(job.storagePath)
      : null
    : null

  return NextResponse.json({
    jobId: job.id,
    fileName: job.fileName,
    mimeType: job.mimeType,
    durationMs: job.fileUpload
      ? Math.round((job.actualMinutesConsumed ?? job.estimatedMinutes) * 60 * 1000)
      : 0,
    videoUrl,
    segments: job.segments.map((s) => ({
      id: s.id,
      sequenceIndex: s.sequenceIndex,
      startMs: s.startMs,
      endMs: s.endMs,
      speakerId: s.speakerId,
      speakerName: s.speaker?.displayName ?? null,
      text: s.editedText ?? s.originalText,
      lastEditedAt: s.lastEditedAt?.toISOString() ?? null,
      wordTimestamps: s.wordTimestamps as { word: string; startMs: number; endMs: number }[],
    })),
    speakers: job.speakers.map((sp) => ({
      id: sp.id,
      suggestedTag: sp.suggestedTag,
      displayName: sp.displayName,
      isRenamed: sp.isRenamed,
    })),
    transcriptText: job.transcriptText ?? null,
  })
}
