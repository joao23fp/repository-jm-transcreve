'use client'

import { useState } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-border/50 shrink-0"
        style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Contradições</span>
        </div>
        {ran && items.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono border border-border/50 rounded px-2 py-0.5">
            {items.length} {items.length === 1 ? 'detectada' : 'detectadas'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {!ran && (
          <button
            onClick={detect}
            disabled={loading}
            className="w-full py-2.5 text-xs font-semibold rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {loading ? 'Analisando…' : 'Detectar contradições'}
          </button>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {ran && items.length === 0 && (
          <p className="text-xs text-muted-foreground leading-relaxed">Nenhuma contradição encontrada.</p>
        )}

        {items.map((item, i) => (
          <div key={item.id} className="rounded-lg border border-border/50 border-l-2 overflow-hidden"
            style={{ borderLeftColor: '#8b5cf6', background: 'var(--surface-2)' }}>
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">Contradição {i + 1}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-400">
                  {Math.round(item.confidenceScore * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
            <div className="flex gap-2 px-3 pb-3">
              {[
                { ms: item.primaryStartMs },
                { ms: item.conflictingStartMs },
              ].map(({ ms }) => (
                <button key={ms}
                  onClick={() => onSeek(ms)}
                  className="ta-ts-chip cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {formatMs(ms)}
                </button>
              ))}
            </div>
          </div>
        ))}

        {ran && (
          <button
            onClick={() => { setRan(false); setItems([]) }}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground border border-border/50 rounded-lg hover:text-foreground hover:border-border transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reanalisar
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
