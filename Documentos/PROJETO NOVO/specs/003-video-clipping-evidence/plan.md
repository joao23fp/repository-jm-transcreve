# Implementation Plan: Módulo 003 — Gerador de Clipes de Vídeo (Provas)

**Branch**: `003-video-clipping-evidence` | **Date**: 2026-04-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-video-clipping-evidence/spec.md`

## Summary

Módulo que permite advogados selecionarem trechos de transcrição e extraírem clipes de vídeo como provas. A seleção dispara cálculo de intervalo de tempo via word-level timestamps (já disponíveis do Módulo 001), enfileira renderização assíncrona via Inngest (FFmpeg), e disponibiliza exportação em Vídeo/PDF/Word com audit trail completo.

## Technical Context

**Language/Version**: TypeScript (Next.js App Router)
**Primary Dependencies**: Prisma, Inngest, fluent-ffmpeg (Node server-side), Supabase Storage, Clerk, Resend, shadcn/ui, Tailwind CSS, Vitest, Sentry
**Storage**: PostgreSQL via Supabase; vídeos clipeados em Supabase Storage (presigned URL)
**Testing**: Vitest — validação de timestamps, cálculo de intervalos, estado de clipes
**Target Platform**: Web (Vercel), SSR padrão Next.js
**Performance Goals**: SC-001 (conclusão ≤2x duração do clipe); SC-005 (download ≤30s para clipes ≤5min)
**Constraints**: Vercel Serverless: timeout 60s/step (Inngest isola steps); FFmpeg pesado → server-side via Inngest; word-level timestamps dependem do Módulo 001
**Scale/Scope**: Por usuário; até centenas de clipes por arquivo de vídeo

## Constitution Check

| Gate | Princípio | Status |
|------|-----------|--------|
| I — Spec-First | Spec + user stories antes de código | ✅ PASS |
| II — Idempotência | Job de renderização: retry safe; créditos estornados em falha | ✅ REQUER T-créditos |
| II — LGPD | Access logs para clipes e exports (90 dias) | ✅ REQUER T024 |
| II — Isolamento | VideoClip.userId enforçado em todas as queries | ✅ REQUER validação |
| III — Traceabilidade IA | Timestamps do clipe citam segmento exato da transcrição | ✅ PASS |
| IV — Modular | `app/clips/` com `clips.service.ts` separado | ✅ PASS |
| IV — Inngest | Renderização FFmpeg em step separado (não bloqueia request) | ✅ PASS |
| V — Créditos | Custo estimado bloqueado antes de renderizar; estorno em falha | ✅ REQUER definição de tarifa |

## Project Structure

### Documentation (this feature)

```text
specs/003-video-clipping-evidence/
├── plan.md              ← este arquivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-contracts.md
│   └── inngest-events.md
└── tasks.md
```

### Source Code

```text
app/
├── clips/
│   ├── clips.service.ts          # lógica: criar, consultar, deletar clipes + custo
│   ├── clips.actions.ts          # Server Actions: requestClip
│   └── components/
│       ├── ClipSelectionMenu.tsx  # menu flutuante ao selecionar texto
│       ├── ClipNameModal.tsx      # modal de nomeação (prefill 5 palavras)
│       ├── ClipGallery.tsx        # galeria de clipes com thumbnail, nome, duração
│       └── ExportMenu.tsx         # dropdown Vídeo / PDF / Word
├── resultados/[jobId]/
│   └── page.tsx                   # integra seleção de texto com transcriptSegments
app/api/
├── clips/
│   ├── route.ts                   # POST criar clipe, GET listar por fileId
│   └── [id]/
│       ├── route.ts               # GET status + detalhes, DELETE
│       └── export/route.ts        # POST solicitar export (Video/PDF/Word)
inngest/functions/
├── render-clip.ts                 # job FFmpeg: baixa original, corta [start,end], salva Storage
└── export-clip-document.ts        # job: gera PDF (pdfkit) ou Word (docx) com transcrição
lib/
├── ffmpeg-server.ts               # wrapper fluent-ffmpeg para uso server-side no Inngest
└── export-generators.ts           # geradores PDF (pdfkit) e Word (docx)
__tests__/clips/
└── clips.service.test.ts
```

## Phases

### Phase 0: Research

1. **FFmpeg no ambiente Vercel/Inngest**: `fluent-ffmpeg` requer binário `ffmpeg` instalado — funciona em Inngest steps (Lambda-like), mas requer layer customizado ou uso de `@ffmpeg-installer/ffmpeg` como pacote npm que empacota o binário. Solução: `npm install @ffmpeg-installer/ffmpeg fluent-ffmpeg`.
2. **Word-level timestamps**: confirmar que `TranscriptSegment` do Módulo 001 (Groq Whisper com `timestamp_granularities: ["word"]`) produz `start_ms`/`end_ms` por palavra.
3. **Custo de créditos para clipes**: clipes são gratuitos na v1 (o crédito já foi consumido na transcrição). Sem novo bloqueio de créditos para renderização.
4. **PDF/Word no servidor**: `pdfkit` (PDF) + `docx` (Word) — ambos Node puro, sem binários. Compatíveis com Vercel/Inngest.
5. **Thumbnail**: screenshot via FFmpeg (seek ao meio do clipe, 1 frame JPEG). Incluído no job `render-clip`.

**Output**: [research.md](research.md)

### Phase 1: Design

1. **data-model.md**: VideoClip, ExportJob, relação com TranscriptSegment (Módulo 002)
2. **contracts/api-contracts.md**: endpoints POST/GET `/api/clips`, GET/DELETE `/api/clips/[id]`, POST `/api/clips/[id]/export`
3. **contracts/inngest-events.md**: `clip/render.requested`, `clip/export.requested`
4. **quickstart.md**: 6 cenários de teste

### Phase 2: Tasks

Executar `/speckit.tasks` para gerar `tasks.md`.

## Implementation Strategy

### MVP (US1 + US2 + US3)

1. Seleção de texto → menu flutuante → validação ≥3s (US1)
2. Modal de nomeação com prefill (US2)
3. Inngest render-clip FFmpeg + notificação (US3)
4. Validação: Cenários 1–3 do quickstart

### Entrega Incremental

1. US1 (seleção + validação) + US2 (nomeação)
2. US3 (rendering background + toast + email)
3. US4 (galeria + exports Vídeo/PDF/Word)
4. Edge cases: falha encoder, exclusão em cascata, arquivo expirado

## Dependencies

- **Módulo 001**: `TranscriptSegment.start_ms` / `end_ms` por palavra (word-level timestamps do Groq Whisper)
- **Módulo 002**: `TranscriptSegment.content` (texto) já persistido e exibido na UI
- **Storage**: arquivo de vídeo original no Supabase Storage acessível server-side para FFmpeg
- **Créditos**: clipes gratuitos na v1 (sem bloqueio adicional de créditos)
