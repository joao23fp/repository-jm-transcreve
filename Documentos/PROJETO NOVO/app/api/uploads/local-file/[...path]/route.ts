import { NextRequest, NextResponse } from 'next/server'
import { localStorageSave, localStorageRead } from '@/lib/storage'
import path from 'path'

type Params = { params: Promise<{ path: string[] }> }

const MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  webm: 'video/webm',
}

function mimeForPath(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  return MIME_MAP[ext] ?? 'application/octet-stream'
}

// Browser PUTs the file directly here (same interface as Supabase presigned URL)
export async function PUT(req: NextRequest, { params }: Params) {
  const { path: segments } = await params
  const storagePath = segments.join('/')
  const arrayBuffer = await req.arrayBuffer()
  await localStorageSave(storagePath, Buffer.from(arrayBuffer))
  return new NextResponse(null, { status: 200 })
}

// Serves media files with Range Request support so the browser can seek videos
export async function GET(req: NextRequest, { params }: Params) {
  const { path: segments } = await params
  const storagePath = segments.join('/')

  let data: Buffer
  try {
    data = await localStorageRead(storagePath)
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const total = data.length
  const contentType = mimeForPath(storagePath)
  const rangeHeader = req.headers.get('range')

  if (!rangeHeader) {
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(total),
        'Accept-Ranges': 'bytes',
      },
    })
  }

  // Parse "bytes=start-end"
  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)
  if (!match) {
    return new NextResponse('Invalid Range', { status: 416 })
  }

  const start = match[1] ? parseInt(match[1], 10) : 0
  const end = match[2] ? parseInt(match[2], 10) : total - 1
  const chunkSize = end - start + 1

  if (start > end || end >= total) {
    return new NextResponse('Range Not Satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    })
  }

  const chunk = data.slice(start, end + 1)

  return new NextResponse(chunk, {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
    },
  })
}
