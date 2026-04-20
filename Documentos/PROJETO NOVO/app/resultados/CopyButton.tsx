'use client'

import { useState } from 'react'

export function CopyButton({ jobId }: { jobId: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch(`/api/jobs/${jobId}/texto`)
      if (!res.ok) throw new Error('fetch failed')
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch (err) {
      console.error('[CopyButton]', err)
      setState('error')
    } finally {
      setTimeout(() => setState('idle'), 1800)
    }
  }

  const color =
    state === 'copied' ? 'var(--green)' :
    state === 'error'  ? 'var(--red)'   : 'var(--text-2)'

  return (
    <button
      onClick={handleCopy}
      className="ta-btn-copy"
      aria-label="Copiar transcrição"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        height: 28,
        padding: '0 11px',
        fontSize: 11.5,
        fontWeight: 500,
        borderRadius: 6,
        border: '1px solid var(--border-3)',
        background: 'transparent',
        color,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.005em',
        flexShrink: 0,
      }}
    >
      {state === 'copied' ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copiado
        </>
      ) : state === 'error' ? (
        'Erro'
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copiar
        </>
      )}
    </button>
  )
}
