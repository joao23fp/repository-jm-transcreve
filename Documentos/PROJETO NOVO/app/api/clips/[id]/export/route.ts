import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth-local'
import { requestExport, ClipNotFoundError, ExportPendenteError } from '@/app/clips/clips.service'
import { FormatoExport } from '@/lib/enums'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { format } = await req.json()

  if (!Object.values(FormatoExport).includes(format))
    return NextResponse.json({ error: 'Formato inválido. Use VIDEO, PDF ou WORD' }, { status: 400 })

  try {
    const job = await requestExport(userId, id, format as FormatoExport)
    return NextResponse.json({ exportJobId: job.id, status: job.status }, { status: 201 })
  } catch (err) {
    if (err instanceof ClipNotFoundError)
      return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof ExportPendenteError)
      return NextResponse.json({ error: err.message }, { status: 409 })
    throw err
  }
}
