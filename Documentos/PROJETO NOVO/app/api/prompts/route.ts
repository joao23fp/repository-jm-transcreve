import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { logLgpdAccess } from '@/lib/lgpd-logger'
import {
  listPrompts, createPrompt,
  NomeDuplicadoError, LimitePomptError,
} from '@/app/biblioteca/prompts.service'
import { TipoPrompt } from '@/lib/enums'

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') as TipoPrompt | null
  const folderId = searchParams.has('folderId')
    ? searchParams.get('folderId')
    : undefined

  const prompts = await listPrompts(userId, {
    ...(type && { type }),
    ...(folderId !== undefined && { folderId }),
  })

  logLgpdAccess({ userId, action: 'ACCESS', resourceType: 'PromptTemplate', resourceId: userId, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
  return NextResponse.json(prompts)
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, body: promptBody, description, folderId } = body

  if (!name || typeof name !== 'string' || name.length > 255)
    return NextResponse.json({ error: 'Nome obrigatório (máx. 255 caracteres)' }, { status: 400 })
  if (!promptBody || typeof promptBody !== 'string' || promptBody.length > 2000)
    return NextResponse.json({ error: 'Corpo do prompt obrigatório (máx. 2000 caracteres)' }, { status: 400 })
  if (description && description.length > 500)
    return NextResponse.json({ error: 'Descrição máx. 500 caracteres' }, { status: 400 })

  try {
    const prompt = await createPrompt(userId, { name, body: promptBody, description, folderId })
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'PromptTemplate', resourceId: prompt.id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(prompt, { status: 201 })
  } catch (err) {
    if (err instanceof NomeDuplicadoError)
      return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof LimitePomptError)
      return NextResponse.json({ error: err.message }, { status: 429 })
    throw err
  }
}
