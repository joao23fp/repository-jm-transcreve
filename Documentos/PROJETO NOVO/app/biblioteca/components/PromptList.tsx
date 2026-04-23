'use client'

export type PromptItem = {
  id: string
  userId: string | null
  folderId: string | null
  name: string
  description: string | null
  type: 'Sistema' | 'Usuario'
  createdAt: string
  updatedAt: string
}

type PromptListProps = {
  prompts: PromptItem[]
  onView: (prompt: PromptItem) => void
  onEdit: (prompt: PromptItem) => void
  onDuplicate: (prompt: PromptItem) => void
  onDelete: (prompt: PromptItem) => void
}

export function PromptList({ prompts, onView, onEdit, onDuplicate, onDelete }: PromptListProps) {
  if (prompts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
        Nenhum prompt encontrado.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {prompts.map((p) => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              {p.type === 'Sistema' ? (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', whiteSpace: 'nowrap' }}>
                  🔒 Sistema
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#f0fdf4', color: '#15803d', whiteSpace: 'nowrap' }}>
                  Pessoal
                </span>
              )}
            </div>
            {p.description && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <button onClick={() => onView(p)} style={btnStyle('secondary')}>Visualizar</button>
            <button onClick={() => onDuplicate(p)} style={btnStyle('secondary')}>Duplicar</button>
            {p.type === 'Usuario' && (
              <>
                <button onClick={() => onEdit(p)} style={btnStyle('secondary')}>Editar</button>
                <button onClick={() => onDelete(p)} style={btnStyle('danger')}>Excluir</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function btnStyle(variant: 'secondary' | 'danger'): React.CSSProperties {
  return {
    padding: '0.3rem 0.7rem',
    fontSize: '0.78rem',
    fontWeight: 500,
    borderRadius: '5px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    background: variant === 'danger' ? '#fee2e2' : 'var(--surface-hover)',
    color: variant === 'danger' ? '#b91c1c' : 'var(--text-1)',
  }
}
