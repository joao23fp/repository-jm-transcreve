'use client'

type WalletCardProps = {
  saldoTotal: number
  saldoBloqueado: number
  saldoDisponivel: number
  onBuyClick: () => void
}

export function WalletCard({ saldoTotal, saldoBloqueado, saldoDisponivel, onBuyClick }: WalletCardProps) {
  const pct = saldoTotal > 0 ? saldoDisponivel / saldoTotal : 1
  const color = pct <= 0.05 ? 'var(--red, #f87171)' : pct <= 0.20 ? 'var(--amber)' : 'var(--green)'
  const label = pct <= 0.05 ? 'Saldo crítico' : pct <= 0.20 ? 'Saldo baixo' : 'Saldo disponível'

  return (
    <div className="ta-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            {label}
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, color, lineHeight: 1 }}>
            {saldoDisponivel.toFixed(1)}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-2)', marginLeft: '0.5rem' }}>min</span>
          </p>
          {saldoBloqueado > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--amber)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>⏳</span> {saldoBloqueado.toFixed(1)} min bloqueados (em processamento)
            </p>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Total</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>{saldoTotal.toFixed(1)} min</p>
          {saldoTotal > 0 && (
            <div style={{ marginTop: '0.5rem', height: '4px', width: '80px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, pct * 100)}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onBuyClick}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '0.6rem 1.25rem',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
        onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'var(--accent)' }}
      >
        Comprar Créditos
      </button>
    </div>
  )
}
