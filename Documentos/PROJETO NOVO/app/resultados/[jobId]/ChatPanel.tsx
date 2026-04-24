'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Send } from 'lucide-react'
import { PromptSelector } from '@/app/biblioteca/components/PromptSelector'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  jobId: string
  lastEditedAt: string | null
  onCitationClick: (startMs: number) => void
}

export default function ChatPanel({ jobId, lastEditedAt, onCitationClick }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [showStaleWarning, setShowStaleWarning] = useState(false)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [selectedPromptBody, setSelectedPromptBody] = useState<string | null>(null)
  const lastMsgTimeRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoChatFiredRef = useRef(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (lastEditedAt && lastMsgTimeRef.current) {
      setShowStaleWarning(new Date(lastEditedAt) > new Date(lastMsgTimeRef.current))
    }
  }, [lastEditedAt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // FR-012: auto-iniciar chat quando vem de upload concluído
  useEffect(() => {
    const autoChat = searchParams.get('autoChat')
    const promptIdParam = searchParams.get('promptId')
    if (!autoChat || autoChatFiredRef.current) return
    autoChatFiredRef.current = true

    // Aguarda o prompt ser carregado se houver promptId
    const delay = promptIdParam ? 1200 : 400
    setTimeout(async () => {
      let systemPrompt: string | null = null
      if (promptIdParam) {
        try {
          const res = await fetch(`/api/prompts/${promptIdParam}`)
          if (res.ok) {
            const p = await res.json()
            systemPrompt = p.body ?? null
            setSelectedPromptId(promptIdParam)
            setSelectedPromptBody(systemPrompt)
          }
        } catch {}
      }

      const autoMessage = 'Faça um resumo estruturado desta transcrição, destacando os pontos principais.'
      setInput('')
      setLoading(true)
      setMessages([{ role: 'user', content: autoMessage }, { role: 'assistant', content: '' }])

      try {
        const res = await fetch(`/api/jobs/${jobId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: autoMessage,
            ...(systemPrompt && { systemPrompt }),
          }),
        })
        if (res.headers.get('X-Truncated') === '1') setTruncated(true)
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let full = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const { delta } = JSON.parse(data)
              full += delta
              setMessages([
                { role: 'user', content: autoMessage },
                { role: 'assistant', content: full },
              ])
            } catch {}
          }
        }
        lastMsgTimeRef.current = new Date().toISOString()
      } finally {
        setLoading(false)
      }
    }, delay)
  }, [searchParams, jobId])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setShowStaleWarning(false)

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(`/api/jobs/${jobId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          ...(selectedPromptBody && { systemPrompt: selectedPromptBody }),
        }),
      })

      if (res.headers.get('X-Truncated') === '1') setTruncated(true)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const { delta } = JSON.parse(data)
            full += delta
            setMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: full }
              return next
            })
          } catch {}
        }
      }

      lastMsgTimeRef.current = new Date().toISOString()
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: '⚠️ Erro ao processar resposta.' }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  const msgCount = messages.filter(m => m.role === 'user').length

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-border/50 shrink-0"
        style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Chat</span>
        </div>
        {msgCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono border border-border/50 rounded px-2 py-0.5">
            {msgCount} {msgCount === 1 ? 'mensagem' : 'mensagens'}
          </span>
        )}
      </div>

      {/* Truncation warning */}
      {truncated && (
        <div className="text-xs px-4 py-2 shrink-0 bg-amber-500/10 text-amber-400 border-b border-amber-500/20">
          Transcrição muito longa — foi truncada para o contexto do chat.
        </div>
      )}

      {/* ── Stale warning ── */}
      {showStaleWarning && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          fontSize: 11, padding: '6px 13px', flexShrink: 0,
          background: 'var(--amber-bg)', color: 'var(--amber)',
          borderBottom: '1px solid var(--amber-border)',
        }}>
          <span>Transcrição editada — chat pode estar desatualizado</span>
          <button
            onClick={() => { setMessages([]); setShowStaleWarning(false); lastMsgTimeRef.current = null }}
            className="ta-banner-action"
            style={{ fontSize: 11, fontWeight: 600, color: 'inherit', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Reanalisar
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed">
            Faça uma pergunta sobre a transcrição.
          </p>
        )}
        {messages.map((msg, i) => {
          const isStreamingThis = loading && i === messages.length - 1 && msg.role === 'assistant'
          if (msg.role === 'user') {
            return (
              <div key={i} className="self-end max-w-[88%] px-3 py-2 rounded-xl rounded-br-sm text-xs leading-relaxed break-words font-medium"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                {msg.content}
              </div>
            )
          }
          const html = renderAssistantContent(msg.content)
            + (isStreamingThis ? '<span class="ta-cursor-blink" style="color:var(--accent-color)">▋</span>' : '')
          return (
            <div key={i}
              className="self-start max-w-[88%] px-3 py-2 rounded-xl rounded-bl-sm text-xs leading-relaxed break-words border border-border/50"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Prompt selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 shrink-0"
        style={{ background: 'rgba(0,0,0,0.15)' }}>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Contexto:</span>
        <PromptSelector
          fileId={jobId}
          value={selectedPromptId}
          onChange={(id, body) => { setSelectedPromptId(id); setSelectedPromptBody(body) }}
        />
      </div>

      {/* Input */}
      <div className="flex gap-2 px-3 py-2.5 border-t border-border/50 shrink-0"
        style={{ background: 'rgba(0,0,0,0.15)' }}>
        <input
          className="ta-input flex-1 px-3 py-2 text-xs rounded-lg border border-border/50 bg-background text-foreground font-inherit placeholder:text-muted-foreground"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Pergunte sobre a transcrição..."
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ background: 'linear-gradient(135deg, #e8e8ed 0%, #c7c7cc 100%)', color: '#0a0d14' }}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Render assistant message: convert [MM:SS] patterns to styled chips
function renderAssistantContent(content: string): string {
  // Escape HTML first
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Convert [MM:SS] or [HH:MM:SS] to styled chips
  return escaped.replace(
    /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g,
    '<span class="ta-ts-chip">$1</span>'
  )
}
