'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

type Prompt = { id: string; name: string; type: string }

type Props = {
  selectedPromptId: string | null
  onChange: (promptId: string | null) => void
  disabled?: boolean
}

export function ContextPromptSelector({ selectedPromptId, onChange, disabled }: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/prompts')
      .then(r => r.json())
      .then(data => setPrompts(Array.isArray(data) ? data : []))
      .catch(() => setPrompts([]))
      .finally(() => setLoading(false))
  }, [])

  const sistema = prompts.filter(p => p.type === 'Sistema')
  const pessoal = prompts.filter(p => p.type === 'Usuario')

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        Contexto do áudio/vídeo
        <span className="text-xs font-normal text-muted-foreground">(opcional — define como a IA vai analisar)</span>
      </label>
      <select
        value={selectedPromptId ?? ''}
        onChange={e => onChange(e.target.value || null)}
        disabled={disabled || loading}
        className="w-full px-4 py-3 rounded-xl text-sm border border-border/50 bg-card text-foreground cursor-pointer transition-colors focus:outline-none focus:border-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="">
          {loading ? 'Carregando prompts…' : 'Sem contexto — análise padrão'}
        </option>
        {sistema.length > 0 && (
          <optgroup label="── Templates do Sistema">
            {sistema.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </optgroup>
        )}
        {pessoal.length > 0 && (
          <optgroup label="── Meus Prompts">
            {pessoal.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  )
}
