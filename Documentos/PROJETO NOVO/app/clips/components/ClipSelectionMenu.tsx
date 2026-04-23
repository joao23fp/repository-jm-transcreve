'use client'

import { useState, useEffect, useCallback } from 'react'

export type SelectionData = {
  startMs: number
  endMs: number
  transcriptText: string
}

type ClipSelectionMenuProps = {
  onValidSelection: (data: SelectionData) => void
  fileExpired?: boolean
}

export function ClipSelectionMenu({ onValidSelection, fileExpired }: ClipSelectionMenuProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; data: SelectionData | null; error: string | null } | null>(null)

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setMenu(null)
      return
    }

    const text = selection.toString().trim()
    if (!text) { setMenu(null); return }

    // Coletar todos os nós selecionados com data-start-ms / data-end-ms
    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer.parentElement?.closest('[data-transcript-area]')
    if (!container) { setMenu(null); return }

    const spans = Array.from(container.querySelectorAll('[data-start-ms]')) as HTMLElement[]
    const selected = spans.filter((span) => selection.containsNode(span, true))

    if (selected.length === 0) { setMenu(null); return }

    const startMs = Math.min(...selected.map((s) => parseInt(s.dataset.startMs ?? '0', 10)))
    const endMs = Math.max(...selected.map((s) => parseInt(s.dataset.endMs ?? '0', 10)))
    const durationMs = endMs - startMs

    const rect = range.getBoundingClientRect()
    const x = rect.left + rect.width / 2 + window.scrollX
    const y = rect.top + window.scrollY - 12

    if (fileExpired) {
      setMenu({ x, y, data: null, error: 'Arquivo expirado — não é possível gerar novos clipes' })
      return
    }

    if (durationMs < 3000) {
      setMenu({ x, y, data: null, error: `Seleção muito curta para gerar clipe (mínimo 3s, selecionado ${(durationMs / 1000).toFixed(1)}s)` })
      return
    }

    setMenu({ x, y, data: { startMs, endMs, transcriptText: text }, error: null })
  }, [fileExpired])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  useEffect(() => {
    const hide = () => setMenu(null)
    document.addEventListener('mousedown', hide)
    return () => document.removeEventListener('mousedown', hide)
  }, [])

  if (!menu) return null

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: menu.x,
        top: menu.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 100,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.5rem 0.75rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      {menu.error ? (
        <span style={{ fontSize: '0.8rem', color: '#f87171' }}>{menu.error}</span>
      ) : (
        <button
          onClick={() => { onValidSelection(menu.data!); setMenu(null) }}
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '0.3rem 0.75rem',
            borderRadius: '5px',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          ✂️ Gerar Clipe ({((menu.data!.endMs - menu.data!.startMs) / 1000).toFixed(1)}s)
        </button>
      )}
    </div>
  )
}
