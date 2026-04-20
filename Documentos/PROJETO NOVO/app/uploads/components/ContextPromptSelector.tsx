'use client'

type Props = {
  selectedPromptId: string | null
  onChange: (promptId: string | null) => void
  disabled?: boolean
}

const PROMPTS = [
  { id: 'audiencia-civel', label: 'Audiência Cível' },
  { id: 'audiencia-criminal', label: 'Audiência Criminal' },
  { id: 'reuniao-societaria', label: 'Reunião Societária' },
  { id: 'depoimento', label: 'Depoimento / Inquirição' },
]

export function ContextPromptSelector({ selectedPromptId, onChange, disabled }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--ta-text-primary)' }}>
        Contexto do áudio/vídeo
      </label>
      <select
        value={selectedPromptId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          border: '0.5px solid var(--ta-border-subtle)',
          borderRadius: 8,
          fontSize: 14,
          background: 'var(--ta-bg-primary)',
          color: 'var(--ta-text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--ta-border-info)' }}
        onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--ta-border-subtle)' }}
      >
        <option value="">Selecionar contexto (padrão)</option>
        {PROMPTS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </div>
  )
}
