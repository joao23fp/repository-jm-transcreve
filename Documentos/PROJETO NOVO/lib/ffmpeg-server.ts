import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export async function cutVideoClip(
  inputPath: string,
  outputPath: string,
  startMs: number,
  endMs: number
): Promise<void> {
  const startSec = startMs / 1000
  const durationSec = (endMs - startMs) / 1000

  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSec)
      .setDuration(durationSec)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-preset fast',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}

export async function extractThumbnail(
  inputPath: string,
  outputPath: string,
  seekMs: number
): Promise<void> {
  const seekSec = seekMs / 1000

  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(seekSec)
      .frames(1)
      .outputOptions(['-q:v 3'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}
