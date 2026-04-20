# Data Model: Módulo 002 — Inteligência e Visualização

**Date**: 2026-04-18

---

## Prisma Schema — Novos Modelos

```prisma
model TranscriptSegment {
  id             String   @id @default(cuid())
  jobId          String
  sequenceIndex  Int                          // ordem na transcrição
  startMs        Int                          // timestamp início em milissegundos
  endMs          Int                          // timestamp fim em milissegundos
  speakerId      String?                      // FK → SpeakerProfile.id (nullable)
  originalText   String                       // texto original do Groq
  editedText     String?                      // edição do usuário (null = não editado)
  wordTimestamps Json                         // [{word, startMs, endMs}]
  createdAt      DateTime @default(now())

  job     ProcessingJob  @relation(fields: [jobId], references: [id], onDelete: Cascade)
  speaker SpeakerProfile? @relation(fields: [speakerId], references: [id])

  @@index([jobId, sequenceIndex])
  @@index([jobId, startMs])
}

model SpeakerProfile {
  id           String   @id @default(cuid())
  jobId        String
  suggestedTag String                         // ex: "Pessoa A" (gerado automaticamente)
  displayName  String                         // nome dado pelo usuário (inicia = suggestedTag)
  isRenamed    Boolean  @default(false)
  createdAt    DateTime @default(now())

  job      ProcessingJob    @relation(fields: [jobId], references: [id], onDelete: Cascade)
  segments TranscriptSegment[]

  @@unique([jobId, suggestedTag])
  @@index([jobId])
}

model ChatMessage {
  id             String   @id @default(cuid())
  jobId          String
  userId         String
  role           String                       // "user" | "assistant"
  content        String
  citedSegmentIds String[]                    // array de TranscriptSegment.id
  createdAt      DateTime @default(now())

  job ProcessingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId, createdAt])
}

model InconsistencyReport {
  id                 String   @id @default(cuid())
  jobId              String
  description        String
  primarySegmentId   String
  conflictingSegmentId String
  confidenceScore    Float                    // 0.0–1.0
  createdAt          DateTime @default(now())

  job ProcessingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
}
```

## Alterações em Modelos Existentes

### ProcessingJob — adicionar relações
```prisma
// Adicionar ao model ProcessingJob existente:
segments            TranscriptSegment[]
speakers            SpeakerProfile[]
chatMessages        ChatMessage[]
inconsistencyReports InconsistencyReport[]
```

## wordTimestamps JSON Schema

```ts
type WordTimestamp = {
  word: string
  startMs: number    // milissegundos
  endMs: number      // milissegundos
}
// Campo wordTimestamps = WordTimestamp[]
```

## Mapeamento Groq → TranscriptSegment

```ts
// Groq verbose_json → TranscriptSegment
groq.segments[i].start * 1000  → startMs
groq.segments[i].end   * 1000  → endMs
groq.segments[i].text          → originalText
groq.words filtrados por range → wordTimestamps [{word, startMs, endMs}]
index i                        → sequenceIndex
```

## Cardinalidades

- `ProcessingJob` 1 → N `TranscriptSegment`
- `ProcessingJob` 1 → N `SpeakerProfile`
- `ProcessingJob` 1 → N `ChatMessage`
- `ProcessingJob` 1 → N `InconsistencyReport`
- `SpeakerProfile` 1 → N `TranscriptSegment` (nullable — segmentos sem falante atribuído)

## Validações

- `sequenceIndex` único por `jobId` (enforced na aplicação)
- `startMs < endMs` (enforced na aplicação)
- `role` ∈ {"user", "assistant"}
- `confidenceScore` ∈ [0.0, 1.0]
- `displayName` max 100 chars
