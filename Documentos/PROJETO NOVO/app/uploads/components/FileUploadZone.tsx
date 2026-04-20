'use client'

import { useRef, useState } from 'react'
import { getFileDuration } from '@/app/uploads/utils/get-file-duration'
import {
  MIME_TYPES_ACEITOS,
  EXTENSOES_ACEITAS,
  LIMITE_TAMANHO_BYTES,
  LIMITE_DURACAO_SEGUNDOS,
  MAX_ARQUIVOS_SIMULTANEOS,
} from '@/lib/enums'

export type UploadFile = {
  file: File
  durationSeconds: number
  estimatedMinutes: number
  error?: string
}

type Props = {
  onFilesSelected: (files: UploadFile[]) => void
  disabled?: boolean
}

export function FileUploadZone({ onFilesSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  async function processFiles(rawFiles: FileList | null) {
    if (!rawFiles) return
    const files = Array.from(rawFiles).slice(0, MAX_ARQUIVOS_SIMULTANEOS)

    const processed = await Promise.all(
      files.map(async (file): Promise<UploadFile> => {
        if (!MIME_TYPES_ACEITOS.includes(file.type)) {
          return { file, durationSeconds: 0, estimatedMinutes: 0, error: `Formato não suportado: ${file.name}` }
        }
        if (file.size > LIMITE_TAMANHO_BYTES) {
          return { file, durationSeconds: 0, estimatedMinutes: 0, error: `Arquivo excede 2 GB: ${file.name}` }
        }
        const durationSeconds = await getFileDuration(file)
        if (durationSeconds > LIMITE_DURACAO_SEGUNDOS) {
          return { file, durationSeconds, estimatedMinutes: 0, error: `Duração excede 4 horas: ${file.name}` }
        }
        return { file, durationSeconds, estimatedMinutes: Math.ceil(durationSeconds / 60) }
      })
    )
    onFilesSelected(processed)
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) processFiles(e.dataTransfer.files) }}
      style={{
        border: `1.5px dashed ${dragging ? 'var(--ta-border-info)' : 'var(--ta-border-light)'}`,
        borderRadius: '12px',
        padding: '3rem 2rem',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        background: dragging ? 'var(--ta-bg-info)' : 'var(--ta-bg-secondary)',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !dragging)
          (e.currentTarget as HTMLDivElement).style.background = 'var(--ta-bg-tertiary)'
      }}
      onMouseLeave={(e) => {
        if (!dragging)
          (e.currentTarget as HTMLDivElement).style.background = 'var(--ta-bg-secondary)'
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={EXTENSOES_ACEITAS.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => processFiles(e.target.files)}
      />
      <span style={{ fontSize: 40, display: 'block', marginBottom: '0.75rem' }}>📁</span>
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ta-text-primary)', margin: '0.25rem 0' }}>
        Arraste arquivos aqui ou{' '}
        <strong style={{ fontWeight: 600 }}>clique para selecionar</strong>
      </p>
      <p style={{ fontSize: 13, color: 'var(--ta-text-secondary)', marginTop: '0.5rem' }}>
        MP4, MKV, MOV, AVI, MP3, WAV, M4A, OGG · máx. 2 GB / 4h · até 5 arquivos
      </p>
    </div>
  )
}
