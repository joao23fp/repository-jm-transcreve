import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { UploadClient } from './UploadClient'
import Link from 'next/link'

export default async function UploadsPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/sign-in')

  const wallet = await prisma.wallet.findUnique({ where: { userId } })
  const saldoInicial = {
    saldoDisponivel: (wallet?.saldoTotal ?? 0) - (wallet?.saldoBloqueado ?? 0),
    saldoBloqueado: wallet?.saldoBloqueado ?? 0,
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ta-text-primary)' }}>
          Enviar Arquivos
        </h1>
        <Link href="/resultados" style={{ fontSize: 13, color: 'var(--ta-text-info)', textDecoration: 'none', fontWeight: 500 }}>
          Ver transcrições →
        </Link>
      </div>
      <UploadClient userId={userId} saldoInicial={saldoInicial} />
    </main>
  )
}
