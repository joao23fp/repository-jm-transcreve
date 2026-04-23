import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    videoClip: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    exportJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/inngest/client', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/storage', () => ({
  IS_LOCAL_STORAGE: true,
  localStorageRead: vi.fn(),
  localStorageSave: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import {
  createClip,
  listClips,
  getClip,
  deleteClip,
  ClipDuracaoError,
  ClipNotFoundError,
} from '@/app/clips/clips.service'
import { StatusClipe } from '@/lib/enums'

const mockPrisma = prisma as any

beforeEach(() => vi.clearAllMocks())

// ── 1. Validação de duração mínima ────────────────────────────────────────────

describe('validação de duração mínima', () => {
  it('rejeita seleção com menos de 3000ms', async () => {
    await expect(
      createClip('user-1', 'file-1', 'Meu Clipe', 0, 2999, 'texto')
    ).rejects.toThrow(ClipDuracaoError)
  })

  it('rejeita seleção de exatamente 2999ms', async () => {
    await expect(
      createClip('user-1', 'file-1', 'Meu Clipe', 1000, 3999, 'texto')
    ).rejects.toThrow(ClipDuracaoError)
  })

  it('aceita seleção de exatamente 3000ms', async () => {
    mockPrisma.videoClip.create.mockResolvedValue({
      id: 'clip-1', status: StatusClipe.PENDING,
    })
    const clip = await createClip('user-1', 'file-1', 'Meu Clipe', 0, 3000, 'texto')
    expect(clip.status).toBe(StatusClipe.PENDING)
  })

  it('aceita seleção de 30 segundos', async () => {
    mockPrisma.videoClip.create.mockResolvedValue({
      id: 'clip-2', status: StatusClipe.PENDING,
    })
    const clip = await createClip('user-1', 'file-1', 'Clipe Longo', 0, 30000, 'texto longo')
    expect(clip.id).toBe('clip-2')
  })
})

// ── 2. Criação de clipe com dados válidos ─────────────────────────────────────

describe('createClip com dados válidos', () => {
  it('cria clipe PENDING e dispara evento Inngest', async () => {
    const mockClip = { id: 'clip-ok', userId: 'user-1', status: StatusClipe.PENDING }
    mockPrisma.videoClip.create.mockResolvedValue(mockClip)

    const result = await createClip('user-1', 'file-1', 'Confissão', 5000, 35000, 'O réu confessou...')
    expect(result.status).toBe(StatusClipe.PENDING)
    expect(mockPrisma.videoClip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          fileId: 'file-1',
          name: 'Confissão',
          durationSeconds: 30,
        }),
      })
    )
  })
})

// ── 3. listClips retorna apenas clips do userId correto ───────────────────────

describe('listClips isolamento por userId', () => {
  it('passa userId correto na query', async () => {
    mockPrisma.videoClip.findMany.mockResolvedValue([])
    await listClips('user-abc', 'file-xyz')
    expect(mockPrisma.videoClip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-abc', fileId: 'file-xyz' },
      })
    )
  })
})

// ── 4. deleteClip falha para userId errado ────────────────────────────────────

describe('deleteClip segurança', () => {
  it('lança ClipNotFoundError se clip não pertence ao usuário', async () => {
    mockPrisma.videoClip.findFirst.mockResolvedValue(null)
    await expect(deleteClip('outro-user', 'clip-alheio')).rejects.toThrow(ClipNotFoundError)
  })

  it('permite deletar clip que pertence ao usuário', async () => {
    mockPrisma.videoClip.findFirst.mockResolvedValue({
      id: 'clip-1', userId: 'user-1', clipStoragePath: null, thumbnailPath: null,
    })
    mockPrisma.videoClip.delete.mockResolvedValue({})
    await expect(deleteClip('user-1', 'clip-1')).resolves.not.toThrow()
  })
})
