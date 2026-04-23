'use client'

import { useState } from 'react'

export type Folder = {
  id: string
  userId: string
  name: string
  parentFolderId: string | null
  createdAt: string
  updatedAt: string
}

export type FolderTree = {
  raiz: Folder[]
  nivel1: Folder[]
  nivel2: Folder[]
}

type FolderTreeProps = {
  tree: FolderTree
  selectedFolderId: string | null
  onSelect: (folderId: string | null) => void
  onRefresh: () => void
}

export function FolderTreeView({ tree, selectedFolderId, onSelect, onRefresh }: FolderTreeProps) {
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(parentFolderId: string | null) {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), parentFolderId }),
      })
      if (res.ok) { onRefresh(); setCreating(null); setNewName('') }
      else {
        const d = await res.json()
        alert(d.error)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(folderId: string, name: string, promptCount: number) {
    const msg = promptCount > 0
      ? `Pasta "${name}" contém ${promptCount} prompts. Ao excluir, todos serão removidos da sua biblioteca. Continuar?`
      : `Excluir pasta "${name}"?`
    if (!confirm(msg)) return
    await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
    if (selectedFolderId === folderId) onSelect(null)
    onRefresh()
  }

  async function handleRename(folderId: string, currentName: string) {
    const nome = window.prompt('Novo nome:', currentName)
    if (!nome || nome.trim() === currentName) return
    await fetch(`/api/folders/${folderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome.trim() }),
    })
    onRefresh()
  }

  function getPromptCount(folderId: string) {
    const children = tree.nivel1.filter((f) => f.parentFolderId === folderId)
    const grandchildren = tree.nivel2.filter((f) => children.some((c) => c.id === f.parentFolderId))
    return children.length + grandchildren.length
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <button
        onClick={() => onSelect(null)}
        style={folderBtnStyle(selectedFolderId === null)}
      >
        📁 Todos os prompts
      </button>

      {tree.raiz.map((folder) => {
        const children = tree.nivel1.filter((f) => f.parentFolderId === folder.id)
        return (
          <div key={folder.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button onClick={() => onSelect(folder.id)} style={{ ...folderBtnStyle(selectedFolderId === folder.id), flex: 1 }}>
                📂 {folder.name}
              </button>
              <FolderActions
                onRename={() => handleRename(folder.id, folder.name)}
                onDelete={() => handleDelete(folder.id, folder.name, getPromptCount(folder.id))}
                onAddChild={() => { setCreating({ parentId: folder.id }); setNewName('') }}
              />
            </div>

            {children.map((child) => {
              const grandchildren = tree.nivel2.filter((f) => f.parentFolderId === child.id)
              return (
                <div key={child.id} style={{ marginLeft: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button onClick={() => onSelect(child.id)} style={{ ...folderBtnStyle(selectedFolderId === child.id), flex: 1 }}>
                      📂 {child.name}
                    </button>
                    <FolderActions
                      onRename={() => handleRename(child.id, child.name)}
                      onDelete={() => handleDelete(child.id, child.name, grandchildren.length)}
                      onAddChild={() => { setCreating({ parentId: child.id }); setNewName('') }}
                    />
                  </div>

                  {grandchildren.map((gc) => (
                    <div key={gc.id} style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button onClick={() => onSelect(gc.id)} style={{ ...folderBtnStyle(selectedFolderId === gc.id), flex: 1 }}>
                        📂 {gc.name}
                      </button>
                      <FolderActions
                        onRename={() => handleRename(gc.id, gc.name)}
                        onDelete={() => handleDelete(gc.id, gc.name, 0)}
                      />
                    </div>
                  ))}

                  {creating?.parentId === child.id && (
                    <NewFolderInput value={newName} onChange={setNewName} onConfirm={() => handleCreate(child.id)} onCancel={() => setCreating(null)} loading={loading} />
                  )}
                </div>
              )
            })}

            {creating?.parentId === folder.id && (
              <div style={{ marginLeft: '1rem' }}>
                <NewFolderInput value={newName} onChange={setNewName} onConfirm={() => handleCreate(folder.id)} onCancel={() => setCreating(null)} loading={loading} />
              </div>
            )}
          </div>
        )
      })}

      {creating?.parentId === null && (
        <NewFolderInput value={newName} onChange={setNewName} onConfirm={() => handleCreate(null)} onCancel={() => setCreating(null)} loading={loading} />
      )}

      <button
        onClick={() => { setCreating({ parentId: null }); setNewName('') }}
        style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: '1px dashed var(--border)', borderRadius: '6px', background: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
      >
        + Nova pasta
      </button>
    </div>
  )
}

function FolderActions({ onRename, onDelete, onAddChild }: { onRename: () => void; onDelete: () => void; onAddChild?: () => void }) {
  return (
    <div style={{ display: 'flex', gap: '0.2rem' }}>
      {onAddChild && (
        <button onClick={onAddChild} title="Nova subpasta" style={iconBtnStyle}>+</button>
      )}
      <button onClick={onRename} title="Renomear" style={iconBtnStyle}>✏️</button>
      <button onClick={onDelete} title="Excluir" style={{ ...iconBtnStyle, color: '#b91c1c' }}>🗑️</button>
    </div>
  )
}

function NewFolderInput({ value, onChange, onConfirm, onCancel, loading }: { value: string; onChange: (v: string) => void; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel() }}
        placeholder="Nome da pasta"
        style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: '5px', border: '1px solid var(--border)' }}
      />
      <button onClick={onConfirm} disabled={loading || !value.trim()} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '5px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>OK</button>
      <button onClick={onCancel} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '5px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.15rem 0.25rem', borderRadius: '3px',
}

function folderBtnStyle(active: boolean): React.CSSProperties {
  return {
    textAlign: 'left', padding: '0.35rem 0.6rem', fontSize: '0.82rem', borderRadius: '5px',
    border: 'none', cursor: 'pointer',
    background: active ? 'var(--accent)' : 'none',
    color: active ? '#fff' : 'var(--text-1)',
    fontWeight: active ? 600 : 400,
  }
}
