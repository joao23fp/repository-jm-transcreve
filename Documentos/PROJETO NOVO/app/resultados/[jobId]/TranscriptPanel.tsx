'use client'

import { useState } from 'react'
import SpeakerManager from './SpeakerManager'

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
  segments: Segment[]
  speakers: Speaker[]
  currentMs: number
  onSegmentClick: (startMs: number) => void
  fallbackText: string | null
}

export default function TranscriptPanel({
  jobId, segments, speakers: initialSpeakers, currentMs, onSegmentClick, fallbackText,
}: Props) {
  const [speakerMap, setSpeakerMap] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    initialSpeakers.forEach((sp) => m.set(sp.id, sp.displayName))
    return m
  })
  const [speakers, setSpeakers] = useState(initialSpeakers)
  const [openManagerFor, setOpenManagerFor] = useState<string | null>(null)

  const activeSegment = segments.find((s) => s.startMs <= currentMs && currentMs < s.endMs)

  function handleSpeakerAssign(segmentId: string, speakerId: string, displayName: string) {
    setSpeakerMap((prev) => {
      const next = new Map(prev)
      next.set(speakerId, displayName)
      return next
    })
    setSpeakers((prev) => prev.map((sp) => sp.id === speakerId ? { ...sp, displayName } : sp))
    setOpenManagerFor(null)
  }

  if (segments.length === 0 && fallbackText) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: '10px 12px' }}>
        <p style={{ fontSize: 12, lineHeight: 1.75, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>
          {fallbackText}
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '6px 0' }}>
      {segments.map((seg) => {
        const isActive = seg.id === activeSegment?.id
        const speakerName = seg.speakerId ? speakerMap.get(seg.speakerId) ?? seg.speakerName : null

        return (
          <div key={seg.id} style={{ padding: '0 10px', marginBottom: 1 }}>
            <div
              className={`ta-seg${isActive ? ' ta-seg-active' : ''}`}
              style={{
                padding: '6px 9px',
                borderRadius: 8,
                borderLeft: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                background: isActive ? 'rgba(232,232,237,0.07)' : 'transparent',
              }}
            >
              {/* Segment header: speaker + timestamp */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3, position: 'relative' }}>
                {speakerName ? (
                  <button
                    onClick={() => setOpenManagerFor(openManagerFor === seg.id ? null : seg.id)}
                    style={{
                      fontSize: 10.5, fontWeight: 600, color: 'var(--text-2)',
                      letterSpacing: '-0.005em', background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0, lineHeight: 1,
                    }}
                  >
                    {speakerName}
                  </button>
                ) : (
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-4)' }}>—</span>
                )}
                <span style={{
                  fontSize: 10, color: 'var(--text-4)',
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  letterSpacing: 0,
                }}>
                  {formatMs(seg.startMs)}
                </span>

                {openManagerFor === seg.id && (
                  <SpeakerManager
                    jobId={jobId}
                    speakers={speakers}
                    currentSpeakerId={seg.speakerId}
                    onAssign={(spId, name) => handleSpeakerAssign(seg.id, spId, name)}
                    onClose={() => setOpenManagerFor(null)}
                  />
                )}
              </div>

              {/* Segment text — data attributes permitem ClipSelectionMenu calcular timestamps */}
              <p
                onClick={() => onSegmentClick(seg.startMs)}
                style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--text)', cursor: 'pointer' }}
              >
                <span
                  data-segment-id={seg.id}
                  data-start-ms={seg.startMs}
                  data-end-ms={seg.endMs}
                >
                  {seg.text}
                </span>
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}`
  return `${pad(m)}:${pad(s % 60)}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
