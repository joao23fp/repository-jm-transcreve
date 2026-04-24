'use client'

import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
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
      className="w-full flex flex-col items-center justify-center gap-4 transition-all duration-200"
      style={{
        border: `1.5px dashed ${dragging ? 'var(--primary)' : 'var(--border-2)'}`,
        borderRadius: '16px',
        padding: '3.5rem 2rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragging ? 'var(--accent-bg)' : 'var(--card)',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !dragging)
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-3)'
      }}
      onMouseLeave={(e) => {
        if (!dragging)
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-2)'
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

      {/* Ícone */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <UploadCloud className="w-6 h-6" style={{ color: 'var(--primary)' }} />
      </div>

      {/* Texto principal */}
      <div className="text-center">
        <p className="text-sm font-semibold mb-1">
          Arraste seus arquivos aqui
        </p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          ou <span className="underline underline-offset-2" style={{ color: 'var(--primary)' }}>clique para selecionar</span>
        </p>
      </div>

      {/* Formatos */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {['MP3', 'WAV', 'M4A', 'OGG', 'MP4', 'MOV', 'MKV'].map((fmt) => (
          <span key={fmt} className="px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
            {fmt}
          </span>
        ))}
      </div>

      <p className="text-[11px]" style={{ color: 'var(--text-4)' }}>
        Máx. 2 GB · 4h por arquivo · até {MAX_ARQUIVOS_SIMULTANEOS} arquivos simultâneos
      </p>
    </div>
  )
}
