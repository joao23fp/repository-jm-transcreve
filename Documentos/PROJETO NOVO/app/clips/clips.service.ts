import { prisma } from '@/lib/prisma'
import { inngest } from '@/inngest/client'
import { StatusClipe, FormatoExport } from '@/lib/enums'

const MIN_DURACAO_MS = 3000

export class ClipDuracaoError extends Error {
  constructor() { super('Seleção muito curta para gerar clipe (mínimo 3s)'); this.name = 'ClipDuracaoError' }
}
export class ClipNotFoundError extends Error {
  constructor() { super('Clipe não encontrado'); this.name = 'ClipNotFoundError' }
}
export class ExportPendenteError extends Error {
  constructor() { super('Já existe um export pendente para este formato'); this.name = 'ExportPendenteError' }
}

export async function createClip(
  userId: string,
  fileId: string,
  name: string,
  startMs: number,
  endMs: number,
  transcriptText: string
) {
  if (endMs - startMs < MIN_DURACAO_MS) throw new ClipDuracaoError()

  const clip = await prisma.videoClip.create({
    data: {
      userId,
      fileId,
      name,
      startMs,
      endMs,
      durationSeconds: (endMs - startMs) / 1000,
      transcriptText,
      status: StatusClipe.PENDING,
    },
  })

  await inngest.send({
    name: 'clip/render.requested',
    data: { clipId: clip.id, userId, fileId, startMs, endMs },
  }).catch(() => null)

  return clip
}

export async function listClips(userId: string, fileId: string) {
  return prisma.videoClip.findMany({
    where: { userId, fileId },
    orderBy: { createdAt: 'desc' },
    include: { exports: true },
  })
}

export async function getClip(userId: string, clipId: string) {
  const clip = await prisma.videoClip.findFirst({
    where: { id: clipId, userId },
    include: { exports: true },
  })
  if (!clip) throw new ClipNotFoundError()
  return clip
}

export async function deleteClip(userId: string, clipId: string) {
  const clip = await prisma.videoClip.findFirst({ where: { id: clipId, userId } })
  if (!clip) throw new ClipNotFoundError()

  // Remove Storage files se existirem
  if (clip.clipStoragePath || clip.thumbnailPath) {
    const { IS_LOCAL_STORAGE } = await import('@/lib/storage')
    if (!IS_LOCAL_STORAGE) {
      const { createSupabaseServiceClient } = await import('@/lib/supabase/server')
      const supabase = createSupabaseServiceClient()
      const paths = [clip.clipStoragePath, clip.thumbnailPath].filter(Boolean) as string[]
      if (paths.length) await supabase.storage.from('transcribeadv-uploads').remove(paths)
    }
  }

  await prisma.videoClip.delete({ where: { id: clipId } })
}

export async function requestExport(userId: string, clipId: string, format: FormatoExport) {
  const clip = await prisma.videoClip.findFirst({
    where: { id: clipId, userId, status: StatusClipe.COMPLETED },
  })
  if (!clip) throw new ClipNotFoundError()

  const pendente = await prisma.exportJob.findFirst({
    where: {
      videoClipId: clipId,
      userId,
      format,
      status: { in: [StatusClipe.PENDING, StatusClipe.PROCESSING] },
    },
  })
  if (pendente) throw new ExportPendenteError()

  const job = await prisma.exportJob.create({
    data: { videoClipId: clipId, userId, format, status: StatusClipe.PENDING },
  })

  await inngest.send({
    name: 'clip/export.requested',
    data: {
      exportJobId: job.id,
      clipId,
      userId,
      format,
      clipStoragePath: clip.clipStoragePath,
      clipName: clip.name,
      startMs: clip.startMs,
      endMs: clip.endMs,
      transcriptText: clip.transcriptText,
    },
  }).catch(() => null)

  return job
}
