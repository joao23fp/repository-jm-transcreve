'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Clock, FileAudio, FileVideo, Mic } from 'lucide-react'
import { usePathname } from 'next/navigation'
import TranscriptPanel from './TranscriptPanel'
import ChatPanel from './ChatPanel'
import ContradictionsPanel from './ContradictionsPanel'
import VideoPlayer from './VideoPlayer'
import { cn } from '@/lib/utils'

type Segment = {
  id: string
  sequenceIndex: number
  startMs: number
  endMs: number
  speakerId: string | null
  speakerName: string | null
  text: string
  lastEditedAt: string | null
  wordTimestamps: { word: string; startMs: number; endMs: number }[]
}

type Speaker = { id: string; displayName: string; isRenamed: boolean; suggestedTag: string }

type Props = {
  jobId: string
  fileName: string
  mimeType: string
  isAudio: boolean
  videoUrl: string | null
  segments: Segment[]
  speakers: Speaker[]
  transcriptText: string | null
  isCompleted: boolean
  fileExpiresAt: string | null
}

const MIN_TOP = 140
const MAX_TOP = 580
const DEFAULT_TOP = 260

export default function ViewerLayout({
  jobId, fileName, isAudio, videoUrl,
  segments, speakers, transcriptText, isCompleted, fileExpiresAt,
}: Props) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null) as React.MutableRefObject<HTMLVideoElement | HTMLAudioElement | null>
  const [currentMs, setCurrentMs] = useState(0)
  const [topHeight, setTopHeight] = useState(DEFAULT_TOP)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ startY: 0, startH: 0 })

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startH: topHeight }
    setDragging(true)
    e.preventDefault()
  }, [topHeight])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - dragRef.current.startY
      setTopHeight(Math.max(MIN_TOP, Math.min(MAX_TOP, dragRef.current.startH + delta)))
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  const lastEditedAt = segments.reduce<string | null>((max, s) => {
    if (!s.lastEditedAt) return max
    if (!max) return s.lastEditedAt
    return s.lastEditedAt > max ? s.lastEditedAt : max
  }, null)

  function seekToMs(ms: number) {
    if (mediaRef.current) mediaRef.current.currentTime = ms / 1000
  }

  const durationMs = segments.length > 0 ? Math.max(...segments.map(s => s.endMs)) : 0
  const durationLabel = durationMs > 0 ? formatDuration(durationMs) : null
  const FileIcon = isAudio ? FileAudio : FileVideo

  return (
    <div className={cn('flex h-screen overflow-hidden', dragging && 'select-none cursor-row-resize')}
      style={{ background: 'var(--background)' }}>

      {/* ── Sidebar mínima ── */}
      <aside className="w-[188px] shrink-0 flex flex-col border-r border-border/50 h-full"
        style={{ background: 'var(--sidebar)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border/30">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #e8e8ed 0%, #aeaeb2 100%)' }}>
            <Mic className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm font-semibold tracking-tight truncate">TranscreveAdv</span>
        </div>

        {/* Arquivo atual */}
        <div className="flex-1 px-3 py-4 overflow-hidden">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3 px-2">
            Transcrição atual
          </p>
          <div className="rounded-lg px-3 py-2.5 border border-border/50 bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              <FileIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
              <span className="text-xs font-medium truncate" style={{ color: 'var(--primary)' }}>
                {fileName}
              </span>
            </div>
            {durationLabel && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <Clock className="w-3 h-3" />
                {durationLabel}
              </div>
            )}
          </div>

          <Link
            href="/resultados"
            className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Voltar para biblioteca
          </Link>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top: player + transcrição ── */}
        <div className="flex shrink-0 overflow-hidden border-b border-border/50" style={{ height: topHeight }}>

          {/* Player */}
          <div className="flex-none w-1/2 flex items-center justify-center border-r border-border/50"
            style={{ background: '#050709' }}>
            {videoUrl ? (
              <VideoPlayer
                fileUrl={videoUrl}
                isAudio={isAudio}
                onTimeUpdate={setCurrentMs}
                mediaRef={mediaRef}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {isCompleted ? 'Arquivo de mídia não disponível.' : 'Processando…'}
              </p>
            )}
          </div>

          {/* Transcrição */}
          <div className="flex-1 overflow-hidden" style={{ background: 'var(--card)' }}>
            <TranscriptPanel
              jobId={jobId}
              segments={segments}
              speakers={speakers}
              currentMs={currentMs}
              onSegmentClick={seekToMs}
              fallbackText={transcriptText}
            />
          </div>
        </div>

        {/* ── Divisor arrastável ── */}
        <div
          onMouseDown={onDividerMouseDown}
          className={cn(
            'h-2 shrink-0 flex items-center justify-center cursor-row-resize transition-colors z-10',
            'border-t border-b border-border/30',
            dragging ? 'bg-primary/10' : 'bg-background hover:bg-muted/30'
          )}
        >
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <span key={i} className={cn(
                'w-0.5 h-0.5 rounded-full transition-colors',
                dragging ? 'bg-primary' : 'bg-border'
              )} />
            ))}
          </div>
        </div>

        {/* ── Bottom: chat + contradições ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Chat */}
          <div className="flex-1 overflow-hidden border-r border-border/50 flex flex-col"
            style={{ background: 'var(--card)' }}>
            <ChatPanel
              jobId={jobId}
              lastEditedAt={lastEditedAt}
              onCitationClick={seekToMs}
            />
          </div>

          {/* Contradições */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--card)' }}>
            <ContradictionsPanel jobId={jobId} onSeek={seekToMs} />
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${pad(m % 60)}m`
  return `${m}:${pad(totalSec % 60)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
