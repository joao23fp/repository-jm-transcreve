import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import Groq from 'groq-sdk'

const MAX_TRANSCRIPT_CHARS = 80_000

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { jobId } = await params

  const job = await prisma.processingJob.findFirst({
    where: { id: jobId, userId },
    include: { segments: { orderBy: { sequenceIndex: 'asc' }, include: { speaker: true } } },
  })
  if (!job) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 })

  if (job.segments.length === 0 && !job.transcriptText) {
    return NextResponse.json(
      { error: 'NO_TRANSCRIPT', message: 'Transcrição ainda não processada' },
      { status: 400 }
    )
  }

  let transcriptContext = job.segments.length > 0
    ? job.segments.map((s, i) => {
        const speaker = s.speaker?.displayName ?? 'Falante'
        const text = s.editedText ?? s.originalText
        return `[SEG-${i}|id:${s.id}|start:${s.startMs}] ${speaker}: ${text}`
      }).join('\n')
    : job.transcriptText ?? ''

  if (transcriptContext.length > MAX_TRANSCRIPT_CHARS) {
    transcriptContext = transcriptContext.slice(0, MAX_TRANSCRIPT_CHARS)
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const prompt = `Analise a transcrição abaixo e identifique contradições ou inconsistências no depoimento.
Retorne APENAS um JSON válido no seguinte formato (sem texto adicional):
{
  "contradictions": [
    {
      "description": "Descrição clara da contradição",
      "primarySegmentId": "id do primeiro segmento",
      "conflictingSegmentId": "id do segundo segmento",
      "primaryText": "texto do primeiro trecho",
      "conflictingText": "texto do segundo trecho",
      "primaryStartMs": 0,
      "conflictingStartMs": 0,
      "confidenceScore": 0.9
    }
  ]
}

Se não houver contradições, retorne: {"contradictions": []}

TRANSCRIÇÃO:
${transcriptContext}`

  let parsed: { contradictions: any[] } = { contradictions: [] }

  try {
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })
    const text = result.choices[0]?.message?.content ?? '{}'
    parsed = JSON.parse(text)
  } catch (err) {
    console.error('[contradictions] LLM error:', err)
    return NextResponse.json({ error: 'LLM_ERROR', message: 'Erro ao analisar contradições.' }, { status: 500 })
  }

  const contradictions = (parsed.contradictions ?? []).map((c: any) => ({
    ...c,
    confidenceScore: Math.max(0, Math.min(1, Number(c.confidenceScore ?? 0.5))),
  }))

  // Persist reports
  await prisma.inconsistencyReport.deleteMany({ where: { jobId } })
  if (contradictions.length > 0) {
    await prisma.inconsistencyReport.createMany({
      data: contradictions.map((c: any) => ({
        jobId,
        description: c.description ?? '',
        primarySegmentId: c.primarySegmentId ?? '',
        conflictingSegmentId: c.conflictingSegmentId ?? '',
        confidenceScore: c.confidenceScore,
      })),
    })
  }

  const reports = await prisma.inconsistencyReport.findMany({
    where: { jobId },
    orderBy: { confidenceScore: 'desc' },
  })

  return NextResponse.json({
    count: reports.length,
    items: reports.map((r, i) => {
      const c = contradictions[i] ?? {}
      return {
        id: r.id,
        description: r.description,
        primarySegmentId: r.primarySegmentId,
        conflictingSegmentId: r.conflictingSegmentId,
        confidenceScore: r.confidenceScore,
        primaryText: c.primaryText ?? '',
        conflictingText: c.conflictingText ?? '',
        primaryStartMs: Number(c.primaryStartMs ?? 0),
        conflictingStartMs: Number(c.conflictingStartMs ?? 0),
      }
    }),
  })
}
