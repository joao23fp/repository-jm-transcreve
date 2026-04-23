'use client'

import { useState, useEffect } from 'react'
import type { PromptItem } from './PromptList'

type Mode = 'view' | 'edit' | 'create'

type PromptModalProps = {
  open: boolean
  mode: Mode
  prompt?: PromptItem | null
  folderId?: string | null
  onClose: () => void
  onSaved: (prompt: PromptItem) => void
}

export function PromptModal({ open, mode, prompt, folderId, onClose, onSaved }: PromptModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(prompt?.name ?? '')
      setDescription(prompt?.description ?? '')
      setBody('')
      setError('')
      if (prompt && (mode === 'view' || mode === 'edit')) {
        fetch(`/api/prompts/${prompt.id}`)
          .then((r) => r.json())
          .then((d) => setBody(d.body ?? ''))
          .catch(() => setBody(''))
      }
    }
  }, [open, prompt, mode])

  if (!open) return null

  const isReadonly = mode === 'view'
  const canSave = body.trim().length > 0 && name.trim().length > 0

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      let res: Response
      if (mode === 'create') {
        res = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, body, folderId }),
        })
      } else {
        res = await fetch(`/api/prompts/${prompt!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, body }),
        })
      }
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao salvar')
        return
      }
      const saved = await res.json()
      onSaved(saved)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg)', borderRadius: '10px', width: '100%', maxWidth: '560px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {mode === 'create' ? 'Novo Prompt' : mode === 'edit' ? 'Editar Prompt' : 'Visualizar Prompt'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={labelStyle}>
            Nome *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={isReadonly}
              maxLength={255}
              style={inputStyle(isReadonly)}
              placeholder="Nome do prompt"
            />
          </label>

          <label style={labelStyle}>
            Descrição
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={isReadonly}
              maxLength={500}
              style={inputStyle(isReadonly)}
              placeholder="Descrição opcional"
            />
          </label>

          <label style={labelStyle}>
            Instruções para a IA *
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              readOnly={isReadonly}
              maxLength={2000}
              rows={8}
              style={{ ...inputStyle(isReadonly), resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Escreva as instruções que a IA deve seguir ao analisar o arquivo..."
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'right' }}>{body.length}/2000</span>
          </label>
        </div>

        {error && <p style={{ color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-hover)', cursor: 'pointer', fontSize: '0.875rem' }}>
            {isReadonly ? 'Fechar' : 'Cancelar'}
          </button>
          {!isReadonly && (
            <button
              onClick={handleSave}
              disabled={!canSave || loading}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: canSave && !loading ? 'var(--accent)' : 'var(--surface-hover)', color: canSave && !loading ? '#fff' : 'var(--text-3)', cursor: canSave && !loading ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.875rem' }}
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)',
}

function inputStyle(readonly: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: readonly ? 'var(--surface)' : 'var(--bg)',
    color: 'var(--text-1)',
    fontSize: '0.875rem',
    width: '100%',
    boxSizing: 'border-box',
  }
}
