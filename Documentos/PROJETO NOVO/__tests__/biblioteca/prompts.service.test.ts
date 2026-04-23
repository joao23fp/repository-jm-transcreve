import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    promptTemplate: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    promptFolder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    promptApplication: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  getPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  duplicatePrompt,
  createFolder,
  recordApplication,
  PromptNotFoundError,
  PromptImutavelError,
  NomeDuplicadoError,
  LimitePomptError,
  NivelPastaError,
} from '@/app/biblioteca/prompts.service'
import { TipoPrompt } from '@/lib/enums'

const mockPrisma = prisma as any

beforeEach(() => vi.clearAllMocks())

// ── 1. Templates de sistema são imutáveis ─────────────────────────────────────

describe('imutabilidade de templates de sistema', () => {
  const sistemaPrompt = { id: 'sys_1', userId: null, type: TipoPrompt.Sistema, isDeleted: false, name: 'Resumo' }

  it('updatePrompt lança PromptImutavelError para template Sistema', async () => {
    mockPrisma.promptTemplate.findFirst.mockResolvedValue(sistemaPrompt)
    await expect(updatePrompt('user-1', 'sys_1', { name: 'Novo Nome' })).rejects.toThrow(PromptImutavelError)
  })

  it('deletePrompt lança PromptImutavelError para template Sistema', async () => {
    mockPrisma.promptTemplate.findFirst.mockResolvedValue(sistemaPrompt)
    await expect(deletePrompt('user-1', 'sys_1')).rejects.toThrow(PromptImutavelError)
  })

  it('getPrompt retorna template Sistema (userId=null) para qualquer usuário', async () => {
    mockPrisma.promptTemplate.findFirst.mockResolvedValue(sistemaPrompt)
    const result = await getPrompt('user-1', 'sys_1')
    expect(result).toEqual(sistemaPrompt)
  })
})

// ── 2. Unicidade de nome na mesma pasta ───────────────────────────────────────

describe('unicidade de nome na mesma pasta', () => {
  it('createPrompt lança NomeDuplicadoError se nome já existe na pasta', async () => {
    mockPrisma.promptTemplate.count.mockResolvedValue(0)
    mockPrisma.promptTemplate.findFirst.mockResolvedValue({ id: 'existing' })

    await expect(
      createPrompt('user-1', { name: 'Meu Prompt', body: 'corpo', folderId: 'folder-1' })
    ).rejects.toThrow(NomeDuplicadoError)
  })

  it('createPrompt tem sucesso se nome é único na pasta', async () => {
    mockPrisma.promptTemplate.count.mockResolvedValue(0)
    mockPrisma.promptTemplate.findFirst.mockResolvedValue(null)
    mockPrisma.promptTemplate.create.mockResolvedValue({ id: 'new-1', name: 'Novo', type: TipoPrompt.Usuario })

    const result = await createPrompt('user-1', { name: 'Novo', body: 'corpo' })
    expect(result.type).toBe(TipoPrompt.Usuario)
  })
})

// ── 3. Limite de 1000 prompts ─────────────────────────────────────────────────

describe('limite de 1000 prompts por usuário', () => {
  it('createPrompt lança LimitePomptError quando usuário já tem 1000 prompts', async () => {
    mockPrisma.promptTemplate.count.mockResolvedValue(1000)

    await expect(
      createPrompt('user-1', { name: 'Novo', body: 'corpo' })
    ).rejects.toThrow(LimitePomptError)
  })

  it('duplicatePrompt lança LimitePomptError quando usuário já tem 1000 prompts', async () => {
    mockPrisma.promptTemplate.findFirst.mockResolvedValue({ id: 'sys_1', userId: null, type: TipoPrompt.Sistema, isDeleted: false, name: 'Resumo' })
    mockPrisma.promptTemplate.count.mockResolvedValue(1000)

    await expect(duplicatePrompt('user-1', 'sys_1')).rejects.toThrow(LimitePomptError)
  })
})

// ── 4. Duplicar cria cópia com prefixo "[Meu] " ───────────────────────────────

describe('duplicatePrompt', () => {
  it('cria cópia com prefixo "[Meu] " e tipo=Usuario', async () => {
    const original = { id: 'sys_1', userId: null, type: TipoPrompt.Sistema, isDeleted: false, name: 'Resumo de Audiência', description: 'desc', body: 'corpo do prompt' }
    mockPrisma.promptTemplate.findFirst
      .mockResolvedValueOnce(original)  // getPrompt call
      .mockResolvedValueOnce(null)       // unicidade check
    mockPrisma.promptTemplate.count.mockResolvedValue(0)
    mockPrisma.promptTemplate.create.mockResolvedValue({ id: 'copy-1', name: '[Meu] Resumo de Audiência', type: TipoPrompt.Usuario })

    const result = await duplicatePrompt('user-1', 'sys_1')
    expect(result.name).toBe('[Meu] Resumo de Audiência')
    expect(result.type).toBe(TipoPrompt.Usuario)

    const createCall = mockPrisma.promptTemplate.create.mock.calls[0][0]
    expect(createCall.data.type).toBe(TipoPrompt.Usuario)
    expect(createCall.data.userId).toBe('user-1')
  })
})

// ── 5. Soft delete preserva PromptApplication (audit trail) ──────────────────

describe('soft delete preserva histórico de PromptApplication', () => {
  it('deletePrompt marca isDeleted=true em vez de remover do banco', async () => {
    const userPrompt = { id: 'prompt-1', userId: 'user-1', type: TipoPrompt.Usuario, isDeleted: false, name: 'Meu Prompt' }
    mockPrisma.promptTemplate.findFirst.mockResolvedValue(userPrompt)
    mockPrisma.promptTemplate.update.mockResolvedValue({ ...userPrompt, isDeleted: true })

    await deletePrompt('user-1', 'prompt-1')

    expect(mockPrisma.promptTemplate.update).toHaveBeenCalledWith({
      where: { id: 'prompt-1' },
      data: { isDeleted: true },
    })
    // Confirma que não usou delete (que quebraria FK de PromptApplication)
    expect(mockPrisma.promptTemplate.delete).toBeUndefined()
  })
})

// ── 6. Pasta com máx 3 níveis ─────────────────────────────────────────────────

describe('limite de 3 níveis de pasta', () => {
  it('createFolder lança NivelPastaError quando pai já está no nível 3', async () => {
    // Simula cadeia: pai (depth 1) → avô (depth 2) → bisavô (null = depth 3)
    mockPrisma.promptFolder.findUnique
      .mockResolvedValueOnce({ parentFolderId: 'avo-id' })    // nível 1
      .mockResolvedValueOnce({ parentFolderId: 'bisavo-id' }) // nível 2
      .mockResolvedValueOnce({ parentFolderId: null })        // nível 3 (raiz)

    await expect(createFolder('user-1', 'Nova Pasta', 'pai-id')).rejects.toThrow(NivelPastaError)
  })

  it('createFolder sem pai cria pasta raiz sem erro', async () => {
    mockPrisma.promptFolder.create.mockResolvedValue({ id: 'f1', name: 'Criminal', parentFolderId: null })
    const folder = await createFolder('user-1', 'Criminal')
    expect(folder.name).toBe('Criminal')
  })
})
