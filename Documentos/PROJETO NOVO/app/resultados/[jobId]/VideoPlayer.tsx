'use client'

import { memo, useRef, useEffect } from 'react'

type Props = {
  fileUrl: string
  isAudio: boolean
  onTimeUpdate: (currentMs: number) => void
  mediaRef: React.MutableRefObject<HTMLVideoElement | HTMLAudioElement | null>
}

function VideoPlayer({ fileUrl, isAudio, onTimeUpdate, mediaRef }: Props) {
  const internalRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)

  // Set src imperatively — never pass it as a JSX prop so React's reconciler
  // never re-assigns element.src, which resets currentTime in all browsers.
  useEffect(() => {
    if (internalRef.current) internalRef.current.src = fileUrl
  }, [fileUrl])

  useEffect(() => {
    mediaRef.current = internalRef.current
    return () => { mediaRef.current = null }
  }, [mediaRef])

  const handleTimeUpdate = () => {
    if (internalRef.current) onTimeUpdate(Math.round(internalRef.current.currentTime * 1000))
  }

  if (isAudio) {
    return (
      <audio
        ref={internalRef}
        controls
        onTimeUpdate={handleTimeUpdate}
        style={{ width: '100%' }}
      />
    )
  }

  return (
    <video
      ref={internalRef}
      controls
      onTimeUpdate={handleTimeUpdate}
      style={{ width: '100%', maxHeight: 220, borderRadius: 8, background: '#000', display: 'block' }}
    />
  )
}

// All props are stable references — memo prevents re-renders that would
// trigger React's reconciler and cause it to re-assign element.src.
export default memo(VideoPlayer)
