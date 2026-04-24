'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EtapaProcessamento } from '@/lib/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileVideo, FileAudio, AlertCircle, ArrowRight, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type Job = {
  id: string
  fileName: string
  currentStage: string
  createdAt: string
  actualMinutesConsumed: number | null
  estimatedMinutes: number
  completedAt: string | null
  errorMessage: string | null
  promptId: string | null
}

export function BibliotecaClient({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const STATUS_OPTIONS = [
    { label: 'Concluídos', value: EtapaProcessamento.COMPLETED },
    { label: 'Processando', value: EtapaProcessamento.TRANSCRIBING },
    { label: 'Na fila', value: EtapaProcessamento.QUEUED },
    { label: 'Falharam', value: EtapaProcessamento.FAILED },
  ]

  const toggleStatus = (v: string) =>
    setStatusFilter(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.fileName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter.length || statusFilter.includes(j.currentStage)
    return matchSearch && matchStatus
  })

  async function handleDelete(job: Job) {
    const label = job.currentStage === EtapaProcessamento.COMPLETED
      ? 'Deseja remover este arquivo permanentemente? A transcrição e todos os dados associados serão excluídos. Esta ação não pode ser desfeita.'
      : 'Deseja cancelar e remover este arquivo? O job será cancelado e os créditos bloqueados serão estornados.'

    if (!confirm(label)) return

    setDeletingId(job.id)
    try {
      await fetch(`/api/uploads/jobs/${job.id}`, { method: 'DELETE' })
      setJobs(prev => prev.filter(j => j.id !== job.id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
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
          <Link href="/uploads">+ Novo upload</Link>
        </Button>
      </div>

      {/* Filtros */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              className="pl-9 bg-card border-border"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter([])}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                !statusFilter.length
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >Todos</button>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleStatus(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  statusFilter.includes(opt.value)
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >{opt.label}</button>
            ))}
            {(search || statusFilter.length > 0) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter([]) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
              >Limpar filtros</button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-24">
          <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
            <FileVideo className="w-6 h-6 text-muted-foreground" />
          </div>
          {jobs.length === 0 ? (
            <>
              <p className="font-medium mb-1">Nenhuma transcrição ainda</p>
              <p className="text-muted-foreground text-sm mb-5">Envie seu primeiro arquivo de áudio ou vídeo</p>
              <Button className="btn-primary-gradient" asChild>
                <Link href="/uploads">Enviar arquivo</Link>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum arquivo corresponde aos filtros.</p>
          )}
        </div>
      )}

      {/* Job list */}
      <div className="flex flex-col gap-2">
        {filtered.map((job) => {
          const isCompleted = job.currentStage === EtapaProcessamento.COMPLETED
          const isFailed    = job.currentStage === EtapaProcessamento.FAILED
          const isAudio     = /\.(mp3|wav|m4a|ogg)$/i.test(job.fileName)
          const badge       = getBadge(job.currentStage)
          const isDeleting  = deletingId === job.id

          return (
            <div key={job.id}
              className={cn('rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-border/80', isDeleting && 'opacity-50')}>
              <div className="flex items-center gap-3 px-5 py-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                  isFailed
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : "bg-muted border-border/50 text-muted-foreground"
                )}>
                  {isFailed ? <AlertCircle className="w-4 h-4" /> : isAudio ? <FileAudio className="w-4 h-4" /> : <FileVideo className="w-4 h-4" />}
                </div>

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

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", badge.className)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", badge.dotClass)} />
                    {badge.label}
                  </span>
                  {isCompleted && (
                    <Button size="sm" variant="ghost" asChild className="h-8">
                      <Link href={`/resultados/${job.id}`}>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  )}
                  {/* Botão excluir — disponível para qualquer status */}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isDeleting}
                    onClick={() => handleDelete(job)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {isFailed && job.errorMessage && (
                <div className="flex items-center gap-2 px-5 py-2.5 border-t border-destructive/20 bg-destructive/5 text-destructive text-xs rounded-b-2xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {job.errorMessage}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getBadge(stage: string) {
  switch (stage) {
    case EtapaProcessamento.COMPLETED:
      return { label: 'Concluído',   className: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', dotClass: 'bg-emerald-400' }
    case EtapaProcessamento.FAILED:
      return { label: 'Falhou',      className: 'border-red-500/30 text-red-400 bg-red-500/10',            dotClass: 'bg-red-400' }
    case EtapaProcessamento.TRANSCRIBING:
      return { label: 'Processando', className: 'border-sky-500/30 text-sky-400 bg-sky-500/10',             dotClass: 'bg-sky-400 ta-dot-pulse' }
    case EtapaProcessamento.ANALYZING:
      return { label: 'Analisando',  className: 'border-violet-500/30 text-violet-400 bg-violet-500/10',    dotClass: 'bg-violet-400 ta-dot-pulse' }
    case EtapaProcessamento.UPLOADING:
      return { label: 'Enviando',    className: 'border-sky-500/30 text-sky-400 bg-sky-500/10',             dotClass: 'bg-sky-400 ta-dot-pulse' }
    default:
      return { label: 'Na fila',     className: 'border-border text-muted-foreground bg-muted/50',          dotClass: 'bg-muted-foreground' }
  }
}
