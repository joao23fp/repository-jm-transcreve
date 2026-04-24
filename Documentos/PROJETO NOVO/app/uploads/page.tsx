import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { UploadClient } from './UploadClient'
import { AppLayout } from '@/components/layout/AppLayout'

export default async function UploadsPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/sign-in')

  const wallet = await prisma.wallet.findUnique({ where: { userId } })
  const saldoInicial = {
    saldoDisponivel: (wallet?.saldoTotal ?? 0) - (wallet?.saldoBloqueado ?? 0),
    saldoBloqueado: wallet?.saldoBloqueado ?? 0,
  }

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        {/* Hero — sem branding de terceiros */}
        <div className="relative overflow-hidden px-8 pt-14 pb-8 text-center"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,232,237,0.06) 0%, transparent 70%)' }}>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Transcreva qualquer áudio ou vídeo em{' '}
            <span style={{ color: 'var(--primary)' }}>minutos</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Arraste seus arquivos abaixo ou clique para selecionar. Identificamos falantes e timestamps automaticamente.
          </p>
        </div>

        {/* Upload zone */}
        <div className="flex-1 px-8 pb-10">
          <UploadClient userId={userId} saldoInicial={saldoInicial} />
        </div>
      </div>
    </AppLayout>
  )
}
