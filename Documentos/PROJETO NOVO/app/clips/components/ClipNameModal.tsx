'use client'

import { useState, useEffect, useRef } from 'react'
import type { SelectionData } from './ClipSelectionMenu'

type ClipNameModalProps = {
  open: boolean
  selection: SelectionData | null
  fileId: string
  onClose: () => void
  onCreated: (clipId: string) => void
}

export function ClipNameModal({ open, selection, fileId, onClose, onCreated }: ClipNameModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && selection) {
      const defaultName = selection.transcriptText.split(/\s+/).slice(0, 5).join(' ')
      setName(defaultName)
      setError('')
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, selection])

  if (!open || !selection) return null

  async function handleConfirm() {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          name: name.trim(),
          startMs: selection!.startMs,
          endMs: selection!.endMs,
          transcriptText: selection!.transcriptText,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar clipe'); return }
      onCreated(data.clipId)
    } finally {
      setLoading(false)
    }
  }

  const duration = ((selection.endMs - selection.startMs) / 1000).toFixed(1)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg)', borderRadius: '10px', width: '100%', maxWidth: '480px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Nomear Clipe</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
          Trecho selecionado: <strong>{duration}s</strong> · "{selection.transcriptText.slice(0, 60)}{selection.transcriptText.length > 60 ? '…' : ''}"
        </p>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 500 }}>
          Nome do clipe
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onClose() }}
            maxLength={255}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '0.875rem' }}
          />
        </label>

        {error && <p style={{ color: '#f87171', fontSize: '0.82rem' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-hover)', cursor: 'pointer', fontSize: '0.875rem' }}>
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim() || loading}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: name.trim() && !loading ? 'var(--accent)' : 'var(--surface-hover)', color: name.trim() && !loading ? '#fff' : 'var(--text-3)', fontWeight: 600, fontSize: '0.875rem', cursor: name.trim() && !loading ? 'pointer' : 'not-allowed' }}
          >
            {loading ? 'Gerando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
