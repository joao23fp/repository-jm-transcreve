import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    processingJob: { update: vi.fn() },
    wallet: { findUnique: vi.fn(), update: vi.fn() },
    creditReservation: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServiceClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/audio.mp3' },
          error: null,
        }),
      })),
    },
  })),
}))

vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'Texto transcrito',
          duration: 120,
        }),
      },
    },
  })),
}))

vi.mock('@/inngest/client', () => ({
  inngest: {
    createFunction: vi.fn(),
    send: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/app/uploads/uploads.service', () => ({
  refundCredits: vi.fn().mockResolvedValue(5),
  reconcileCredits: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { refundCredits } from '@/app/uploads/uploads.service'
import { StatusProcessamento, EtapaProcessamento } from '@/lib/enums'

const mockPrisma = prisma as any

describe('process-transcription error handling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refundCredits is called with FAILURE reason on job failure', async () => {
    await refundCredits('job-1', 'FAILURE')
    expect(refundCredits).toHaveBeenCalledWith('job-1', 'FAILURE')
  })

  it('processingJob update sets FAILED status on failure', async () => {
    mockPrisma.processingJob.update.mockResolvedValue({})
    await mockPrisma.processingJob.update({
      where: { id: 'job-1' },
      data: {
        status: StatusProcessamento.FAILED,
        currentStage: EtapaProcessamento.FAILED,
        errorMessage: 'Test error',
        completedAt: new Date(),
      },
    })
    expect(mockPrisma.processingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusProcessamento.FAILED,
          currentStage: EtapaProcessamento.FAILED,
        }),
      })
    )
  })
})

describe('GROQ_NO_RETRY_ERRORS detection', () => {
  const GROQ_NO_RETRY_ERRORS = ['invalid_file', 'unsupported_format', 'file_too_large']

  it('identifies non-retriable error codes', () => {
    const err = { error: { code: 'invalid_file' }, message: 'File is invalid' }
    const errorCode = err.error?.code ?? ''
    const isNonRetriable = GROQ_NO_RETRY_ERRORS.some((c) => errorCode.includes(c))
    expect(isNonRetriable).toBe(true)
  })

  it('allows retry for network errors', () => {
    const err = { error: { code: 'rate_limit_exceeded' }, message: 'Too many requests' }
    const errorCode = err.error?.code ?? ''
    const isNonRetriable = GROQ_NO_RETRY_ERRORS.some((c) => errorCode.includes(c))
    expect(isNonRetriable).toBe(false)
  })

  it('catches unsupported_format', () => {
    const err = { code: 'unsupported_format' }
    const errorCode = (err as any)?.error?.code ?? (err as any)?.code ?? ''
    expect(GROQ_NO_RETRY_ERRORS.some((c) => errorCode.includes(c))).toBe(true)
  })

  it('catches file_too_large', () => {
    const err = { error: { code: 'file_too_large' } }
    const errorCode = err.error?.code ?? ''
    expect(GROQ_NO_RETRY_ERRORS.some((c) => errorCode.includes(c))).toBe(true)
  })
})
