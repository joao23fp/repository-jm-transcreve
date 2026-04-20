import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { logLgpdAccess } from '@/lib/lgpd-logger'

export async function DELETE(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? undefined

  const uploads = await prisma.fileUpload.findMany({
    where: { userId },
    select: { storagePath: true },
  })

  if (uploads.length > 0) {
    const supabase = createSupabaseServiceClient()
    const paths = uploads.map((u: any) => u.storagePath as string)
    await supabase.storage.from('transcribeadv-uploads').remove(paths)
  }

  await prisma.$transaction([
    prisma.creditReservation.deleteMany({ where: { userId } }),
    prisma.fileUpload.deleteMany({ where: { userId } }),
    prisma.processingJob.deleteMany({ where: { userId } }),
    prisma.wallet.delete({ where: { userId } }),
  ])

  await logLgpdAccess({
    userId,
    action: 'DELETE',
    resourceType: 'user_data',
    resourceId: userId,
    ipAddress: ip,
  })

  return NextResponse.json({ deleted: true })
}
