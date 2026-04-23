import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { logLgpdAccess } from '@/lib/lgpd-logger'
import { renameFolder, deleteFolder } from '@/app/biblioteca/prompts.service'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name } = await req.json()

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  try {
    const folder = await renameFolder(userId, id, name.trim())
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'PromptFolder', resourceId: id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(folder)
  } catch {
    return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const result = await deleteFolder(userId, id)
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'PromptFolder', resourceId: id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json({ ok: true, deletedPrompts: result.deletedPrompts })
  } catch {
    return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 })
  }
}
