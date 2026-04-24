'use client'

import { useState, useEffect } from 'react'
import type { PromptItem } from './PromptList'

type PromptSelectorProps = {
  fileId: string
  value: string | null
  onChange: (promptId: string | null, promptBody: string | null, promptName: string | null) => void
}

export function PromptSelector({ fileId, value, onChange }: PromptSelectorProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/prompts')
      .then((r) => r.json())
      .then((data) => setPrompts(Array.isArray(data) ? data : []))
      .catch(() => setPrompts([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const promptId = e.target.value || null

    if (!promptId) {
      onChange(null, null, null)
      return
    }

    const res = await fetch(`/api/prompts/${promptId}`)
    if (!res.ok) return
    const prompt = await res.json()

    onChange(promptId, prompt.body ?? null, prompt.name ?? null)

    // Registra audit trail
    fetch('/api/prompt-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, promptId }),
    }).catch(() => null)
  }

  const sistema = prompts.filter((p) => p.type === 'Sistema')
  const pessoal = prompts.filter((p) => p.type === 'Usuario')

  if (loading) return <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Carregando prompts…</span>

  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      style={{
        padding: '0.4rem 0.6rem',
        fontSize: '0.85rem',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-1)',
        minWidth: '200px',
        maxWidth: '320px',
      }}
    >
      <option value="">Sem contexto personalizado</option>
      {sistema.length > 0 && (
        <optgroup label="Templates do Sistema">
          {sistema.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </optgroup>
      )}
      {pessoal.length > 0 && (
        <optgroup label="Meus Prompts">
          {pessoal.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  )
}
