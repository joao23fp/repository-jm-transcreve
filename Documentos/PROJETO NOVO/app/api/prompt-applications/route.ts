import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { logLgpdAccess } from '@/lib/lgpd-logger'
import { recordApplication, PromptNotFoundError } from '@/app/biblioteca/prompts.service'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { fileId, promptId } = body

  if (!fileId || !promptId)
    return NextResponse.json({ error: 'fileId e promptId obrigatórios' }, { status: 400 })

  // Valida que o job existe e pertence ao usuário
  const job = await prisma.processingJob.findFirst({ where: { id: fileId, userId } })
  if (!job)
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })

  try {
    const application = await recordApplication(userId, fileId, promptId)
    logLgpdAccess({ userId, action: 'UPDATE', resourceType: 'PromptApplication', resourceId: application.id, ipAddress: req.headers.get('x-forwarded-for') ?? undefined }).catch(() => null)
    return NextResponse.json(application, { status: 201 })
  } catch (err) {
    if (err instanceof PromptNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    throw err
  }
}
