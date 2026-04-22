'use client'

// Stub — implementado na Phase 4 (T017)
export function PurchaseModal({ open, onClose, onCheckoutRedirect: _onCheckoutRedirect }: {
  open: boolean
  onClose: () => void
  onCheckoutRedirect: (url: string) => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="ta-card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-2)' }}>Modal de compra em desenvolvimento…</p>
        <button onClick={onClose} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--surface-hover)', border: '1px solid var(--border-2)', borderRadius: '6px', color: 'var(--text)', cursor: 'pointer' }}>
          Fechar
        </button>
      </div>
    </div>
  )
}
