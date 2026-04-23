import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { logLgpdAccess } from '@/lib/lgpd-logger'
import {
  getPrompt, updatePrompt, deletePrompt,
  PromptNotFoundError, PromptImutavelError, NomeDuplicadoError,
} from '@/app/biblioteca/prompts.service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const prompt = await getPrompt(userId, id)
    logLgpdAccess({ userId, action: 'ACCESS', resourceType: 'PromptTemplate', resourceId: id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(prompt)
  } catch (err) {
    if (err instanceof PromptNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    throw err
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, body: promptBody, description, folderId } = body

  if (name !== undefined && (typeof name !== 'string' || name.length > 255))
    return NextResponse.json({ error: 'Nome máx. 255 caracteres' }, { status: 400 })
  if (promptBody !== undefined && (typeof promptBody !== 'string' || promptBody.length > 2000))
    return NextResponse.json({ error: 'Corpo máx. 2000 caracteres' }, { status: 400 })
  if (description !== undefined && description !== null && description.length > 500)
    return NextResponse.json({ error: 'Descrição máx. 500 caracteres' }, { status: 400 })

  try {
    const prompt = await updatePrompt(userId, id, { name, body: promptBody, description, folderId })
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'PromptTemplate', resourceId: id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(prompt)
  } catch (err) {
    if (err instanceof PromptNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof PromptImutavelError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof NomeDuplicadoError)
      return NextResponse.json({ error: err.message }, { status: 409 })
    throw err
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await deletePrompt(userId, id)
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'PromptTemplate', resourceId: id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof PromptNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof PromptImutavelError)
      return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }
}
