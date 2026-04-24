'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileUploadZone, type UploadFile } from './components/FileUploadZone'
import { FileList, type JobStatus } from './components/FileList'
import { CreditPreview } from './components/CreditPreview'
import { UploadConfirmButton } from './components/UploadConfirmButton'
import { requestPresignedUrl, confirmUpload, getJobStatuses } from './uploads.actions'
import { ContextPromptSelector } from './components/ContextPromptSelector'
import { EtapaProcessamento } from '@/lib/enums'

const ACTIVE_STAGES = new Set([
  EtapaProcessamento.QUEUED,
  EtapaProcessamento.TRANSCRIBING,
  EtapaProcessamento.ANALYZING,
])

type Props = {
  userId: string
  saldoInicial: { saldoDisponivel: number; saldoBloqueado: number }
}

export function UploadClient({ userId, saldoInicial }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([])
  const [wallet, setWallet] = useState(saldoInicial)
  const [loading, setLoading] = useState(false)
  const [promptId, setPromptId] = useState<string | null>(null)
  const router = useRouter()
  // Guarda promptId no momento do envio para passar para o viewer
  const promptIdAtSubmitRef = useRef<string | null>(null)

  const handleStatusUpdate = useCallback(
    (jobId: string, stage: EtapaProcessamento, errorMessage?: string | null) => {
      setJobStatuses((prev) =>
        prev.map((s) => (s.jobId === jobId ? { ...s, stage, errorMessage } : s))
      )
    },
    []
  )

  // Polling fallback when Supabase Realtime is not available
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const activeJobs = jobStatuses.filter((s) => ACTIVE_STAGES.has(s.stage))
    if (!activeJobs.length) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    if (pollingRef.current) return // already polling

    pollingRef.current = setInterval(async () => {
      const ids = jobStatuses.map((s) => s.jobId)
      const updates = await getJobStatuses(ids)

      setJobStatuses((prev) => {
        const next = prev.map((s) => {
          const u = updates.find((x: any) => x.jobId === s.jobId)
          if (!u) return s
          return { ...s, stage: u.currentStage as EtapaProcessamento, errorMessage: u.errorMessage }
        })

        // FR-012: auto-navegar quando único job conclui
        const justCompleted = next.find(
          (s) => s.stage === EtapaProcessamento.COMPLETED &&
            prev.find(p => p.jobId === s.jobId)?.stage !== EtapaProcessamento.COMPLETED
        )
        if (justCompleted && next.filter(s => ACTIVE_STAGES.has(s.stage)).length === 0) {
          const params = promptIdAtSubmitRef.current
            ? `?autoChat=1&promptId=${promptIdAtSubmitRef.current}`
            : '?autoChat=1'
          router.push(`/resultados/${justCompleted.jobId}${params}`)
        }

        return next
      })
    }, 3000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [jobStatuses, router])

  async function handleConfirm() {
    const valid = files.filter((f) => !f.error)
    if (!valid.length) return
    setLoading(true)
    promptIdAtSubmitRef.current = promptId

    try {
      const res = await requestPresignedUrl(
        valid.map((f) => ({
          fileName: f.file.name,
          fileSizeBytes: f.file.size,
          mimeType: f.file.type,
          durationSeconds: f.durationSeconds,
        })),
        promptId ?? undefined
      )

      if (res.error) {
        alert(res.message ?? 'Erro ao iniciar upload')
        return
      }

      setWallet(res.walletSnapshot)
      const initialStatuses: JobStatus[] = res.jobs.map((j: any, i: number) => ({
        jobId: j.jobId,
        fileName: valid[i].file.name,
        fileSize: valid[i].file.size,
        uploadProgress: 0,
        stage: EtapaProcessamento.UPLOADING,
      }))
      setJobStatuses((prev) => [...prev, ...initialStatuses])
      setFiles([])

      await Promise.all(
        res.jobs.map(async (j: any, i: number) => {
          try {
            await uploadWithProgress(valid[i].file, j.uploadUrl, j.jobId, (pct) => {
              setJobStatuses((prev) =>
                prev.map((s) => (s.jobId === j.jobId ? { ...s, uploadProgress: pct } : s))
              )
            })
            const confirmRes = await confirmUpload(j.jobId)
            if (confirmRes?.error) {
              throw new Error(confirmRes.message ?? 'Erro ao confirmar upload')
            }
            setJobStatuses((prev) =>
              prev.map((s) =>
                s.jobId === j.jobId ? { ...s, stage: EtapaProcessamento.QUEUED, uploadProgress: 100 } : s
              )
            )
          } catch (err: any) {
            setJobStatuses((prev) =>
              prev.map((s) =>
                s.jobId === j.jobId
                  ? { ...s, stage: EtapaProcessamento.FAILED, errorMessage: err.message }
                  : s
              )
            )
          }
        })
      )
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <FileUploadZone onFilesSelected={setFiles} disabled={loading} />
      <ContextPromptSelector
        selectedPromptId={promptId}
        onChange={setPromptId}
        disabled={loading}
      />
      {files.length > 0 && (
        <CreditPreview
          files={files}
          saldoDisponivel={wallet.saldoDisponivel}
          saldoBloqueado={wallet.saldoBloqueado}
        />
      )}
      {jobStatuses.length > 0 && (
        <FileList
          jobStatuses={jobStatuses}
          userId={userId}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
      {files.length > 0 && (
        <UploadConfirmButton
          files={files}
          saldoDisponivel={wallet.saldoDisponivel}
          loading={loading}
          onConfirm={handleConfirm}
          onClear={() => { setFiles([]); setJobStatuses([]) }}
        />
      )}
    </div>
  )
}

async function uploadWithProgress(
  file: File,
  url: string,
  jobId: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload falhou: ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('Erro de rede durante upload'))
    xhr.send(file)
  })
}
