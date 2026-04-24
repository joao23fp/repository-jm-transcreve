import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUserId } from '@/lib/auth-local'
import { getWalletWithStats } from '@/app/billing/billing.service'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Mic } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Carteira não encontrada.</p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/uploads">Fazer primeiro upload</Link>
          </Button>
        </div>
      </div>
    )
  }

  const hasMore = transactionsRaw.length > 20
  const transactions = hasMore ? transactionsRaw.slice(0, 20) : transactionsRaw
  const serialized = transactions.map((t) => ({ ...t, type: t.type as any, createdAt: t.createdAt.toISOString() }))

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">TranscreveAdv</span>
            <span className="text-border mx-1">/</span>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              Créditos
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/uploads"><ArrowLeft className="w-4 h-4 mr-1.5" />Uploads</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">Dashboard de Créditos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Saldo, histórico de transações e compra de créditos
          </p>
        </div>
        <Separator className="mb-6" />
        <DashboardClient
          wallet={wallet}
          transactions={serialized}
          hasMore={hasMore}
          userId={userId}
        />
      </main>
    </div>
  )
}
