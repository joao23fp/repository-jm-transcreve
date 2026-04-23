import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { logLgpdAccess } from '@/lib/lgpd-logger'
import { createClip, listClips, ClipDuracaoError } from '@/app/clips/clips.service'

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fileId = req.nextUrl.searchParams.get('fileId')
  if (!fileId) return NextResponse.json({ error: 'fileId obrigatório' }, { status: 400 })

  const clips = await listClips(userId, fileId)
  logLgpdAccess({ userId, action: 'ACCESS', resourceType: 'VideoClip', resourceId: fileId, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
  return NextResponse.json(clips)
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { fileId, name, startMs, endMs, transcriptText } = body

  if (!fileId || !name || startMs == null || endMs == null || !transcriptText)
    return NextResponse.json({ error: 'fileId, name, startMs, endMs e transcriptText são obrigatórios' }, { status: 400 })
  if (typeof name !== 'string' || name.length > 255)
    return NextResponse.json({ error: 'Nome máx. 255 caracteres' }, { status: 400 })

  try {
    const clip = await createClip(userId, fileId, name, startMs, endMs, transcriptText)
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'VideoClip', resourceId: clip.id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json({ clipId: clip.id, status: clip.status }, { status: 201 })
  } catch (err) {
    if (err instanceof ClipDuracaoError)
      return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
