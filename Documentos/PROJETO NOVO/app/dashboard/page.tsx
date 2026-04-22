import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUserId } from '@/lib/auth-local'
import { getWalletWithStats } from '@/app/billing/billing.service'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/uploads')

  const [wallet, transactionsRaw] = await Promise.all([
    getWalletWithStats(userId).catch(() => null),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 21,
      select: { id: true, type: true, amountMinutes: true, balanceAfter: true, description: true, createdAt: true },
    }),
  ])

  if (!wallet) {
    return (
      <main style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-3)' }}>Carteira não encontrada. Faça um upload primeiro para ativar o saldo.</p>
      </main>
    )
  }

  const hasMore = transactionsRaw.length > 20
  const transactions = hasMore ? transactionsRaw.slice(0, 20) : transactionsRaw

  const serialized = transactions.map((t) => ({ ...t, type: t.type as any, createdAt: t.createdAt.toISOString() }))

  return (
    <main style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>
          Dashboard de Créditos
        </h1>
        <Link href="/uploads" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
          ← Enviar arquivos
        </Link>
      </div>
      <DashboardClient
        wallet={wallet}
        transactions={serialized}
        hasMore={hasMore}
        userId={userId}
      />
    </main>
  )
}
