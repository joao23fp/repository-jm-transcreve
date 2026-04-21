# Implementation Plan: Módulo de Envio Ágil com Gestão de Saldo

**Branch**: `001-upload-queue-management` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-upload-queue-management/spec.md`

## Summary

Upload de múltiplos arquivos (até 5 simultâneos, máx. 2 GB / 4h por arquivo) via presigned URL diretamente ao Supabase Storage — o servidor nunca toca nos bytes do arquivo. Créditos são bloqueados atomicamente no momento da geração da presigned URL (POST /presigned-url); o processamento assíncrono é orquestrado pelo Inngest com até 3 retentativas automáticas por etapa (transcrição Groq + análise IA); créditos são reconciliados ao final e estornados integralmente em caso de falha. Atualizações de status em tempo real via Supabase Realtime.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Next.js App Router)
**Primary Dependencies**: Prisma, Inngest, Groq Whisper, Supabase (DB + Storage + Realtime), Clerk, Resend, shadcn/ui, Tailwind CSS, Vitest, Sentry
**Storage**: PostgreSQL via Supabase; arquivos de mídia em Supabase Storage (presigned URL)
**Testing**: Vitest — foco nas regras críticas de negócio
**Target Platform**: Web (Vercel), SSR padrão Next.js
**Project Type**: web-service (full-stack Next.js)
**Performance Goals**: [domain-specific — ver Success Criteria do spec]
**Constraints**: Limite de execução Vercel (60s/step via Inngest); 2 GB / 4h por arquivo de upload
**Scale/Scope**: [definido por feature — ver spec correspondente]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Notas |
|-----------|------|--------|-------|
| I — Spec-First | Spec aprovada antes de código | ✅ PASS | spec.md com clarificações completas (5 sessões) |
| II — Data Integrity | Operações transacionais + idempotentes | ✅ PASS | `blockCredits` em `$transaction`; `confirm` verifica `uploadConfirmedAt` |
| II — Isolamento | Nenhuma usuária acessa dados de outra | ✅ PASS | RLS policies no Supabase (T036) + filtro `userId` em todas as queries |
| II — LGPD | Logs 90 dias + exclusão sob demanda | ✅ PASS | T029 (lgpd-logger) + T030 (delete-user-data) |
| III — AI Traceability | N/A neste módulo | ✅ N/A | Módulo de upload não expõe outputs de IA ao usuário |
| IV — Camada de serviço | Regras de negócio em `*.service.ts` | ✅ PASS | `uploads.service.ts` centraliza `estimateCredits`, `blockCredits`, `refundCredits` |
| V — Cost Accounting | Reserva antes de processar + reconciliação | ✅ PASS | FR-003 (bloqueio na presigned URL) + T021 (reconcile-credits) |
| V — Notificação 20%/5% | Alertas de saldo baixo | ✅ PASS | FR-015 + T039 adicionados após análise `/speckit.analyze` (2026-04-20) |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── uploads/
│   ├── page.tsx                          # Server Component — busca saldo inicial
│   ├── UploadClient.tsx                  # Client root — orquestra upload flow
│   ├── uploads.actions.ts               # Server Actions
│   ├── uploads.service.ts               # Regras de negócio (créditos, validação)
│   ├── components/
│   │   ├── FileUploadZone.tsx            # Drag-and-drop + file picker
│   │   ├── FileList.tsx                  # Lista de arquivos + barra de progresso + Realtime
│   │   ├── CreditPreview.tsx             # Estimativa + alertas de saldo baixo
│   │   ├── UploadConfirmButton.tsx       # Dispara presigned-url + upload XHR
│   │   └── ContextPromptSelector.tsx    # Dropdown de prompts (US3)
│   └── utils/
│       └── get-file-duration.ts          # Lê duração client-side via HTMLMediaElement
│
├── api/uploads/
│   ├── presigned-url/route.ts            # POST — valida, bloqueia créditos, gera URL
│   ├── confirm/route.ts                  # POST — confirma upload, enfileira Inngest
│   ├── jobs/route.ts                     # GET — lista jobs da usuária
│   └── jobs/[jobId]/route.ts             # GET detalhes / DELETE cancelar
│
├── api/webhooks/
│   └── clerk/route.ts                    # POST user.created → cria Wallet

inngest/functions/
├── process-transcription.ts             # Transcrição Groq + retry + onFailure
├── process-ai-analysis.ts               # Análise IA + retry + onFailure
├── reconcile-credits.ts                 # Reconciliação actual vs blocked
└── expire-pending-uploads.ts            # Cron 15min — expira presigned URLs

lib/
├── enums.ts                              # StatusProcessamento, EtapaProcessamento, etc.
├── email/upload-notifications.ts        # sendSuccessEmail, sendFailureEmail, sendExpiredUploadEmail, sendLowBalanceEmail
├── lgpd-logger.ts                        # Middleware de log de acesso (90 dias)
└── supabase/server.ts + browser.ts

__tests__/uploads/
├── uploads.service.test.ts              # estimateCredits, blockCredits, refundCredits
└── process-transcription.test.ts        # retry logic + credit refund on failure
```

**Structure Decision**: Next.js App Router full-stack — front-end e back-end no mesmo projeto. Feature organizada em `app/uploads/` com separação clara entre Server Components, Client Components, Server Actions e service layer.

## Complexity Tracking

> Nenhuma violação da Constituição identificada. Todos os gates passados.
