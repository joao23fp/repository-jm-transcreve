'use client'

import { useState, useRef, useEffect } from 'react'
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

  useEffect(() => {
    if (lastEditedAt && lastMsgTimeRef.current) {
      setShowStaleWarning(new Date(lastEditedAt) > new Date(lastMsgTimeRef.current))
    }
  }, [lastEditedAt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)' }}>

      {/* ── Panel header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', height: 38,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'rgba(0,0,0,.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent)',
            boxShadow: '0 0 6px rgba(79,140,255,.5)',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Chat</span>
        </div>
        {msgCount > 0 && (
          <span style={{
            fontSize: 10.5, color: 'var(--text-3)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            padding: '2px 7px', border: '1px solid var(--border-2)', borderRadius: 4,
          }}>
            {msgCount} {msgCount === 1 ? 'mensagem' : 'mensagens'}
          </span>
        )}
      </div>

      {/* ── Truncation warning ── */}
      {truncated && (
        <div style={{
          fontSize: 11, padding: '6px 13px', flexShrink: 0,
          background: 'var(--amber-bg)', color: 'var(--amber)',
          borderBottom: '1px solid var(--amber-border)',
        }}>
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

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: '2rem', lineHeight: 1.6 }}>
            Faça uma pergunta sobre a transcrição.
          </p>
        )}
        {messages.map((msg, i) => {
          const isStreamingThis = loading && i === messages.length - 1 && msg.role === 'assistant'
          if (msg.role === 'user') {
            return (
              <div key={i} style={{
                alignSelf: 'flex-end', maxWidth: '90%',
                padding: '8px 12px', borderRadius: '8px 8px 2px 8px',
                fontSize: 12, lineHeight: 1.65, wordBreak: 'break-word',
                background: 'var(--accent)', color: '#fff', fontWeight: 500,
              }}>
                {msg.content}
              </div>
            )
          }
          const html = renderAssistantContent(msg.content)
            + (isStreamingThis ? '<span class="ta-cursor-blink" style="color:var(--accent)">▋</span>' : '')
          return (
            <div key={i} style={{
              alignSelf: 'flex-start', maxWidth: '90%',
              padding: '8px 12px', borderRadius: '8px 8px 8px 2px',
              fontSize: 12, lineHeight: 1.65, wordBreak: 'break-word',
              background: 'var(--surface-2)', color: 'var(--text)',
              border: '1px solid var(--border-2)',
            }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Prompt selector ── */}
      <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Contexto:</span>
        <PromptSelector
          fileId={jobId}
          value={selectedPromptId}
          onChange={(id, body) => { setSelectedPromptId(id); setSelectedPromptBody(body) }}
        />
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 7, flexShrink: 0,
        background: 'var(--surface)',
      }}>
        <input
          className="ta-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Pergunte sobre a transcrição..."
          disabled={loading}
          style={{
            flex: 1, padding: '8px 11px', fontSize: 12,
            borderRadius: 6, border: '1px solid var(--border-3)',
            background: 'var(--bg)', color: 'var(--text)',
            fontFamily: 'inherit', letterSpacing: '-0.005em',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 500,
            borderRadius: 6, border: 'none',
            background: 'var(--accent)', color: '#fff',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? .5 : 1,
            transition: 'opacity .15s, background .15s',
            whiteSpace: 'nowrap', letterSpacing: '-0.005em',
          }}
        >
          {loading ? '...' : 'Enviar'}
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
