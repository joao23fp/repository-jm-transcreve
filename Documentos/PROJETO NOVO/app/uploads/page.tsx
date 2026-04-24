import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { UploadClient } from './UploadClient'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CreditCard, BookOpen, FileText, Mic } from 'lucide-react'

export default async function UploadsPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/sign-in')

  const wallet = await prisma.wallet.findUnique({ where: { userId } })
  const saldoInicial = {
    saldoDisponivel: (wallet?.saldoTotal ?? 0) - (wallet?.saldoBloqueado ?? 0),
    saldoBloqueado: wallet?.saldoBloqueado ?? 0,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">TranscreveAdv</span>
          </div>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard"><CreditCard className="w-4 h-4 mr-1.5" />Créditos</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/biblioteca"><BookOpen className="w-4 h-4 mr-1.5" />Biblioteca</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/resultados"><FileText className="w-4 h-4 mr-1.5" />Transcrições</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Enviar Arquivos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envie áudio ou vídeo para transcrição e análise jurídica com IA
          </p>
        </div>
        <Separator className="mb-8" />
        <UploadClient userId={userId} saldoInicial={saldoInicial} />
      </main>
    </div>
  )
}
