# API Contracts: Módulo 002 — Inteligência e Visualização

**Date**: 2026-04-18

---

## GET /api/jobs/[jobId]/transcript

Retorna todos os segmentos da transcrição com timestamps.

**Auth**: userId via `getAuthUserId()` — valida que job pertence ao usuário

**Response 200**:
```ts
{
  jobId: string
  fileName: string
  segments: Array<{
    id: string
    sequenceIndex: number
    startMs: number
    endMs: number
    speakerId: string | null
    speakerName: string | null      // displayName do SpeakerProfile
    text: string                    // editedText ?? originalText
    wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>
  }>
  speakers: Array<{
    id: string
    suggestedTag: string
    displayName: string
    isRenamed: boolean
  }>
  videoUrl: string | null           // URL para o arquivo via /api/uploads/local-file/...
  durationMs: number
}
```

**Response 404**: `{ error: 'JOB_NOT_FOUND' }`

---

## PUT /api/jobs/[jobId]/speakers/[speakerId]

Renomeia um falante. Propaga automaticamente para todos segmentos associados.

**Body**:
```ts
{ displayName: string }   // max 100 chars
```

**Response 200**:
```ts
{ speakerId: string; displayName: string; affectedSegments: number }
```

---

## POST /api/jobs/[jobId]/chat

Envia mensagem ao chat. Retorna stream SSE com resposta da IA.

**Body**:
```ts
{ message: string }
```

**Response**: `text/event-stream` (SSE)
```
data: {"delta":"Olá"}
data: {"delta":", "}
data: {"delta":"conforme"}
data: [DONE]
```

**Context enviado ao LLM**:
- System prompt jurídico
- Transcrição completa (segmentos concatenados com speaker names)
- Histórico das últimas 10 mensagens do chat

---

## POST /api/jobs/[jobId]/contradictions

Detecta contradições no depoimento via LLM. Operação síncrona (não streaming).

**Body**: `{}` (vazio — usa transcrição do jobId)

**Response 200**:
```ts
{
  count: number
  items: Array<{
    id: string
    description: string
    primarySegmentId: string
    conflictingSegmentId: string
    confidenceScore: number
    primaryText: string
    conflictingText: string
    primaryStartMs: number
    conflictingStartMs: number
  }>
}
```

**Response 400**: `{ error: 'NO_TRANSCRIPT', message: 'Transcrição ainda não processada' }`

---

## PUT /api/jobs/[jobId]/segments/[segmentId]

Edita o texto de um segmento da transcrição.

**Body**:
```ts
{ editedText: string }
```

**Response 200**:
```ts
{ segmentId: string; editedText: string }
```

---

## UI Contracts

### VideoPlayer Component
```ts
type VideoPlayerProps = {
  fileUrl: string
  onTimeUpdate: (currentMs: number) => void
  seekRef: React.RefObject<{ seekToMs: (ms: number) => void }>
}
```

### TranscriptPanel Component
```ts
type TranscriptPanelProps = {
  segments: TranscriptSegmentUI[]
  currentMs: number              // posição atual do vídeo para highlight
  onSegmentClick: (startMs: number) => void
  onSpeakerAssign: (segmentId: string, speakerId: string) => void
}
```

### ChatPanel Component
```ts
type ChatPanelProps = {
  jobId: string
  onCitationClick: (segmentId: string, startMs: number) => void
}
```
