'use client'

import { useState, useCallback } from 'react'
import { FolderTreeView, type FolderTree } from './FolderTree'
import { PromptList, type PromptItem } from './PromptList'
import { PromptModal } from './PromptModal'

type Mode = 'view' | 'edit' | 'create'

type PromptLibraryClientProps = {
  initialPrompts: PromptItem[]
  initialFolders: FolderTree
}

export function PromptLibraryClient({ initialPrompts, initialFolders }: PromptLibraryClientProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>(initialPrompts)
  const [folders, setFolders] = useState<FolderTree>(initialFolders)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; mode: Mode; prompt?: PromptItem | null }>({ open: false, mode: 'view' })

  const refreshPrompts = useCallback(async (folderId?: string | null) => {
    const params = new URLSearchParams()
    if (folderId !== undefined && folderId !== null) params.set('folderId', folderId)
    const res = await fetch(`/api/prompts?${params}`)
    if (res.ok) setPrompts(await res.json())
  }, [])

  const refreshFolders = useCallback(async () => {
    const res = await fetch('/api/folders')
    if (res.ok) setFolders(await res.json())
  }, [])

  function handleFolderSelect(folderId: string | null) {
    setSelectedFolderId(folderId)
    refreshPrompts(folderId)
  }

  async function handleDelete(prompt: PromptItem) {
    if (!confirm(`Excluir "${prompt.name}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/prompts/${prompt.id}`, { method: 'DELETE' })
    if (res.ok) setPrompts((prev) => prev.filter((p) => p.id !== prompt.id))
  }

  async function handleDuplicate(prompt: PromptItem) {
    const res = await fetch(`/api/prompts/${prompt.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: selectedFolderId }),
    })
    if (res.ok) {
      const novo = await res.json()
      setPrompts((prev) => [novo, ...prev])
    } else {
      const d = await res.json()
      alert(d.error)
    }
  }

  function handleSaved(saved: PromptItem) {
    setPrompts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    setModal({ open: false, mode: 'view' })
  }

  const filtered = selectedFolderId === null
    ? prompts
    : prompts.filter((p) => p.folderId === selectedFolderId)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Sidebar de pastas */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Pastas</p>
        <FolderTreeView
          tree={folders}
          selectedFolderId={selectedFolderId}
          onSelect={handleFolderSelect}
          onRefresh={refreshFolders}
        />
      </div>

      {/* Lista de prompts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>
            {selectedFolderId ? 'Pasta selecionada' : 'Todos os prompts'}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-3)' }}>({filtered.length})</span>
          </h2>
          <button
            onClick={() => setModal({ open: true, mode: 'create' })}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
          >
            + Novo Prompt
          </button>
        </div>

        <PromptList
          prompts={filtered}
          onView={(p) => setModal({ open: true, mode: 'view', prompt: p })}
          onEdit={(p) => setModal({ open: true, mode: 'edit', prompt: p })}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      </div>

      <PromptModal
        open={modal.open}
        mode={modal.mode}
        prompt={modal.prompt}
        folderId={selectedFolderId}
        onClose={() => setModal({ open: false, mode: 'view' })}
        onSaved={handleSaved}
      />
    </div>
  )
}
