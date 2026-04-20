'use client'

import type { UploadFile } from './FileUploadZone'

type Props = {
  files: UploadFile[]
  saldoDisponivel: number
  saldoBloqueado: number
}

export function CreditPreview({ files, saldoDisponivel, saldoBloqueado }: Props) {
  const validFiles = files.filter((f) => !f.error)
  const totalMinutes = validFiles.reduce((s, f) => s + f.estimatedMinutes, 0)
  const deficit = totalMinutes - saldoDisponivel

  if (!validFiles.length) return null

  return (
    <div style={{
      border: '0.5px solid var(--ta-border-subtle)',
      borderRadius: 8,
      padding: '1rem',
      background: 'var(--ta-bg-secondary)',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        {validFiles.map((f) => (
          <div key={f.file.name} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ta-text-secondary)' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
              {f.file.name}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 12 }}>{f.estimatedMinutes} min</span>
          </div>
        ))}
      </div>

      <div style={{
        borderTop: '0.5px solid var(--ta-border-subtle)',
        paddingTop: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--ta-text-primary)' }}>
          <span>Total estimado</span>
          <span>{totalMinutes} min</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ta-text-secondary)' }}>
          <span>Saldo disponível</span>
          <span>{saldoDisponivel} min</span>
        </div>
        {saldoBloqueado > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ta-text-secondary)', fontSize: 12 }}>
            <span>Bloqueado em outros uploads</span>
            <span>{saldoBloqueado} min</span>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 10,
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        background: deficit > 0 ? '#fef2f2' : 'var(--ta-bg-info)',
        color: deficit > 0 ? '#dc2626' : 'var(--ta-text-info)',
        border: `0.5px solid ${deficit > 0 ? '#fecaca' : 'var(--ta-border-info)'}`,
      }}>
        {deficit > 0
          ? `⚠ Déficit de ${deficit} min — remova arquivos ou recarregue seu saldo`
          : `✓ Saldo suficiente · ${saldoDisponivel - totalMinutes} min restantes após upload`}
      </div>
    </div>
  )
}
