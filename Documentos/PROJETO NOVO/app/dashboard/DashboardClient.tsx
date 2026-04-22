'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { WalletCard } from './components/WalletCard'
import { UsageChart } from './components/UsageChart'
import { TransactionHistory } from './components/TransactionHistory'
import { PurchaseModal } from './components/PurchaseModal'
import { TipoTransacao } from '@/lib/enums'

type Wallet = {
  saldoTotal: number
  saldoBloqueado: number
  saldoDisponivel: number
  usageLast30Days: { date: string; minutesConsumed: number }[]
  pendingPaymentIntent: { id: string; planLabel: string; createdAt: string | Date; expiresAt: string | Date } | null
}

type Transaction = {
  id: string
  type: TipoTransacao
  amountMinutes: number
  balanceAfter: number
  description: string | null
  createdAt: string | Date
}

type Props = {
  wallet: Wallet
  transactions: Transaction[]
  hasMore: boolean
  userId: string
}

export function DashboardClient({ wallet: initialWallet, transactions: initialTransactions, hasMore: initialHasMore, userId }: Props) {
  const [wallet, setWallet] = useState(initialWallet)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [paymentBanner, setPaymentBanner] = useState<{ status: string; label: string } | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchParams = useSearchParams()

  // Supabase Realtime: subscribe to wallet updates
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || supabaseUrl.includes('[YOUR-') || !supabaseKey || supabaseKey.includes('[YOUR-')) return

    let channel: any
    import('@supabase/supabase-js').then(({ createClient }) => {
      const supabase = createClient(supabaseUrl, supabaseKey)
      channel = supabase
        .channel(`wallet:${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Wallet', filter: `userId=eq.${userId}` }, (payload: any) => {
          const w = payload.new
          setWallet((prev) => ({
            ...prev,
            saldoTotal: w.saldoTotal,
            saldoBloqueado: w.saldoBloqueado,
            saldoDisponivel: w.saldoTotal - w.saldoBloqueado,
          }))
        })
        .subscribe()
    })

    return () => { channel?.unsubscribe() }
  }, [userId])

  // Polling after checkout return
  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }, [])

  useEffect(() => {
    const paymentId = searchParams.get('payment')
    if (!paymentId) return

    setPaymentBanner({ status: 'PENDING', label: 'Pagamento em Processamento — Aguardando confirmação' })

    pollingRef.current = setInterval(async () => {
      const res = await fetch(`/api/billing/payment-intents/${paymentId}`)
      if (!res.ok) { stopPolling(); return }
      const data = await res.json()

      if (data.status === 'SUCCEEDED') {
        stopPolling()
        setPaymentBanner(null)
        const walletRes = await fetch('/api/billing/wallet')
        if (walletRes.ok) setWallet(await walletRes.json())
      } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
        stopPolling()
        setPaymentBanner({ status: data.status, label: 'Pagamento não confirmado. Tente novamente.' })
      }
    }, 3000)

    return stopPolling
  }, [searchParams, stopPolling])

  const handleLoadMore = useCallback(async () => {
    const lastId = transactions[transactions.length - 1]?.id
    if (!lastId) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/billing/transactions?cursor=${lastId}&limit=20`)
      if (!res.ok) return
      const data = await res.json()
      setTransactions((prev) => [...prev, ...data.items])
      setHasMore(!!data.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }, [transactions])

  const bannerColor = paymentBanner?.status === 'PENDING' ? 'var(--amber-bg)' : 'rgba(248,113,113,0.15)'
  const bannerBorder = paymentBanner?.status === 'PENDING' ? 'var(--amber-border)' : 'rgba(248,113,113,0.4)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {paymentBanner && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: bannerColor, border: `1px solid ${bannerBorder}`, fontSize: '0.875rem', color: 'var(--text)' }}>
          {paymentBanner.label}
        </div>
      )}

      <WalletCard
        saldoTotal={wallet.saldoTotal}
        saldoBloqueado={wallet.saldoBloqueado}
        saldoDisponivel={wallet.saldoDisponivel}
        onBuyClick={() => setPurchaseModalOpen(true)}
      />

      <UsageChart data={wallet.usageLast30Days} />

      <TransactionHistory
        transactions={transactions}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loadingMore}
      />

      <PurchaseModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onCheckoutRedirect={(url) => { window.location.href = url }}
      />
    </div>
  )
}
