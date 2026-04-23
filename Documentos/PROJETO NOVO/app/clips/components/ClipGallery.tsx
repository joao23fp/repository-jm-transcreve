'use client'

import { useState, useEffect } from 'react'
import { ExportMenu } from './ExportMenu'

type Clip = {
  id: string
  name: string
  durationSeconds: number
  status: string
  thumbnailPath: string | null
  clipStoragePath: string | null
  errorMessage: string | null
  createdAt: string
  exports: any[]
}

type ClipGalleryProps = {
  fileId: string
  newClipId?: string | null
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ClipGallery({ fileId, newClipId }: ClipGalleryProps) {
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchClips() {
    const res = await fetch(`/api/clips?fileId=${fileId}`)
    if (res.ok) setClips(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchClips() }, [fileId])

  // Polling para clipes em processamento
  useEffect(() => {
    const pending = clips.filter((c) => c.status === 'PENDING' || c.status === 'PROCESSING')
    if (pending.length === 0) return
    const interval = setInterval(fetchClips, 4000)
    return () => clearInterval(interval)
  }, [clips])

  async function handleDelete(clipId: string, name: string) {
    if (!confirm(`Excluir clipe "${name}"?`)) return
    await fetch(`/api/clips/${clipId}`, { method: 'DELETE' })
    setClips((prev) => prev.filter((c) => c.id !== clipId))
  }

  if (loading) return <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', padding: '1rem 0' }}>Carregando clipes…</p>

  if (clips.length === 0) return (
    <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', padding: '1rem 0', textAlign: 'center' }}>
      Nenhum clipe gerado ainda. Selecione um trecho na transcrição para criar.
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {clips.map((clip) => (
        <div
          key={clip.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem', borderRadius: '8px',
            background: clip.id === newClipId ? 'var(--accent-subtle, rgba(79,140,255,0.08))' : 'var(--surface)',
            border: `1px solid ${clip.id === newClipId ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          {/* Thumbnail */}
          <div style={{ width: 72, height: 48, borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {clip.thumbnailPath ? (
              <img src={`/api/uploads/local-file/${clip.thumbnailPath.split('/').map(encodeURIComponent).join('/')}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <span style={{ fontSize: '1.5rem' }}>🎬</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>
              {formatDuration(clip.durationSeconds)} · {new Date(clip.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Status */}
          <StatusBadge status={clip.status} />

          {/* Ações */}
          {clip.status === 'COMPLETED' && (
            <ExportMenu clipId={clip.id} clipName={clip.name} clipStoragePath={clip.clipStoragePath} />
          )}
          {clip.status === 'FAILED' && (
            <span style={{ fontSize: '0.75rem', color: '#f87171', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clip.errorMessage ?? 'Erro'}
            </span>
          )}

          <button onClick={() => handleDelete(clip.id, clip.name)} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-3)', flexShrink: 0 }}>🗑️</button>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:    { label: 'Na fila',     color: '#92400e', bg: '#fef3c7' },
    PROCESSING: { label: 'Gerando…',   color: '#1d4ed8', bg: '#dbeafe' },
    COMPLETED:  { label: 'Pronto',      color: '#15803d', bg: '#dcfce7' },
    FAILED:     { label: 'Erro',        color: '#b91c1c', bg: '#fee2e2' },
  }
  const s = map[status] ?? map.PENDING
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: s.bg, color: s.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {s.label}
    </span>
  )
}
