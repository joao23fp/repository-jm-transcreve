'use client'

import type { UploadFile } from './FileUploadZone'

type Props = {
  files: UploadFile[]
  saldoDisponivel: number
  loading: boolean
  onConfirm: () => void
  onClear: () => void
}

export function UploadConfirmButton({ files, saldoDisponivel, loading, onConfirm, onClear }: Props) {
  const validFiles = files.filter((f) => !f.error)
  const totalMinutes = validFiles.reduce((s, f) => s + f.estimatedMinutes, 0)
  const hasDeficit = totalMinutes > saldoDisponivel
  const disabled = !validFiles.length || hasDeficit || loading

  const btnBase: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '0.5px solid var(--ta-border-light)',
  }

  return (
    <div style={{ display: 'flex', gap: 12, marginTop: '0.5rem' }}>
      <button
        onClick={onConfirm}
        disabled={disabled}
        style={{
          ...btnBase,
          flex: 1,
          background: disabled ? 'var(--ta-bg-tertiary)' : 'var(--ta-bg-info)',
          color: disabled ? 'var(--ta-text-secondary)' : 'var(--ta-text-info)',
          borderColor: disabled ? 'var(--ta-border-light)' : 'var(--ta-border-info)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled && !loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Enviando...' : (
          <>
            {hasDeficit ? 'Saldo insuficiente' : 'Confirmar upload'}
            {!hasDeficit && (
              <span style={{
                display: 'inline-block',
                fontSize: 12,
                padding: '3px 9px',
                background: 'rgba(24, 95, 165, 0.12)',
                color: 'var(--ta-text-info)',
                borderRadius: 6,
                marginLeft: 8,
                fontWeight: 500,
              }}>
                {totalMinutes} min
              </span>
            )}
          </>
        )}
      </button>

      {files.length > 0 && !loading && (
        <button
          onClick={onClear}
          style={{
            ...btnBase,
            background: 'var(--ta-bg-primary)',
            color: 'var(--ta-text-secondary)',
          }}
        >
          Limpar
        </button>
      )}
    </div>
  )
}
