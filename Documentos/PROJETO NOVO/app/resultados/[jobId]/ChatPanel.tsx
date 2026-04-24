'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Send, Sparkles } from 'lucide-react'
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
  const [selectedPromptName, setSelectedPromptName] = useState<string | null>(null)
  const lastMsgTimeRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoChatFiredRef = useRef(false)
  const mountedRef = useRef(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (lastEditedAt && lastMsgTimeRef.current) {
      setShowStaleWarning(new Date(lastEditedAt) > new Date(lastMsgTimeRef.current))
    }
  }, [lastEditedAt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Função central de streaming ──────────────────────────────────
  const runChat = useCallback(async (userMessage: string, systemPrompt?: string | null) => {
    if (loading) return
    setLoading(true)
    setShowStaleWarning(false)

    setMessages(prev => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(`/api/jobs/${jobId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
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
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: full }
              return next
            })
          } catch {}
        }
      }

      lastMsgTimeRef.current = new Date().toISOString()
    } catch {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: '⚠️ Erro ao processar resposta.' }
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [jobId, loading])

  // ── FR-012: auto-chat ao vir do upload ───────────────────────────
  useEffect(() => {
    const autoChat = searchParams.get('autoChat')
    const promptIdParam = searchParams.get('promptId')
    if (!autoChat || autoChatFiredRef.current) return
    autoChatFiredRef.current = true

    setTimeout(async () => {
      let systemPrompt: string | null = null
      let promptName: string | null = null

      if (promptIdParam) {
        try {
          const res = await fetch(`/api/prompts/${promptIdParam}`)
          if (res.ok) {
            const p = await res.json()
            systemPrompt = p.body ?? null
            promptName = p.name ?? null
            setSelectedPromptId(promptIdParam)
            setSelectedPromptBody(systemPrompt)
            setSelectedPromptName(promptName)
          }
        } catch {}
      }

      // Mensagem de ativação — usa o nome do prompt se disponível
      const message = promptName
        ? `Executar: ${promptName}`
        : 'Faça um resumo desta transcrição.'

      await runChat(message, systemPrompt)
    }, promptIdParam ? 1000 : 300)
  }, [searchParams, jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-disparo ao selecionar prompt no viewer ──────────────────
  useEffect(() => {
    // Ignora a montagem inicial
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    // Se um prompt foi selecionado (não limpado), dispara automaticamente
    if (selectedPromptBody && selectedPromptName) {
      const message = `Executar: ${selectedPromptName}`
      runChat(message, selectedPromptBody)
    }
  }, [selectedPromptId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await runChat(text, selectedPromptBody)
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
        <div className="text-xs px-4 py-2 shrink-0 bg-muted/30 text-muted-foreground border-b border-border/50">
          Transcrição muito longa — foi truncada para o contexto do chat.
        </div>
      )}

      {/* Stale warning */}
      {showStaleWarning && (
        <div className="flex items-center justify-between gap-2 text-xs px-4 py-2 shrink-0 border-b border-border/50 bg-muted/20 text-muted-foreground">
          <span>Transcrição editada — chat pode estar desatualizado</span>
          <button
            onClick={() => { setMessages([]); setShowStaleWarning(false); lastMsgTimeRef.current = null }}
            className="underline underline-offset-2 font-medium whitespace-nowrap hover:text-foreground transition-colors"
          >
            Reanalisar
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-border/50"
              style={{ background: 'var(--surface-2)' }}>
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Selecione um contexto para análise automática</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ou faça uma pergunta sobre a transcrição abaixo
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isStreamingThis = loading && i === messages.length - 1 && msg.role === 'assistant'
          if (msg.role === 'user') {
            return (
              <div key={i} className="self-end max-w-[88%] px-3 py-2 rounded-xl rounded-br-sm text-xs leading-relaxed break-words font-medium flex items-center gap-1.5"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                {msg.content.startsWith('Executar:') && <Sparkles className="w-3 h-3 shrink-0" />}
                {msg.content.replace('Executar: ', '')}
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
        <Sparkles className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Analisar com:</span>
        <PromptSelector
          fileId={jobId}
          value={selectedPromptId}
          onChange={(id, body, name) => {
            setSelectedPromptId(id)
            setSelectedPromptBody(body)
            setSelectedPromptName(name)
          }}
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

function renderAssistantContent(content: string): string {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(
    /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g,
    '<span class="ta-ts-chip">$1</span>'
  )
}
