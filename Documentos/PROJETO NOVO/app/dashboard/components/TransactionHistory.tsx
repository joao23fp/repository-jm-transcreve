'use client'

import { TipoTransacao } from '@/lib/enums'

type Transaction = {
  id: string
  type: TipoTransacao
  amountMinutes: number
  balanceAfter: number
  description: string | null
  createdAt: string | Date
}

type TransactionHistoryProps = {
  transactions: Transaction[]
  onLoadMore: () => void
  hasMore: boolean
  loading?: boolean
}

const TYPE_CONFIG: Record<TipoTransacao, { icon: string; color: string; sign: string }> = {
  [TipoTransacao.COMPRA]:   { icon: '💳', color: 'var(--green)',         sign: '+' },
  [TipoTransacao.ESTORNO]:  { icon: '↩️',  color: 'var(--green)',         sign: '+' },
  [TipoTransacao.BLOQUEIO]: { icon: '⏳', color: 'var(--amber)',         sign: '−' },
  [TipoTransacao.CONSUMO]:  { icon: '🎙️', color: 'var(--red, #f87171)', sign: '−' },
}

export function TransactionHistory({ transactions, onLoadMore, hasMore, loading }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="ta-card" style={{ padding: '1.25rem 1.5rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          Histórico de Transações
        </p>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>
          Nenhuma transação ainda
        </p>
      </div>
    )
  }

  return (
    <div className="ta-card" style={{ padding: '1.25rem 1.5rem' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
        Histórico de Transações
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {transactions.map((t) => {
          const cfg = TYPE_CONFIG[t.type]
          const date = new Date(t.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.description ?? t.type}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>{date}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: cfg.color }}>
                  {cfg.sign}{Math.abs(t.amountMinutes).toFixed(1)} min
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                  saldo: {t.balanceAfter.toFixed(1)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.5rem',
            background: 'transparent',
            border: '1px solid var(--border-2)',
            borderRadius: '6px',
            color: 'var(--text-2)',
            fontSize: '0.85rem',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'border-color 0.15s',
          }}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  )
}
