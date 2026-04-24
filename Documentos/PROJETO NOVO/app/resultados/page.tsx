import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { redirect } from 'next/navigation'
import { EtapaProcessamento } from '@/lib/enums'
import Link from 'next/link'
import { CopyButton } from './CopyButton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, FileVideo, FileAudio, AlertCircle, ArrowRight, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function ResultadosPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/uploads')

  const jobs = await prisma.processingJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const completedCount = jobs.filter(j => j.currentStage === EtapaProcessamento.COMPLETED).length

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">TranscreveAdv</span>
          </div>
          <Button size="sm" asChild>
            <Link href="/uploads"><Plus className="w-4 h-4 mr-1.5" />Novo upload</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Transcrições</h1>
            <p className="text-muted-foreground text-xs mt-0.5 tabular-nums">
              {jobs.length} {jobs.length === 1 ? 'arquivo' : 'arquivos'}
              {completedCount > 0 && ` · ${completedCount} concluído${completedCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <Separator className="mb-6" />

        {jobs.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileVideo className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhuma transcrição ainda.</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/uploads">Enviar primeiro arquivo</Link>
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {jobs.map((job) => {
            const isCompleted = job.currentStage === EtapaProcessamento.COMPLETED
            const isFailed    = job.currentStage === EtapaProcessamento.FAILED
            const isAudio     = /\.(mp3|wav|m4a|ogg)$/i.test(job.fileName)
            const badge       = getBadge(job.currentStage)

            return (
              <div key={job.id} className="rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-border/80">
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border",
                    isFailed ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted border-border text-muted-foreground"
                  )}>
                    {isFailed ? <AlertCircle className="w-4 h-4" /> : isAudio ? <FileAudio className="w-4 h-4" /> : <FileVideo className="w-4 h-4" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.fileName}</p>
                    <p className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5">
                      {new Date(job.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      }).replace(',', ' ·')}
                    </p>
                  </div>

                  {/* Badge + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-xs gap-1.5", badge.className)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", badge.dotClass)} />
                      {badge.label}
                    </Badge>
                    {isCompleted && <CopyButton jobId={job.id} />}
                  </div>
                </div>

                {/* Footer completed */}
                {isCompleted && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono tabular-nums">
                      <span>{job.actualMinutesConsumed ?? job.estimatedMinutes} min</span>
                      {job.completedAt && (
                        <>
                          <span className="w-px h-3 bg-border" />
                          <span>{Math.round((new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000)}s</span>
                        </>
                      )}
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/resultados/${job.id}`}>
                        Ver transcrição <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Footer error */}
                {isFailed && job.errorMessage && (
                  <div className="flex items-center gap-2 px-4 py-2 border-t border-destructive/20 bg-destructive/5 text-destructive text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {job.errorMessage}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function getBadge(stage: string) {
  switch (stage) {
    case EtapaProcessamento.COMPLETED:
      return { label: 'Concluído',    className: 'border-green-500/30 text-green-400 bg-green-500/10',   dotClass: 'bg-green-400' }
    case EtapaProcessamento.FAILED:
      return { label: 'Erro',         className: 'border-red-500/30 text-red-400 bg-red-500/10',         dotClass: 'bg-red-400' }
    case EtapaProcessamento.TRANSCRIBING:
      return { label: 'Transcrevendo', className: 'border-primary/30 text-primary bg-primary/10',        dotClass: 'bg-primary ta-dot-pulse' }
    case EtapaProcessamento.ANALYZING:
      return { label: 'Analisando',   className: 'border-primary/30 text-primary bg-primary/10',         dotClass: 'bg-primary ta-dot-pulse' }
    case EtapaProcessamento.UPLOADING:
      return { label: 'Enviando',     className: 'border-primary/30 text-primary bg-primary/10',         dotClass: 'bg-primary ta-dot-pulse' }
    default:
      return { label: 'Na fila',      className: 'border-border text-muted-foreground',                  dotClass: 'bg-muted-foreground' }
  }
}
