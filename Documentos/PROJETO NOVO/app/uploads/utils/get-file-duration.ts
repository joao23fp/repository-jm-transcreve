'use client'

const BYTES_PER_SECOND_MP3_128KBPS = 16_000

export async function getFileDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const media = file.type.startsWith('video/')
      ? document.createElement('video')
      : document.createElement('audio')

    media.preload = 'metadata'
    media.src = url

    media.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      const duration = media.duration
      if (!isFinite(duration) || duration <= 0) {
        resolve(estimateBySize(file))
      } else {
        resolve(duration)
      }
    }

    media.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(estimateBySize(file))
    }
  })
}

function estimateBySize(file: File): number {
  return file.size / BYTES_PER_SECOND_MP3_128KBPS
}
