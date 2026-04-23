import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { logLgpdAccess } from '@/lib/lgpd-logger'
import { getClip, deleteClip, ClipNotFoundError } from '@/app/clips/clips.service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const clip = await getClip(userId, id)
    logLgpdAccess({ userId, action: 'ACCESS', resourceType: 'VideoClip', resourceId: id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(clip)
  } catch (err) {
    if (err instanceof ClipNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    throw err
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await deleteClip(userId, id)
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'VideoClip', resourceId: id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ClipNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    throw err
  }
}
