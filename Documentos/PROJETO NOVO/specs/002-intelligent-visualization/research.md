# Research: Módulo 002 — Inteligência e Visualização

**Date**: 2026-04-18
**Feature**: Player Sincronizado + Chat IA + Detector de Contradições

---

## Decision 1: Video Player Library

**Decision**: Native HTML5 `<video>` element with React `useRef`

**Rationale**: Zero external dependencies. Full programmatic seek control via `videoRef.current.currentTime = ms / 1000`. `onTimeUpdate` event reports playback position for real-time transcript highlight sync. Already compatible with files served via `/api/uploads/local-file/[...path]`.

**Key API**:
```ts
videoRef.current.currentTime = ms / 1000        // seek
videoRef.current.currentTime * 1000             // read position (ms)
<video onTimeUpdate={...} ref={videoRef} />
```

**Alternatives considered**: react-player (overhead, external dep), video.js (heavy, overkill for MVP)

**MOV caveat**: MOV files may not play natively in Chrome/Firefox. ffmpeg conversion to MP4 on upload is the long-term fix; out of scope for this module.

---

## Decision 2: Word-Level Timestamp Storage

**Decision**: Tabela `TranscriptSegment` (Prisma) com campo `wordTimestamps Json`

**Rationale**: Groq `verbose_json` retorna `segments[]{start, end, text}` e `words[]{word, start, end}` (ambos em segundos float). Cada segmento (frase/cláusula) vira um row em `TranscriptSegment`; os words do segmento ficam em `wordTimestamps` como JSONB. Prisma `Json` type → PostgreSQL `jsonb` — indexável, eficiente para leitura.

**Groq verbose_json structure**:
```ts
result.segments = [{ id, start, end, text, tokens, ... }]
result.words    = [{ word, start, end }]  // requires timestamp_granularities: ['word']
```

**Migration needed in process-transcription.ts**: adicionar `timestamp_granularities: ['word', 'segment']` e salvar segmentos em `TranscriptSegment` table via Inngest step.

**Alternatives considered**: JSON column em ProcessingJob (não normalizado, dificulta queries por segmento), tabela TranscriptWord por palavra (desnecessário, words podem ficar em JSONB dentro do segmento)

---

## Decision 3: Chat Streaming com Groq LLaMA

**Decision**: `groq.chat.completions.create({stream: true})` → `.toReadableStream()` → `new Response(stream, {headers: {'Content-Type': 'text/event-stream'}})`

**Model**: `llama-3.3-70b-versatile` — 128k tokens de contexto, gratuito no tier atual do Groq

**Context strategy**: Transcrição completa enviada como system message. Para transcrições >80k chars, truncar mantendo início e fim (partes mais relevantes juridicamente).

**Rationale**: SDK Groq já integrado. `.toReadableStream()` converte para Web ReadableStream compatível com Next.js App Router natively.

**Alternatives considered**: Claude API (custo), OpenAI (custo), Groq LLaMA 3.1 8B (menor, menos preciso juridicamente)

---

## Decision 4: Arquitetura da Página Viewer

**Decision**: `/resultados/[jobId]` — Server Component que carrega dados iniciais + Client Components para player e chat interativo

**Structure**:
```
app/resultados/[jobId]/
├── page.tsx           — Server Component (fetch job + segments iniciais)
├── ViewerLayout.tsx   — Client Component root (estado compartilhado)
├── VideoPlayer.tsx    — Client Component (ref, seek, timeUpdate)
├── TranscriptPanel.tsx — Client Component (highlight, click-to-seek)
├── ChatPanel.tsx      — Client Component (streaming chat)
└── SpeakerManager.tsx — Client Component (renomear falantes)
```

---

## Decision 5: Segmentos vs. Texto Plano no ProcessingJob

**Decision**: `ProcessingJob.transcriptText` permanece como fallback/display rápido. `TranscriptSegment` rows são a fonte de verdade para o viewer.

**Rationale**: `transcriptText` já existe e é usado na listagem de resultados. O módulo 002 adiciona granularidade sem quebrar o módulo 001.
