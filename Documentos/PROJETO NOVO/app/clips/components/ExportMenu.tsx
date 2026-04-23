'use client'

import { useState } from 'react'

type ExportMenuProps = {
  clipId: string
  clipName: string
  clipStoragePath: string | null
}

type Format = 'VIDEO' | 'PDF' | 'WORD'

export function ExportMenu({ clipId, clipName, clipStoragePath }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<Format | null>(null)

  async function handleExport(format: Format) {
    setLoading(format)
    setOpen(false)
    try {
      if (format === 'VIDEO' && clipStoragePath) {
        // Para vídeo em local storage, busca via API
        const res = await fetch(`/api/clips/${clipId}/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format }),
        })
        const data = await res.json()
        if (!res.ok) { alert(data.error); return }

        // Polling até COMPLETED
        const fileUrl = await pollExportJob(data.exportJobId)
        if (fileUrl) triggerDownload(fileUrl, `${clipName}.mp4`)
        return
      }

      const res = await fetch(`/api/clips/${clipId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }

      const fileUrl = await pollExportJob(data.exportJobId)
      const ext = format === 'PDF' ? 'pdf' : 'docx'
      if (fileUrl) triggerDownload(fileUrl, `${clipName}.${ext}`)
    } finally {
      setLoading(null)
    }
  }

  async function pollExportJob(exportJobId: string): Promise<string | null> {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const res = await fetch(`/api/clips/${clipId}`)
      if (!res.ok) return null
      const clip = await res.json()
      const job = clip.exports?.find((e: any) => e.id === exportJobId)
      if (job?.status === 'COMPLETED' && job.fileStoragePath) {
        return `/api/uploads/local-file/${job.fileStoragePath.split('/').map(encodeURIComponent).join('/')}`
      }
      if (job?.status === 'FAILED') { alert('Erro ao exportar. Tente novamente.'); return null }
    }
    alert('Timeout ao aguardar exportação.')
    return null
  }

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const options: { format: Format; label: string; icon: string }[] = [
    { format: 'VIDEO', label: 'Download Vídeo (.mp4)', icon: '🎬' },
    { format: 'PDF', label: 'Baixar PDF', icon: '📄' },
    { format: 'WORD', label: 'Baixar Word (.docx)', icon: '📝' },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!!loading}
        style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', fontWeight: 500, borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--surface-hover)', cursor: loading ? 'wait' : 'pointer', color: 'var(--text-1)' }}
      >
        {loading ? `Exportando ${loading}…` : '⬇️ Exportar'}
      </button>

      {open && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '7px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 20, minWidth: '200px', overflow: 'hidden' }}>
          {options.map((opt) => (
            <button
              key={opt.format}
              onClick={() => handleExport(opt.format)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 1rem', fontSize: '0.82rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-1)', textAlign: 'left' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
