import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { redirect, notFound } from 'next/navigation'
import { EtapaProcessamento } from '@/lib/enums'
import { IS_LOCAL_STORAGE, localStorageUrl } from '@/lib/storage'
import ViewerLayout from './ViewerLayout'

export default async function JobViewerPage({ params }: { params: Promise<{ jobId: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) redirect('/uploads')

  const { jobId } = await params

  const job = await prisma.processingJob.findFirst({
    where: { id: jobId, userId },
    include: {
      segments: { orderBy: { sequenceIndex: 'asc' }, include: { speaker: true } },
      speakers: { orderBy: { createdAt: 'asc' } },
      fileUpload: true,
    },
  })

  if (!job) notFound()

  const isAudio = /\.(mp3|wav|m4a|ogg)$/i.test(job.fileName)
  const videoUrl = job.fileUpload
    ? IS_LOCAL_STORAGE
      ? localStorageUrl(job.storagePath)
      : null
    : null

  const segments = job.segments.map((s) => ({
    id: s.id,
    sequenceIndex: s.sequenceIndex,
    startMs: s.startMs,
    endMs: s.endMs,
    speakerId: s.speakerId ?? null,
    speakerName: s.speaker?.displayName ?? null,
    text: s.editedText ?? s.originalText,
    lastEditedAt: s.lastEditedAt?.toISOString() ?? null,
    wordTimestamps: s.wordTimestamps as { word: string; startMs: number; endMs: number }[],
  }))

  const speakers = job.speakers.map((sp) => ({
    id: sp.id,
    suggestedTag: sp.suggestedTag,
    displayName: sp.displayName,
    isRenamed: sp.isRenamed,
  }))

  // Data de expiração do arquivo (7 dias após upload)
  const fileExpiresAt = job.fileUpload
    ? new Date(job.fileUpload.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null

  return (
    <ViewerLayout
      jobId={job.id}
      fileName={job.fileName}
      mimeType={job.mimeType}
      isAudio={isAudio}
      videoUrl={videoUrl}
      segments={segments}
      speakers={speakers}
      transcriptText={job.transcriptText ?? null}
      isCompleted={job.currentStage === EtapaProcessamento.COMPLETED}
      fileExpiresAt={fileExpiresAt}
    />
  )
}
