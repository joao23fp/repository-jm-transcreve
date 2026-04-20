import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { redirect } from 'next/navigation'
import { EtapaProcessamento } from '@/lib/enums'
import Link from 'next/link'
import { CopyButton } from './CopyButton'

const VideoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="m10 9 5 3-5 3z" fill="currentColor" />
  </svg>
)

const AudioIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
)

const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="6" y1="1" x2="6" y2="11" /><line x1="1" y1="6" x2="11" y2="6" />
  </svg>
)

const BackIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7.5 2 2 6 7.5 10" />
  </svg>
)

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
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: '1.75rem', paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)' }}>
            Transcrições
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
            {jobs.length} {jobs.length === 1 ? 'arquivo' : 'arquivos'}
            {completedCount > 0 && ` · ${completedCount} ${completedCount === 1 ? 'concluído' : 'concluídos'}`}
          </p>
        </div>
        <Link href="/uploads" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500, color: 'var(--text)',
          padding: '0 12px', height: 30, borderRadius: 6,
          border: '1px solid var(--border-3)', background: 'var(--surface-2)',
          transition: 'background .15s, border-color .15s',
        }}>
          <PlusIcon />
          Novo upload
        </Link>
      </div>

      {/* ── Empty state ── */}
      {jobs.length === 0 && (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', marginTop: '4rem', fontSize: 14 }}>
          Nenhuma transcrição ainda.{' '}
          <Link href="/uploads" style={{ color: 'var(--accent)' }}>Enviar arquivo</Link>
        </p>
      )}

      {/* ── Job list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {jobs.map((job) => {
          const isCompleted = job.currentStage === EtapaProcessamento.COMPLETED
          const isFailed    = job.currentStage === EtapaProcessamento.FAILED
          const isAudio     = /\.(mp3|wav|m4a|ogg)$/i.test(job.fileName)

          const badge = getBadge(job.currentStage)

          return (
            <div key={job.id} className="ta-card">

              {/* Card main row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px',
                borderBottom: isCompleted || isFailed ? '1px solid var(--border)' : 'none',
              }}>
                {/* File icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                  background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isFailed ? 'var(--red)' : 'var(--text-3)',
                }}>
                  {isFailed ? <ErrorIcon /> : isAudio ? <AudioIcon /> : <VideoIcon />}
                </div>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}>
                    {job.fileName}
                  </span>
                  <span style={{
                    fontSize: 11, color: 'var(--text-3)',
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                  }}>
                    {new Date(job.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    }).replace(',', ' ·')}
                  </span>
                </div>

                {/* Right: badge + copy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 28, padding: '0 10px', borderRadius: 6,
                    fontSize: 11.5, fontWeight: 500, letterSpacing: '-0.005em',
                    background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: badge.color, flexShrink: 0,
                      ...(job.currentStage === EtapaProcessamento.COMPLETED
                        ? { boxShadow: '0 0 6px rgba(63,185,80,.6)' }
                        : {}),
                    }} className={
                      job.currentStage === EtapaProcessamento.TRANSCRIBING ||
                      job.currentStage === EtapaProcessamento.ANALYZING ||
                      job.currentStage === EtapaProcessamento.QUEUED
                        ? 'ta-dot-pulse' : ''
                    } />
                    {badge.label}
                  </span>

                  {isCompleted && <CopyButton jobId={job.id} />}
                </div>
              </div>

              {/* Footer — completed */}
              {isCompleted && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px', background: 'rgba(0,0,0,.2)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 11, color: 'var(--text-3)',
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                  }}>
                    <span>{job.actualMinutesConsumed ?? job.estimatedMinutes} min</span>
                    {job.completedAt && (
                      <>
                        <span style={{ width: 1, height: 10, background: 'var(--border-2)' }} />
                        <span>{Math.round(
                          (new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime()) / 1000
                        )}s</span>
                      </>
                    )}
                  </div>
                  <Link href={`/resultados/${job.id}`} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    height: 28, padding: '0 14px', borderRadius: 6,
                    fontSize: 12, fontWeight: 500, letterSpacing: '-0.005em',
                    background: 'var(--accent)', color: '#fff',
                    boxShadow: '0 0 0 1px rgba(79,140,255,.3)',
                    transition: 'background .15s',
                  }}>
                    Ver transcrição →
                  </Link>
                </div>
              )}

              {/* Footer — error */}
              {isFailed && job.errorMessage && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', fontSize: 11.5, color: 'var(--red)', lineHeight: 1.5,
                  background: 'rgba(248,81,73,.03)', borderTop: '1px solid var(--red-border)',
                }}>
                  <AlertIcon />
                  <span>{job.errorMessage}</span>
                </div>
              )}

            </div>
          )
        })}
      </div>
    </main>
  )
}

function getBadge(stage: string) {
  switch (stage) {
    case EtapaProcessamento.COMPLETED:
      return { label: 'Concluído',    bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)' }
    case EtapaProcessamento.FAILED:
      return { label: 'Erro',         bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-border)'   }
    case EtapaProcessamento.TRANSCRIBING:
      return { label: 'Transcrevendo', bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'var(--accent-border)' }
    case EtapaProcessamento.ANALYZING:
      return { label: 'Analisando',   bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'var(--accent-border)' }
    case EtapaProcessamento.UPLOADING:
      return { label: 'Enviando',     bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'var(--accent-border)' }
    default:
      return { label: 'Na fila',      bg: 'transparent',      color: 'var(--text-2)', border: 'var(--border-3)'     }
  }
}
