import { prisma } from '@/lib/prisma'
import { TipoPrompt } from '@/lib/enums'

const MAX_PROMPTS_POR_USUARIO = 1000
const MAX_NIVEIS_PASTA = 3

export class PromptNotFoundError extends Error {
  constructor() { super('Prompt não encontrado'); this.name = 'PromptNotFoundError' }
}
export class PromptImutavelError extends Error {
  constructor() { super('Templates do sistema não podem ser editados'); this.name = 'PromptImutavelError' }
}
export class NomeDuplicadoError extends Error {
  constructor() { super('Já existe um prompt com este nome nesta pasta'); this.name = 'NomeDuplicadoError' }
}
export class LimitePomptError extends Error {
  constructor() { super('Limite de 1000 prompts atingido'); this.name = 'LimitePromptError' }
}
export class NivelPastaError extends Error {
  constructor() { super('Pastas só suportam até 3 níveis de aninhamento'); this.name = 'NivelPastaError' }
}

// ── Prompts ──────────────────────────────────────────────────────────────────

export async function listPrompts(
  userId: string,
  opts?: { folderId?: string | null; type?: TipoPrompt }
) {
  return prisma.promptTemplate.findMany({
    where: {
      isDeleted: false,
      ...(opts?.type
        ? { type: opts.type }
        : { OR: [{ userId: null }, { userId }] }),
      ...(opts?.folderId !== undefined ? { folderId: opts.folderId } : {}),
    },
    select: {
      id: true, userId: true, folderId: true, name: true,
      description: true, type: true, createdAt: true, updatedAt: true,
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
}

export async function getPrompt(userId: string, promptId: string) {
  const prompt = await prisma.promptTemplate.findFirst({
    where: {
      id: promptId,
      isDeleted: false,
      OR: [{ userId: null }, { userId }],
    },
  })
  if (!prompt) throw new PromptNotFoundError()
  return prompt
}

export async function createPrompt(
  userId: string,
  data: { name: string; body: string; description?: string; folderId?: string }
) {
  const count = await prisma.promptTemplate.count({
    where: { userId, isDeleted: false },
  })
  if (count >= MAX_PROMPTS_POR_USUARIO) throw new LimitePomptError()

  const existe = await prisma.promptTemplate.findFirst({
    where: {
      userId,
      folderId: data.folderId ?? null,
      name: data.name,
      isDeleted: false,
    },
  })
  if (existe) throw new NomeDuplicadoError()

  return prisma.promptTemplate.create({
    data: {
      userId,
      name: data.name,
      body: data.body,
      description: data.description ?? null,
      folderId: data.folderId ?? null,
      type: TipoPrompt.Usuario,
    },
  })
}

export async function updatePrompt(
  userId: string,
  promptId: string,
  data: { name?: string; body?: string; description?: string; folderId?: string | null }
) {
  const prompt = await prisma.promptTemplate.findFirst({
    where: { id: promptId, userId, isDeleted: false },
  })
  if (!prompt) throw new PromptNotFoundError()
  if (prompt.type === TipoPrompt.Sistema) throw new PromptImutavelError()

  if (data.name && data.name !== prompt.name) {
    const existe = await prisma.promptTemplate.findFirst({
      where: {
        userId,
        folderId: data.folderId !== undefined ? data.folderId : prompt.folderId,
        name: data.name,
        isDeleted: false,
        NOT: { id: promptId },
      },
    })
    if (existe) throw new NomeDuplicadoError()
  }

  return prisma.promptTemplate.update({
    where: { id: promptId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.folderId !== undefined && { folderId: data.folderId }),
    },
  })
}

export async function deletePrompt(userId: string, promptId: string) {
  const prompt = await prisma.promptTemplate.findFirst({
    where: { id: promptId, userId, isDeleted: false },
  })
  if (!prompt) throw new PromptNotFoundError()
  if (prompt.type === TipoPrompt.Sistema) throw new PromptImutavelError()

  await prisma.promptTemplate.update({
    where: { id: promptId },
    data: { isDeleted: true },
  })
}

export async function duplicatePrompt(
  userId: string,
  promptId: string,
  folderId?: string
) {
  const prompt = await prisma.promptTemplate.findFirst({
    where: {
      id: promptId,
      isDeleted: false,
      OR: [{ userId: null }, { userId }],
    },
  })
  if (!prompt) throw new PromptNotFoundError()

  const count = await prisma.promptTemplate.count({
    where: { userId, isDeleted: false },
  })
  if (count >= MAX_PROMPTS_POR_USUARIO) throw new LimitePomptError()

  const novoNome = `[Meu] ${prompt.name}`
  const targetFolderId = folderId ?? null

  const existe = await prisma.promptTemplate.findFirst({
    where: { userId, folderId: targetFolderId, name: novoNome, isDeleted: false },
  })
  if (existe) throw new NomeDuplicadoError()

  return prisma.promptTemplate.create({
    data: {
      userId,
      name: novoNome,
      description: prompt.description,
      body: prompt.body,
      folderId: targetFolderId,
      type: TipoPrompt.Usuario,
    },
  })
}

// ── Pastas ────────────────────────────────────────────────────────────────────

async function getFolderDepth(folderId: string): Promise<number> {
  let depth = 0
  let currentId: string | null = folderId
  while (currentId) {
    const folder = await prisma.promptFolder.findUnique({
      where: { id: currentId },
      select: { parentFolderId: true },
    })
    if (!folder) break
    currentId = folder.parentFolderId
    depth++
  }
  return depth
}

export async function createFolder(
  userId: string,
  name: string,
  parentFolderId?: string
) {
  if (parentFolderId) {
    const depth = await getFolderDepth(parentFolderId)
    if (depth >= MAX_NIVEIS_PASTA - 1) throw new NivelPastaError()
  }

  return prisma.promptFolder.create({
    data: { userId, name, parentFolderId: parentFolderId ?? null },
  })
}

export async function listFolders(userId: string) {
  const raiz = await prisma.promptFolder.findMany({
    where: { userId, parentFolderId: null },
    orderBy: { name: 'asc' },
  })

  const nivel1Ids = raiz.map((f) => f.id)
  const nivel1 = nivel1Ids.length
    ? await prisma.promptFolder.findMany({
        where: { userId, parentFolderId: { in: nivel1Ids } },
        orderBy: { name: 'asc' },
      })
    : []

  const nivel2Ids = nivel1.map((f) => f.id)
  const nivel2 = nivel2Ids.length
    ? await prisma.promptFolder.findMany({
        where: { userId, parentFolderId: { in: nivel2Ids } },
        orderBy: { name: 'asc' },
      })
    : []

  return { raiz, nivel1, nivel2 }
}

export async function renameFolder(userId: string, folderId: string, name: string) {
  const folder = await prisma.promptFolder.findFirst({ where: { id: folderId, userId } })
  if (!folder) throw new Error('Pasta não encontrada')
  return prisma.promptFolder.update({ where: { id: folderId }, data: { name } })
}

export async function deleteFolder(userId: string, folderId: string) {
  const folder = await prisma.promptFolder.findFirst({ where: { id: folderId, userId } })
  if (!folder) throw new Error('Pasta não encontrada')

  const subfolderIds = await getAllSubfolderIds(userId, folderId)
  const allFolderIds = [folderId, ...subfolderIds]

  const { count } = await prisma.promptTemplate.updateMany({
    where: { userId, folderId: { in: allFolderIds }, isDeleted: false },
    data: { isDeleted: true },
  })

  await prisma.promptFolder.deleteMany({
    where: { id: { in: allFolderIds } },
  })

  return { deletedPrompts: count }
}

async function getAllSubfolderIds(userId: string, parentId: string): Promise<string[]> {
  const children = await prisma.promptFolder.findMany({
    where: { userId, parentFolderId: parentId },
    select: { id: true },
  })
  const ids = children.map((c) => c.id)
  for (const id of ids) {
    const nested = await getAllSubfolderIds(userId, id)
    ids.push(...nested)
  }
  return ids
}

// ── Audit Trail ───────────────────────────────────────────────────────────────

export async function recordApplication(
  userId: string,
  fileId: string,
  promptId: string
) {
  return prisma.promptApplication.create({
    data: { userId, fileId, promptId },
  })
}
