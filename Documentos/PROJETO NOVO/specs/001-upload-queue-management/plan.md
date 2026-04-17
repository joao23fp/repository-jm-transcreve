# Implementation Plan: Módulo de Envio Ágil com Gestão de Saldo e Processamento IA

**Branch**: `001-upload-queue-management` | **Date**: 2026-04-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-upload-queue-management/spec.md`

## Summary

Implementar o módulo de upload de arquivos de áudio/vídeo com validação de saldo pré-upload,
fila de processamento assíncrona (transcrição via Groq Whisper + análise de prompt de contexto
via LLM), reconciliação automática de créditos e notificações em tempo real. Upload realizado
via presigned URL diretamente ao Supabase Storage; duração lida no navegador antes do envio.

## Technical Context

**Language/Version**: TypeScript (Next.js 14+ App Router)
**Primary Dependencies**: Prisma, Inngest, Groq Whisper API, Supabase (DB + Storage + Realtime),
  Clerk (auth), Resend (email), shadcn/ui, Tailwind CSS, Vitest, Sentry
**Storage**: PostgreSQL via Supabase (jobs, reservas, metadados); Supabase Storage (arquivos
  de mídia via presigned URL)
**Testing**: Vitest — cobertura nas regras críticas: cota, status de jobs, reconciliação
  de créditos, validação de formatos
**Target Platform**: Web (Vercel), SSR/RSC Next.js App Router
**Project Type**: web-service (full-stack Next.js, feature-based folder structure)
**Performance Goals**: Exibição de custo estimado em <30s para 3 arquivos; progresso visível
  em <2s após confirmar; notificação "Na fila" em ≤60s após upload
**Constraints**: 60s por step Inngest (Vercel free tier); 2 GB / 4h por arquivo;
  máx. 5 arquivos simultâneos por usuária
**Scale/Scope**: Usuárias individuais (sem multitenancy em v1); fila FIFO por usuária

## Constitution Check

*GATE: Deve passar antes da Fase 0. Re-verificado após Fase 1.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Spec-First | Spec completa + clarificação encerrada | ✅ Pass |
| II. Legal-Grade Reliability | Créditos bloqueados antes do upload (FR-003); retry 3x + estorno total (FR-005); isolamento por usuária (FR-009); LGPD logs 90 dias (FR-010); exclusão sob demanda (FR-011) | ✅ Pass |
| III. User-Centric AI | Prompt de contexto é opt-in (P2, User Story 3); AI não processa sem confirmação da usuária | ✅ Pass |
| IV. Modular Architecture | Módulo com service layer próprio (`uploads.service.ts`); comunicação via Inngest jobs | ✅ Pass |
| V. Transparent Cost Accounting | `saldo_disponivel = saldo_total - saldo_bloqueado`; bloqueio antes do upload; reconciliação automática pós-conclusão (FR-008) | ✅ Pass |
| Tech Stack | TypeScript + Next.js + Supabase + Inngest + Groq + Clerk + Resend — alinhado com TECH_STACK_v4.md | ✅ Pass |

**Resultado**: Todos os gates passaram. Pode prosseguir para Fase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-upload-queue-management/
├── plan.md          ← este arquivo
├── research.md      ← Fase 0 (gerado)
├── data-model.md    ← Fase 1 (gerado)
├── quickstart.md    ← Fase 1 (gerado)
├── contracts/       ← Fase 1 (gerado)
│   └── api.md
└── tasks.md         ← Fase 2 (/speckit.tasks — não gerado aqui)
```

### Source Code (repository root)

```text
app/
  uploads/
    page.tsx                         → Página de upload (Server Component)
    components/
      FileUploadZone.tsx             → Drag-and-drop + file picker
      FileList.tsx                   → Lista com barras de progresso por arquivo
      CreditPreview.tsx              → Estimativa de créditos antes de confirmar
      ContextPromptSelector.tsx      → Dropdown de Prompt de Contexto (P2)
      UploadConfirmButton.tsx        → Botão com validação de saldo
    uploads.service.ts               → Regras de negócio (estimativa, bloqueio, reconciliação)
    uploads.actions.ts               → Server Actions (gerar presigned URL, confirmar upload)

inngest/
  functions/
    process-transcription.ts         → Job Inngest: etapa 1 — transcrição Groq Whisper
    process-ai-analysis.ts           → Job Inngest: etapa 2 — análise com prompt de contexto
    reconcile-credits.ts             → Job Inngest: reconciliação pós-conclusão

prisma/
  schema.prisma                      → Modelos: ProcessingJob, FileUpload, CreditReservation
  migrations/
    20260417_upload_queue/           → Migration desta feature

lib/
  enums.ts                           → StatusProcessamento, FormatoAceito (atualizados)
  utils.ts                           → Funções compartilhadas

__tests__/
  uploads/
    uploads.service.test.ts          → Testes: cota, estimativa, reconciliação, formatos
    process-transcription.test.ts    → Testes: retry logic, credit refund on failure
```

**Structure Decision**: Feature-based, alinhado com TECH_STACK_v4.md. Service layer isolado em
`uploads.service.ts`. Jobs assíncronos separados por responsabilidade em `inngest/functions/`.
Testes críticos em `__tests__/uploads/`.

## Complexity Tracking

Sem violações dos gates constitucionais. Nenhuma justificativa necessária.
