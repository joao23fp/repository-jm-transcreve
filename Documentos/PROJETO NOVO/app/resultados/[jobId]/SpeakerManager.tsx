'use client'

import { useState } from 'react'

type Speaker = { id: string; displayName: string; isRenamed: boolean }

type Props = {
  jobId: string
  speakers: Speaker[]
  currentSpeakerId: string | null
  onAssign: (speakerId: string, displayName: string) => void
  onClose: () => void
}

export default function SpeakerManager({ jobId, speakers, currentSpeakerId, onAssign, onClose }: Props) {
  const [renaming, setRenaming] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function save(speakerId: string, name: string) {
    if (!name.trim()) return
    setLoading(true)
    try {
      await fetch(`/api/jobs/${jobId}/speakers/${speakerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim() }),
      })
      onAssign(speakerId, name.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 20,
      background: 'var(--surface-2)',
      border: '1px solid var(--border-3)',
      borderRadius: 8,
      padding: '0.625rem',
      minWidth: 200,
      boxShadow: '0 8px 24px rgba(0,0,0,.5)',
    }}>
      <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Atribuir falante
      </p>
      {speakers.map((sp) => (
        <div key={sp.id}>
          {renaming === sp.id ? (
            <div style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save(sp.id, nameInput)
                  if (e.key === 'Escape') setRenaming(null)
                }}
                placeholder="Nome do falante"
                style={{
                  flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 5,
                  border: '1px solid var(--border-3)', background: 'var(--bg)',
                  color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={() => save(sp.id, nameInput)}
                disabled={loading}
                style={{
                  padding: '4px 10px', fontSize: 11, borderRadius: 5, border: 'none',
                  background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                OK
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 7px', borderRadius: 5, marginBottom: 2,
              background: currentSpeakerId === sp.id ? 'var(--accent-bg)' : 'transparent',
              cursor: 'pointer',
              transition: 'background .1s',
            }}>
              <span
                onClick={() => onAssign(sp.id, sp.displayName)}
                style={{ fontSize: 12, flex: 1, color: 'var(--text)' }}
              >
                {sp.displayName}
              </span>
              <button
                onClick={() => { setRenaming(sp.id); setNameInput(sp.displayName) }}
                style={{
                  fontSize: 11, color: 'var(--text-3)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: '0 2px',
                  transition: 'color .15s',
                }}
                title="Renomear"
              >
                ✏
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onClose}
        style={{
          marginTop: 6, width: '100%', padding: '5px 0', fontSize: 11.5,
          color: 'var(--text-3)', background: 'none',
          border: '1px solid var(--border-2)', borderRadius: 5,
          cursor: 'pointer', transition: 'color .15s, border-color .15s',
        }}
      >
        Cancelar
      </button>
    </div>
  )
}
