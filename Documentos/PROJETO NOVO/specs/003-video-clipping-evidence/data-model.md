# Data Model: Módulo 003 — Gerador de Clipes de Vídeo

**Feature**: 003-video-clipping-evidence
**Date**: 2026-04-22

---

## Modelos Existentes (sem alteração de schema)

| Modelo | Módulo | Uso neste módulo |
|--------|--------|-----------------|
| `ProcessingJob` | 001 | Referência ao arquivo original (fileId) |
| `FileUpload` | 001 | `storagePath` do vídeo original para FFmpeg |
| `TranscriptSegment` | 002 | `start_ms`, `end_ms`, `content` para mapeamento texto→tempo |
| `Wallet` / `CreditReservation` | 001/005 | Clipes gratuitos na v1; sem novo bloqueio |

---

## Novos Modelos

### Enum: StatusClipe

```prisma
enum StatusClipe {
  PENDING      // criado, aguardando renderização
  PROCESSING   // Inngest job em execução
  COMPLETED    // clipe gerado com sucesso
  FAILED       // erro de renderização
}
```

Adicionar a `lib/enums.ts` (Constitution: todos enums centralizados).

### Enum: FormatoExport

```prisma
enum FormatoExport {
  VIDEO  // .mp4 (H.264/AAC)
  PDF    // .pdf com transcrição do trecho
  WORD   // .docx com transcrição do trecho
}
```

Adicionar a `lib/enums.ts`.

### Model: VideoClip

```prisma
model VideoClip {
  id              String      @id @default(cuid())
  userId          String
  fileId          String      // ProcessingJob.id — arquivo original
  name            String      // nome dado pelo usuário (≤255 chars)
  startMs         Int         // timestamp de início em millisegundos
  endMs           Int         // timestamp de fim em millisegundos
  durationSeconds Float       // (endMs - startMs) / 1000
  transcriptText  String      // texto do trecho selecionado
  status          StatusClipe @default(PENDING)
  clipStoragePath String?     // path no Supabase Storage após renderização
  thumbnailPath   String?     // path da thumbnail JPEG no Storage
  errorMessage    String?
  createdAt       DateTime    @default(now())
  completedAt     DateTime?
  exports         ExportJob[]

  @@index([userId, fileId])
  @@index([userId, status])
}
```

### Model: ExportJob

```prisma
model ExportJob {
  id            String        @id @default(cuid())
  videoClipId   String
  userId        String
  format        FormatoExport
  status        StatusClipe   @default(PENDING)
  fileStoragePath String?     // path do PDF/DOCX/MP4 no Storage
  errorMessage  String?
  createdAt     DateTime      @default(now())
  completedAt   DateTime?
  clip          VideoClip     @relation(fields: [videoClipId], references: [id])

  @@index([userId, videoClipId])
}
```

---

## Diagrama de Relacionamentos

```
ProcessingJob (001)
    │ 1
    │ N
VideoClip ──────── ExportJob (N exportações por clipe)
    │
    └── TranscriptSegment (002, referência lógica via startMs/endMs)
```

---

## Notas de Implementação

- `VideoClip.fileId` referencia `ProcessingJob.id` (não FK no schema para evitar dependência rígida entre módulos — Constitution Princípio IV: módulos independentes)
- `transcriptText` armazena o texto do trecho no momento da criação (imutável; independe de edições futuras na transcrição)
- `clipStoragePath` usa o padrão: `clips/{userId}/{videoClipId}.mp4`
- `thumbnailPath` usa o padrão: `clips/{userId}/{videoClipId}-thumb.jpg`
- Exclusão em cascata de `ExportJob` quando `VideoClip` é deletado (FK com `onDelete: Cascade`)
- Exclusão em cascata de `VideoClip` quando `ProcessingJob` original é deletado (lógica no service, não FK, para independência modular)

---

## Migration

```bash
npx prisma migrate dev --name add-video-clipping-module
```
