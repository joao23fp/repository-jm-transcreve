# API Contracts: Módulo de Envio Ágil

**Feature**: 001-upload-queue-management
**Date**: 2026-04-17
**Base path**: `/api/uploads`
**Auth**: Clerk session obrigatória em todos os endpoints

---

## POST /api/uploads/presigned-url

Gera uma presigned URL para upload direto ao Supabase Storage e bloqueia os créditos estimados.

### Request Body

```typescript
{
  files: Array<{
    fileName: string        // ex: "audiencia-2026-04-17.mp4"
    fileSizeBytes: number   // bytes
    mimeType: string        // ex: "video/mp4"
    durationSeconds: number // lido client-side via HTMLMediaElement.duration
  }>
  promptId?: string         // opcional — prompt de contexto (P2)
}
```

### Validações

- `files.length` entre 1 e 5
- `fileSizeBytes` ≤ 2_147_483_648 (2 GB)
- `durationSeconds` ≤ 14_400 (4 horas) e > 0
- `mimeType` em: `video/mp4`, `video/x-matroska`, `video/quicktime`, `video/x-msvideo`,
  `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/ogg`
- Saldo disponível ≥ soma de `ceil(durationSeconds / 60)` de todos os arquivos

### Response 200

```typescript
{
  jobs: Array<{
    jobId: string
    uploadUrl: string       // presigned URL para PUT direto ao Supabase Storage
    storagePath: string     // path no bucket para confirmar depois
    expiresAt: string       // ISO 8601 — TTL da presigned URL (15 min)
    estimatedMinutes: number
  }>
  walletSnapshot: {
    saldoDisponivel: number
    saldoBloqueado: number
  }
}
```

### Response 422 — Saldo insuficiente

```typescript
{
  error: 'INSUFFICIENT_BALANCE',
  message: 'Saldo insuficiente para processar os arquivos selecionados',
  detail: {
    saldoDisponivel: number
    estimatedTotal: number
    deficit: number
  }
}
```

### Response 400 — Validação

```typescript
{
  error: 'VALIDATION_ERROR',
  message: string,    // ex: "Formato não suportado: .avi"
  field: string       // ex: "files[1].mimeType"
}
```

---

## POST /api/uploads/confirm

Confirma que o upload chegou ao Supabase Storage e enfileira o job no Inngest.

### Request Body

```typescript
{
  jobId: string
}
```

### Response 200

```typescript
{
  jobId: string
  status: 'QUEUED'
  message: 'Processamento iniciado'
}
```

### Response 404

```typescript
{
  error: 'JOB_NOT_FOUND',
  message: 'Job não encontrado ou não pertence à usuária autenticada'
}
```

---

## GET /api/uploads/jobs

Lista os jobs de processamento da usuária autenticada.

### Query Params

- `status?: StatusProcessamento` — filtrar por status
- `limit?: number` — padrão 20, máx 100
- `cursor?: string` — paginação por cursor (jobId)

### Response 200

```typescript
{
  jobs: Array<{
    jobId: string
    fileName: string
    status: StatusProcessamento
    currentStage: EtapaProcessamento
    estimatedMinutes: number
    actualMinutesConsumed: number | null
    createdAt: string       // ISO 8601
    completedAt: string | null
    errorMessage: string | null
  }>
  nextCursor: string | null
}
```

---

## GET /api/uploads/jobs/:jobId

Retorna o status detalhado de um job específico.

### Response 200

```typescript
{
  jobId: string
  fileName: string
  fileSizeBytes: number
  durationSeconds: number     // estimado
  status: StatusProcessamento
  currentStage: EtapaProcessamento
  retryCount: number
  estimatedMinutes: number
  blockedMinutes: number
  actualMinutesConsumed: number | null
  promptId: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}
```

### Response 404

```typescript
{ error: 'JOB_NOT_FOUND' }
```

---

## DELETE /api/uploads/jobs/:jobId

Cancela um job em andamento e estorna os créditos bloqueados.

Só permitido para jobs com status `PENDING` ou `PROCESSING` (antes de completar a transcrição).

### Response 200

```typescript
{
  message: 'Job cancelado e créditos estornados',
  refundedMinutes: number
}
```

### Response 409 — Job já concluído

```typescript
{
  error: 'JOB_ALREADY_COMPLETED',
  message: 'Não é possível cancelar um job já concluído'
}
```

---

## Eventos Inngest

### `upload/confirmed` — disparado por POST /api/uploads/confirm

```typescript
{
  name: 'upload/confirmed',
  data: {
    jobId: string
    userId: string
    storageUrl: string
    estimatedMinutes: number
    promptId: string | null
  }
}
```

### `transcript/completed` — disparado por process-transcription.ts

```typescript
{
  name: 'transcript/completed',
  data: {
    jobId: string
    userId: string
    transcriptText: string
    actualDurationSeconds: number   // duração real detectada pelo Groq
    promptId: string | null
  }
}
```

---

## Supabase Realtime — Canal de Status

**Canal**: `job-status:{userId}`
**Tabela observada**: `ProcessingJob`
**Evento**: `UPDATE`
**Payload relevante**: `{ id, status, currentStage, errorMessage, actualMinutesConsumed }`
