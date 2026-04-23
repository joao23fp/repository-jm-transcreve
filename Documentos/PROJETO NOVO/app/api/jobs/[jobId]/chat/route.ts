import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import Groq from 'groq-sdk'

const MAX_TRANSCRIPT_CHARS = 80_000

export async function POST(
  req: NextRequest,
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

  const body = await req.json()
  const message = String(body.message ?? '').trim()
  if (!message) return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 })
  const customSystemPrompt: string | null = typeof body.systemPrompt === 'string' ? body.systemPrompt : null

  // Build transcript context
  let transcriptContext: string
  let truncated = false

  if (job.segments.length > 0) {
    transcriptContext = job.segments
      .map((s) => {
        const speaker = s.speaker?.displayName ?? 'Falante'
        const text = s.editedText ?? s.originalText
        return `[${formatMs(s.startMs)}] ${speaker}: ${text}`
      })
      .join('\n')
  } else {
    transcriptContext = job.transcriptText ?? ''
  }

  if (transcriptContext.length > MAX_TRANSCRIPT_CHARS) {
    const half = MAX_TRANSCRIPT_CHARS / 2
    transcriptContext =
      transcriptContext.slice(0, half) +
      '\n\n[... transcrição truncada por limite de contexto ...]\n\n' +
      transcriptContext.slice(-half)
    truncated = true
  }

  // Load last 10 messages for history
  const history = await prisma.chatMessage.findMany({
    where: { jobId, userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  history.reverse()

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const baseInstructions = customSystemPrompt
    ? `${customSystemPrompt}\n\nResponda APENAS com base na transcrição fornecida abaixo. Cite os momentos relevantes usando o formato [MM:SS]. Nunca invente informações que não estejam na transcrição.`
    : `Você é um assistente jurídico especializado em análise de audiências e depoimentos.\nResponda APENAS com base na transcrição fornecida abaixo. Cite os momentos relevantes usando o formato [MM:SS].\nNunca invente informações que não estejam na transcrição.`

  const systemPrompt = `${baseInstructions}\n\nTRANSCRIÇÃO:\n${transcriptContext}`

  const groqMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ]

  // Persist user message
  await prisma.chatMessage.create({
    data: { jobId, userId, role: 'user', content: message, citedSegmentIds: [] },
  })

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: groqMessages,
    stream: true,
    max_tokens: 1024,
  })

  let fullResponse = ''

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            fullResponse += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
        // Persist assistant message after stream ends
        await prisma.chatMessage.create({
          data: { jobId, userId, role: 'assistant', content: fullResponse, citedSegmentIds: [] },
        }).catch(() => {})
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Truncated': truncated ? '1' : '0',
    },
  })
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
