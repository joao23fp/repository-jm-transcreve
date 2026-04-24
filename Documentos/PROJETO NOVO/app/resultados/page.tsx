import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { redirect } from 'next/navigation'
import { EtapaProcessamento } from '@/lib/enums'
import Link from 'next/link'
import { CopyButton } from './CopyButton'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, FileVideo, FileAudio, AlertCircle, ArrowRight, Search } from 'lucide-react'
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
    <AppLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {jobs.length} {jobs.length === 1 ? 'arquivo enviado' : 'arquivos enviados'}
            </p>
          </div>
          <Button className="btn-primary-gradient" asChild>
            <Link href="/uploads"><Plus className="w-4 h-4 mr-1.5" />Novo upload</Link>
          </Button>
        </div>

        {/* Search + filters */}
        {jobs.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por título..." className="pl-9 bg-card border-border" />
            </div>
            <div className="flex items-center gap-1.5">
              {['Todos', 'Concluídos', 'Processando', 'Na fila', 'Falharam'].map((f) => (
                <button key={f}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    f === 'Todos'
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
              <FileVideo className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Nenhuma transcrição ainda</p>
            <p className="text-muted-foreground text-sm mb-5">Envie seu primeiro arquivo de áudio ou vídeo</p>
            <Button className="btn-primary-gradient" asChild>
              <Link href="/uploads">Enviar arquivo</Link>
            </Button>
          </div>
        )}

        {/* Job list */}
        <div className="flex flex-col gap-2">
          {jobs.map((job) => {
            const isCompleted = job.currentStage === EtapaProcessamento.COMPLETED
            const isFailed    = job.currentStage === EtapaProcessamento.FAILED
            const isAudio     = /\.(mp3|wav|m4a|ogg)$/i.test(job.fileName)
            const badge       = getBadge(job.currentStage)

            return (
              <div key={job.id} className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80 hover:bg-card/80">
                <div className="flex items-center gap-3 px-5 py-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    isFailed
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : "bg-muted border-border/50 text-muted-foreground"
                  )}>
                    {isFailed ? <AlertCircle className="w-4 h-4" /> : isAudio ? <FileAudio className="w-4 h-4" /> : <FileVideo className="w-4 h-4" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground font-mono tabular-nums">
                        {new Date(job.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {isCompleted && job.actualMinutesConsumed && (
                        <>
                          <span className="text-border">·</span>
                          <p className="text-xs text-muted-foreground">{job.actualMinutesConsumed} min</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badge + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", badge.className)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", badge.dotClass)} />
                      {badge.label}
                    </span>
                    {isCompleted && <CopyButton jobId={job.id} />}
                    {isCompleted && (
                      <Button size="sm" variant="ghost" asChild className="h-8">
                        <Link href={`/resultados/${job.id}`}>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Error footer */}
                {isFailed && job.errorMessage && (
                  <div className="flex items-center gap-2 px-5 py-2.5 border-t border-destructive/20 bg-destructive/5 text-destructive text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {job.errorMessage}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}

function getBadge(stage: string) {
  switch (stage) {
    case EtapaProcessamento.COMPLETED:
      return { label: 'Concluído',    className: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', dotClass: 'bg-emerald-400' }
    case EtapaProcessamento.FAILED:
      return { label: 'Falhou',       className: 'border-red-500/30 text-red-400 bg-red-500/10',            dotClass: 'bg-red-400' }
    case EtapaProcessamento.TRANSCRIBING:
      return { label: 'Processando',  className: 'border-blue-500/30 text-blue-400 bg-blue-500/10',          dotClass: 'bg-blue-400 ta-dot-pulse' }
    case EtapaProcessamento.ANALYZING:
      return { label: 'Analisando',   className: 'border-violet-500/30 text-violet-400 bg-violet-500/10',    dotClass: 'bg-violet-400 ta-dot-pulse' }
    case EtapaProcessamento.UPLOADING:
      return { label: 'Enviando',     className: 'border-sky-500/30 text-sky-400 bg-sky-500/10',             dotClass: 'bg-sky-400 ta-dot-pulse' }
    default:
      return { label: 'Na fila',      className: 'border-border text-muted-foreground bg-muted/50',          dotClass: 'bg-muted-foreground' }
  }
}
