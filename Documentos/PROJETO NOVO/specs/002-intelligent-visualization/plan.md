# Implementation Plan: Módulo 002 — Inteligência e Visualização

**Branch**: `002-intelligent-visualization` | **Date**: 2026-04-18
**Spec**: specs/002-intelligent-visualization/spec.md

## Summary

Player sincronizado com transcrição word-level, identificação manual de falantes, chat com IA via Groq LLaMA 3.3 70B (streaming), e detector de contradições. A transcrição estruturada (segmentos + timestamps por palavra) é extraída do Groq `verbose_json` no pipeline existente do Módulo 001 e persistida em tabela `TranscriptSegment`.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.4 (App Router + Turbopack)
**Primary Dependencies**: Prisma 7 + @prisma/adapter-pg, Inngest v4, Groq SDK (whisper-large-v3 + llama-3.3-70b-versatile), PostgreSQL 15 (Docker local)
**Storage**: PostgreSQL via Docker local (dev) / Supabase (prod)
**Testing**: Vitest — regras de negócio críticas
**Target Platform**: Web (Vercel), SSR Next.js App Router
**Performance Goals**: Seek latência ≤300ms; Chat first-token ≤1s; Contradiction detection ≤10s
**Constraints**: Groq rate limits free tier; transcrições >80k chars requerem truncamento para chat; MOV não suportado nativamente no browser
**Video Player**: Native HTML5 `<video>` + React ref (zero deps)
**LLM**: Groq `llama-3.3-70b-versatile` — 128k tokens, gratuito

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Spec-First (Princípio I) | ✅ PASS | spec.md + clarifications completos |
| Legal-Grade Reliability (Princípio II) | ✅ PASS | Chat isolado por jobId (FR-004); sem cross-contamination |
| No-Hallucination (Princípio III) | ✅ PASS | Chat inclui transcrição real como contexto; SC-002 exige 100% grounding |
| Privacy / LGPD (Princípio IV) | ✅ PASS | Mensagens de chat só acessíveis ao userId dono do job |
| Cost Discipline | ✅ PASS | Groq free tier; sem custos adicionais no MVP |
| Diarização conflict (constitution flag) | ✅ RESOLVED | Clarification sessão 2026-04-18: MVP manual, sem diarização automática |

## Project Structure

```text
app/
├── resultados/
│   ├── page.tsx                        # lista de jobs (existente — atualizar)
│   └── [jobId]/
│       ├── page.tsx                    # Server Component — carrega job + segments
│       ├── ViewerLayout.tsx            # Client Component — estado compartilhado
│       ├── VideoPlayer.tsx             # Client Component — <video> + seek
│       ├── TranscriptPanel.tsx         # Client Component — segmentos + highlight
│       ├── SpeakerManager.tsx          # Client Component — atribuição de falantes
│       ├── ChatPanel.tsx               # Client Component — streaming chat
│       └── ContradictionsPanel.tsx     # Client Component — lista de contradições
│
app/api/jobs/[jobId]/
├── transcript/route.ts                 # GET — segmentos + speakers + videoUrl
├── chat/route.ts                       # POST — streaming SSE com LLM
├── contradictions/route.ts             # POST — detectar contradições
├── speakers/[speakerId]/route.ts       # PUT — renomear falante
└── segments/[segmentId]/route.ts       # PUT — editar segmento

inngest/functions/
└── process-transcription.ts           # ATUALIZAR: salvar TranscriptSegment rows

prisma/
└── schema.prisma                       # ATUALIZAR: 4 novos modelos
```

## Phase 0 Artifacts

- [research.md](research.md) — decisões técnicas (player, LLM, storage, streaming)

## Phase 1 Artifacts

- [data-model.md](data-model.md) — 4 novos modelos Prisma + alterações ProcessingJob
- [contracts/api-contracts.md](contracts/api-contracts.md) — 5 endpoints + UI component contracts
- [quickstart.md](quickstart.md) — cenários de teste manual golden path + edge cases

## Complexity Tracking

Nenhuma violação de constituição identificada.

## Implementation Strategy

**MVP (US1 + US2 primeiro)**:
1. Migration + atualizar process-transcription para salvar TranscriptSegment
2. Página viewer `/resultados/[jobId]` com player + transcrição sincronizada
3. Renomeação de falantes (manual, sem diarização)

**Incremento 2 (US3 + US4)**:
4. Chat streaming com contexto da transcrição
5. Detector de contradições

Cada incremento é independentemente deployável e testável.
