import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { logLgpdAccess } from '@/lib/lgpd-logger'
import { listFolders, createFolder, NivelPastaError } from '@/app/biblioteca/prompts.service'

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folders = await listFolders(userId)
  logLgpdAccess({ userId, action: 'ACCESS', resourceType: 'PromptFolder', resourceId: userId, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
  return NextResponse.json(folders)
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, parentFolderId } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return NextResponse.json({ error: 'Nome da pasta obrigatório' }, { status: 400 })

  try {
    const folder = await createFolder(userId, name.trim(), parentFolderId)
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'PromptFolder', resourceId: folder.id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(folder, { status: 201 })
  } catch (err) {
    if (err instanceof NivelPastaError)
      return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
