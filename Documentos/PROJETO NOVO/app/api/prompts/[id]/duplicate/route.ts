import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { duplicatePrompt, PromptNotFoundError, NomeDuplicadoError, LimitePomptError } from '@/app/biblioteca/prompts.service'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const folderId: string | undefined = body.folderId

  try {
    const prompt = await duplicatePrompt(userId, id, folderId)
    return NextResponse.json(prompt, { status: 201 })
  } catch (err) {
    if (err instanceof PromptNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof NomeDuplicadoError)
      return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof LimitePomptError)
      return NextResponse.json({ error: err.message }, { status: 429 })
    throw err
  }
}
