import { prisma } from '@/lib/prisma'

type LgpdAction = 'ACCESS' | 'EXPORT' | 'DELETE' | 'UPDATE'

export async function logLgpdAccess(params: {
  userId: string
  action: LgpdAction
  resourceType: string
  resourceId: string
  ipAddress?: string
}) {
  await prisma.lgpdLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress ?? null,
      createdAt: new Date(),
    },
  })
}
