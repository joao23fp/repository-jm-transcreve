import { redirect } from 'next/navigation'
import { getAuthUserId } from '@/lib/auth-local'
import { getWalletWithStats } from '@/app/billing/billing.service'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const PLANS = [
  { id: 'plan_99',  name: 'Starter', price: 'R$ 49',  minutes: 99,  features: ['Transcrição até 1h por arquivo', 'Identificação de falantes', 'Exportar TXT'] },
  { id: 'plan_199', name: 'Pro',     price: 'R$ 89',  minutes: 199, features: ['Transcrição ilimitada', 'Identificação de até 10 falantes', 'Exportar TXT, PDF, DOCX', 'Análise de contradições'], popular: true },
  { id: 'plan_499', name: 'Business',price: 'R$ 199', minutes: 499, features: ['Tudo do Pro', 'Biblioteca de prompts', 'Prompts personalizados', 'Suporte prioritário'] },
]

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
      <AppLayout>
        <div className="flex items-center justify-center h-full py-24">
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-3">Carteira não encontrada.</p>
            <Button asChild className="btn-primary-gradient">
              <Link href="/uploads">Fazer primeiro upload</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const hasMore = transactionsRaw.length > 20
  const transactions = hasMore ? transactionsRaw.slice(0, 20) : transactionsRaw
  const serialized = transactions.map((t) => ({ ...t, type: t.type as any, createdAt: t.createdAt.toISOString() }))
  const pct = wallet.saldoTotal > 0 ? Math.round((wallet.saldoDisponivel / wallet.saldoTotal) * 100) : 0

  return (
    <AppLayout>
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Créditos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie seu saldo e veja o histórico de uso.</p>
        </div>

        {/* Saldo card */}
        <div className="rounded-2xl border border-border overflow-hidden mb-8"
          style={{ background: 'radial-gradient(ellipse 100% 80% at 70% 50%, rgba(0,212,170,0.08) 0%, transparent 70%), var(--card)' }}>
          <div className="px-8 py-7 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Saldo atual</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                  {wallet.saldoDisponivel.toFixed(0)}
                </span>
                <span className="text-lg text-muted-foreground">minutos</span>
              </div>
              {wallet.saldoBloqueado > 0 && (
                <p className="text-sm text-amber-400">{wallet.saldoBloqueado.toFixed(0)} min em processamento</p>
              )}
              <div className="mt-4 w-48 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: 'linear-gradient(90deg, #00d4aa 0%, #00b4d8 100%)',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{pct}% do saldo disponível</p>
            </div>
          </div>
        </div>

        {/* Plans */}
        <h2 className="text-lg font-semibold mb-4">Escolha seu plano</h2>
        <div className="grid grid-cols-3 gap-4 mb-10">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className="relative rounded-xl border p-5 flex flex-col"
              style={{
                background: plan.popular ? 'radial-gradient(ellipse at top, rgba(0,212,170,0.08), transparent)' : 'var(--card)',
                borderColor: plan.popular ? 'rgba(0,212,170,0.4)' : 'var(--border)',
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold text-black"
                  style={{ background: 'linear-gradient(90deg, #00d4aa, #00b4d8)' }}>
                  Mais popular
                </div>
              )}
              <p className="text-sm font-semibold mb-1">{plan.name}</p>
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/pacote</span>
              </div>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--primary)' }}>{plan.minutes} minutos</p>
              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span style={{ color: 'var(--primary)' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Button
                className={plan.popular ? 'btn-primary-gradient w-full' : 'w-full'}
                variant={plan.popular ? 'default' : 'outline'}
              >
                Comprar
              </Button>
            </div>
          ))}
        </div>

        {/* Transaction history */}
        <DashboardClient
          wallet={wallet}
          transactions={serialized}
          hasMore={hasMore}
          userId={userId}
        />
      </div>
    </AppLayout>
  )
}
