'use client'

import { useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { UploadFile } from './FileUploadZone'
import { EtapaProcessamento } from '@/lib/enums'

export type JobStatus = {
  jobId: string
  fileName: string
  fileSize: number
  uploadProgress: number
  stage: EtapaProcessamento
  errorMessage?: string | null
}

const STAGE_LABEL: Record<EtapaProcessamento, string> = {
  [EtapaProcessamento.UPLOADING]: 'Enviando',
  [EtapaProcessamento.QUEUED]: 'Na fila',
  [EtapaProcessamento.TRANSCRIBING]: 'Transcrevendo',
  [EtapaProcessamento.ANALYZING]: 'Analisando',
  [EtapaProcessamento.COMPLETED]: 'Concluído',
  [EtapaProcessamento.FAILED]: 'Erro',
}

const STAGE_COLOR: Record<EtapaProcessamento, string> = {
  [EtapaProcessamento.UPLOADING]: 'var(--ta-text-info)',
  [EtapaProcessamento.QUEUED]: 'var(--ta-text-info)',
  [EtapaProcessamento.TRANSCRIBING]: 'var(--ta-text-info)',
  [EtapaProcessamento.ANALYZING]: 'var(--ta-text-info)',
  [EtapaProcessamento.COMPLETED]: '#16a34a',
  [EtapaProcessamento.FAILED]: '#dc2626',
}

type Props = {
  jobStatuses: JobStatus[]
  userId: string
  onStatusUpdate: (jobId: string, stage: EtapaProcessamento, errorMessage?: string | null) => void
}

function fileIcon(fileName: string) {
  return /\.(mp3|wav|m4a|ogg)$/i.test(fileName) ? '🎵' : '🎬'
}

function formatSize(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export function FileList({ jobStatuses, userId, onStatusUpdate }: Props) {
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabase = supabaseUrl && !supabaseUrl.includes('[YOUR-')
    if (!userId || !jobStatuses.length || !hasSupabase) return

    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`job-status:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ProcessingJob', filter: `userId=eq.${userId}` },
        (payload) => {
          const { id, currentStage, errorMessage } = payload.new as any
          onStatusUpdate(id, currentStage, errorMessage)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, jobStatuses.length, onStatusUpdate])

  if (!jobStatuses.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {jobStatuses.map((status) => {
        const stage = status.stage
        const hasError = stage === EtapaProcessamento.FAILED
        const stageColor = hasError ? '#dc2626' : STAGE_COLOR[stage]

        return (
          <div
            key={status.jobId}
            className="ta-slide-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--ta-bg-secondary)',
              border: '0.5px solid var(--ta-border-subtle)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(status.fileName)}</span>
              <span style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ta-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {status.fileName}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ta-text-secondary)', flexShrink: 0 }}>
                {formatSize(status.fileSize)}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 6,
                background: hasError ? '#fef2f2' : stage === EtapaProcessamento.COMPLETED ? '#f0fdf4' : 'var(--ta-bg-info)',
                color: stageColor,
                flexShrink: 0,
              }}>
                {STAGE_LABEL[stage]}
              </span>
            </div>

            {stage === EtapaProcessamento.UPLOADING && (
              <div style={{ width: '100%', height: 3, background: 'var(--ta-bg-tertiary)', borderRadius: 99 }}>
                <div style={{
                  height: 3,
                  borderRadius: 99,
                  background: 'var(--ta-text-info)',
                  width: `${status.uploadProgress}%`,
                  transition: 'width 0.2s ease',
                }} />
              </div>
            )}

            {status.errorMessage && (
              <p style={{ fontSize: 12, color: '#dc2626' }}>{status.errorMessage}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
