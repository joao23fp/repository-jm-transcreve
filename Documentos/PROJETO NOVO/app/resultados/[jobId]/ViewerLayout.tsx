'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Clock } from 'lucide-react'
import TranscriptPanel from './TranscriptPanel'
import ChatPanel from './ChatPanel'
import ContradictionsPanel from './ContradictionsPanel'
import VideoPlayer from './VideoPlayer'
// Módulo 003 (clipes) — integração pausada, retomar depois
// import { ClipSelectionMenu, type SelectionData } from '@/app/clips/components/ClipSelectionMenu'
// import { ClipNameModal } from '@/app/clips/components/ClipNameModal'
// import { ClipGallery } from '@/app/clips/components/ClipGallery'

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

const MIN_TOP = 120
const MAX_TOP = 560
const DEFAULT_TOP = 240

export default function ViewerLayout({
  jobId, fileName, isAudio, videoUrl,
  segments, speakers, transcriptText, isCompleted, fileExpiresAt,
}: Props) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null) as React.MutableRefObject<HTMLVideoElement | HTMLAudioElement | null>
  const [currentMs, setCurrentMs] = useState(0)
  const [topHeight, setTopHeight] = useState(DEFAULT_TOP)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ startY: 0, startH: 0 })
  // const [activeTab, setActiveTab] = useState<'chat' | 'clips'>('chat')
  // const [clipSelection, setClipSelection] = useState<SelectionData | null>(null)
  // const [clipModalOpen, setClipModalOpen] = useState(false)
  // const [lastCreatedClipId, setLastCreatedClipId] = useState<string | null>(null)
  // const fileExpired = fileExpiresAt ? new Date(fileExpiresAt) < new Date() : false

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startH: topHeight }
    setDragging(true)
    e.preventDefault()
  }, [topHeight])

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      const delta = e.clientY - dragRef.current.startY
      setTopHeight(Math.max(MIN_TOP, Math.min(MAX_TOP, dragRef.current.startH + delta)))
    }
    function onUp() { setDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)',
      userSelect: dragging ? 'none' : undefined,
      cursor: dragging ? 'row-resize' : undefined,
    }}>

      {/* ── Header ── */}
      <header className="flex items-center gap-2 px-3 h-11 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0">
        <Link href="/resultados" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-1.5 py-1 rounded hover:bg-muted">
          <ChevronLeft className="w-3.5 h-3.5" />
          Transcrições
        </Link>
        <span className="text-border">·</span>
        <span className="flex-1 min-w-0 text-xs font-medium truncate font-mono tracking-tight">
          {fileName}
        </span>
        {durationLabel && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/50 rounded px-2 py-0.5 font-mono tabular-nums shrink-0">
            <Clock className="w-3 h-3" />
            {durationLabel}
          </span>
        )}
      </header>

      {/* ── Top: player + transcript (resizable) ── */}
      <div style={{ display: 'flex', flexShrink: 0, height: topHeight, overflow: 'hidden' }}>

        {/* Player column */}
        <div style={{
          flex: '0 0 50%', background: '#000', padding: 10,
          borderRight: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {videoUrl ? (
            <VideoPlayer
              fileUrl={videoUrl}
              isAudio={isAudio}
              onTimeUpdate={setCurrentMs}
              mediaRef={mediaRef}
            />
          ) : (
            <div style={{ fontSize: 12, color: '#4a4a4a', textAlign: 'center' }}>
              {isCompleted ? 'Arquivo de mídia não disponível.' : 'Processando...'}
            </div>
          )}
        </div>

        {/* Transcript column */}
        <div style={{ flex: 1, overflow: 'hidden', background: 'var(--surface)', position: 'relative' }}>
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

      {/* ── Draggable divider ── */}
      <div
        onMouseDown={onDividerMouseDown}
        style={{
          height: 8, flexShrink: 0, cursor: 'row-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dragging ? 'var(--surface-2)' : 'var(--bg)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          transition: 'background .1s',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 3 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: dragging ? 'var(--text-3)' : 'var(--border-3)',
              transition: 'background .1s',
            }} />
          ))}
        </div>
      </div>

      {/* ── Bottom: tabs (chat / clipes) + contradictions ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--surface)' }}>

        {/* Chat */}
        <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <ChatPanel jobId={jobId} lastEditedAt={lastEditedAt} onCitationClick={seekToMs} />
        </div>

        {/* Contradictions */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ContradictionsPanel jobId={jobId} onSeek={seekToMs} />
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
