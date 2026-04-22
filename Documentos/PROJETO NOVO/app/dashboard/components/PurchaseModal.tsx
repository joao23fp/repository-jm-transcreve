'use client'

import { useState } from 'react'

const PLANS = [
  { id: 'plan_99',  label: '99 minutos',  price: 'R$ 49,90',  minutes: 99 },
  { id: 'plan_199', label: '199 minutos', price: 'R$ 89,90',  minutes: 199 },
  { id: 'plan_499', label: '499 minutos', price: 'R$ 189,90', minutes: 499 },
]

type PurchaseModalProps = {
  open: boolean
  onClose: () => void
  onCheckoutRedirect: (url: string) => void
}

export function PurchaseModal({ open, onClose, onCheckoutRedirect }: PurchaseModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingIntent, setPendingIntent] = useState<{ checkoutUrl: string; label: string } | null>(null)

  if (!open) return null

  async function handlePay() {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch('/api/billing/payment-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected }),
      })
      const data = await res.json()

      if (res.status === 409) {
        setPendingIntent({ checkoutUrl: data.checkoutUrl, label: data.planLabel })
        return
      }
      if (!res.ok) {
        alert(data.message ?? 'Erro ao iniciar pagamento')
        return
      }
      onCheckoutRedirect(data.checkoutUrl)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ta-card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>Comprar Créditos</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {pendingIntent ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--amber)', fontSize: '0.875rem' }}>
              Você já tem um pagamento pendente: <strong>{pendingIntent.label}</strong>
            </p>
            <button
              onClick={() => onCheckoutRedirect(pendingIntent.checkoutUrl)}
              style={{ padding: '0.6rem 1.25rem', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              Retomar Pagamento
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelected(plan.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    border: `2px solid ${selected === plan.id ? 'var(--accent)' : 'var(--border-2)'}`,
                    borderRadius: '8px',
                    background: selected === plan.id ? 'var(--accent-bg)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>{plan.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                      ≈ {plan.minutes} min de processamento
                    </p>
                  </div>
                  <p style={{ fontWeight: 700, color: selected === plan.id ? 'var(--accent)' : 'var(--text-2)', fontSize: '1rem' }}>
                    {plan.price}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handlePay}
              disabled={!selected || loading}
              style={{
                padding: '0.7rem',
                background: !selected || loading ? 'var(--surface-hover)' : 'var(--accent)',
                border: 'none',
                borderRadius: '6px',
                color: !selected || loading ? 'var(--text-3)' : '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: !selected || loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Redirecionando...' : 'Pagar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
