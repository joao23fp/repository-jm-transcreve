import { getAuthUserId } from '@/lib/auth-local'
import { prisma } from '@/lib/prisma'
import { Sidebar } from './Sidebar'

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getAuthUserId()
  let saldoDisponivel = 0
  let saldoTotal = 0

  if (userId) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    saldoTotal = wallet?.saldoTotal ?? 0
    saldoDisponivel = saldoTotal - (wallet?.saldoBloqueado ?? 0)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar saldoDisponivel={saldoDisponivel} saldoTotal={saldoTotal} />
      <main className="flex-1 ml-[188px] min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
