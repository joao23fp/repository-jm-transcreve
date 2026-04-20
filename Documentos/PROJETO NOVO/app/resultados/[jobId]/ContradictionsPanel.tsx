'use client'

import { useState } from 'react'

type Contradiction = {
  id: string
  description: string
  primarySegmentId: string
  conflictingSegmentId: string
  confidenceScore: number
  primaryText: string
  conflictingText: string
  primaryStartMs: number
  conflictingStartMs: number
}

type Props = {
  jobId: string
  onSeek: (ms: number) => void
}

export default function ContradictionsPanel({ jobId, onSeek }: Props) {
  const [items, setItems] = useState<Contradiction[]>([])
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function detect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/contradictions`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Erro ao detectar contradições.'); return }
      setItems(data.items ?? [])
      setRan(true)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

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
            background: 'var(--amber)',
            boxShadow: '0 0 6px rgba(210,153,34,.4)',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Contradições</span>
        </div>
        {ran && items.length > 0 && (
          <span style={{
            fontSize: 10.5, color: 'var(--text-3)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            padding: '2px 7px', border: '1px solid var(--border-2)', borderRadius: 4,
          }}>
            {items.length} {items.length === 1 ? 'detectada' : 'detectadas'}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Detect button */}
        {!ran && (
          <button
            onClick={detect}
            disabled={loading}
            style={{
              width: '100%', padding: '9px 0',
              fontSize: 12, fontWeight: 500, borderRadius: 6, border: 'none',
              background: 'var(--amber)', color: '#0a0a0a',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? .7 : 1,
              transition: 'opacity .15s',
              letterSpacing: '-0.005em',
            }}
          >
            {loading ? 'Analisando...' : 'Detectar contradições'}
          </button>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>
        )}

        {/* Empty result */}
        {ran && items.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Nenhuma contradição encontrada.
          </p>
        )}

        {/* Contradiction cards */}
        {items.map((item, i) => (
          <div key={item.id} style={{
            border: '1px solid var(--border-2)',
            borderLeft: '2px solid var(--amber)',
            borderRadius: '0 6px 6px 0',
            padding: '11px 13px',
            background: 'var(--surface-2)',
            display: 'flex', flexDirection: 'column', gap: 7,
          }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.005em' }}>
                Contradição {i + 1}
              </span>
              <span style={{
                fontSize: 10, color: 'var(--amber)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                padding: '1px 6px',
                background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 3,
              }}>
                {Math.round(item.confidenceScore * 100)}%
              </span>
            </div>

            {/* Description */}
            <p style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              {item.description}
            </p>

            {/* Seek chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <button
                className="ta-chip"
                onClick={() => onSeek(item.primaryStartMs)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, fontWeight: 500, padding: '3px 9px', borderRadius: 4,
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  border: '1px solid var(--accent-border)',
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  cursor: 'pointer', letterSpacing: 0,
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
                {formatMs(item.primaryStartMs)}
              </button>
              <button
                className="ta-chip"
                onClick={() => onSeek(item.conflictingStartMs)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, fontWeight: 500, padding: '3px 9px', borderRadius: 4,
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  border: '1px solid var(--accent-border)',
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  cursor: 'pointer', letterSpacing: 0,
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
                {formatMs(item.conflictingStartMs)}
              </button>
            </div>
          </div>
        ))}

        {/* Reanalyze */}
        {ran && (
          <button
            className="ta-btn-reanalyze"
            onClick={() => { setRan(false); setItems([]) }}
            style={{
              width: '100%', padding: '7px 0', fontSize: 11.5, fontWeight: 500,
              color: 'var(--text-3)', background: 'transparent',
              border: '1px solid var(--border-2)', borderRadius: 6,
              cursor: 'pointer', transition: 'color .15s, border-color .15s, background .15s',
              letterSpacing: '-0.005em',
            }}
          >
            Reanalisar
          </button>
        )}

      </div>
    </div>
  )
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${pad(m)}:${pad(s % 60)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
