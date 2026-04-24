import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth-local'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { BibliotecaClient } from './BibliotecaClient'

export default async function ResultadosPage() {
  const userId = await getAuthUserId()
  if (!userId) redirect('/uploads')

  const jobs = await prisma.processingJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      fileName: true,
      currentStage: true,
      createdAt: true,
      actualMinutesConsumed: true,
      estimatedMinutes: true,
      completedAt: true,
      errorMessage: true,
      promptId: true,
    },
  })

  const serialized = jobs.map(j => ({
    ...j,
    currentStage: j.currentStage as string,
    createdAt: j.createdAt.toISOString(),
    completedAt: j.completedAt?.toISOString() ?? null,
    actualMinutesConsumed: j.actualMinutesConsumed ?? null,
  }))

  return (
    <AppLayout>
      <BibliotecaClient jobs={serialized} />
    </AppLayout>
  )
}
