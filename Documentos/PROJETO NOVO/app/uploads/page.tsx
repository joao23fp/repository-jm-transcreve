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
        {/* Hero */}
        <div className="relative overflow-hidden px-8 pt-16 pb-10 text-center"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,212,170,0.15) 0%, transparent 70%)' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Powered by Groq Whisper
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Transcreva qualquer áudio em{' '}
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
