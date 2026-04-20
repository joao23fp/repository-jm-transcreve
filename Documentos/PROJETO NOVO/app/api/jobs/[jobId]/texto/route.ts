import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'

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
      segments: {
        orderBy: { sequenceIndex: 'asc' },
        include: { speaker: true },
      },
    },
  })

  if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 })

  let text: string

  if (job.segments.length > 0) {
    text = job.segments
      .map((s) => {
        const ts = formatMs(s.startMs)
        const speaker = s.speaker?.displayName ?? 'Falante'
        const content = s.editedText ?? s.originalText
        return `[${ts}] ${speaker}: ${content}`
      })
      .join('\n')
  } else if (job.transcriptText) {
    text = job.transcriptText
  } else {
    return new NextResponse('Transcrição não disponível.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new NextResponse(text, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}`
  return `${pad(m)}:${pad(s % 60)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
