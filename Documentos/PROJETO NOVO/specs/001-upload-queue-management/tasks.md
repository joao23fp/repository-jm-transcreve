# Tasks: Módulo de Envio Ágil — Upload & Queue Management

**Feature**: `001-upload-queue-management`
**Input**: Design documents from `/specs/001-upload-queue-management/`
**Branch**: `001-upload-queue-management`
**Date**: 2026-04-17

**Organização**: Tarefas agrupadas por User Story para permitir implementação e teste independentes de cada história.

## Format: `[ID] [P?] [Story?] Descrição com caminho de arquivo`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências pendentes)
- **[Story]**: A qual User Story esta tarefa pertence (US1, US2, US3)
- Caminhos exatos de arquivo incluídos em todas as descrições

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Propósito**: Inicialização dos artefatos base que todas as fases dependem

- [x] T001 Criar/atualizar `lib/enums.ts` com `StatusProcessamento`, `EtapaProcessamento`, `StatusReserva` e `FormatoAceito` conforme data-model.md
- [x] T002 [P] Verificar/criar cliente Inngest compartilhado em `inngest/client.ts` (exportar instância singleton `inngest`)
- [x] T003 [P] Verificar/criar helpers Supabase server + browser em `lib/supabase/server.ts` e `lib/supabase/browser.ts`

---

## Phase 2: Fundacional (Pré-requisitos Bloqueantes)

**Propósito**: Infraestrutura de dados e autenticação que DEVE estar completa antes de qualquer User Story

**⚠️ CRÍTICO**: Nenhuma User Story pode começar até esta fase estar concluída

- [x] T004 Adicionar modelos `ProcessingJob`, `FileUpload`, `CreditReservation` e complemento `Wallet` ao `prisma/schema.prisma` conforme data-model.md (incluindo enums, indexes e relações)
- [x] T005 Gerar e aplicar migration Prisma em `prisma/migrations/20260417_upload_queue/` — executar `npx prisma migrate dev --name upload_queue`
- [x] T006 [P] Proteger rotas `/api/uploads/*` com middleware Clerk em `middleware.ts` — adicionar matcher para o path `/api/uploads/(.*)`
- [x] T007 [P] Criar `app/uploads/uploads.service.ts` com funções: `estimateCredits(durationSeconds)`, `checkBalance(userId, minutes)`, `blockCredits(tx, userId, jobId, minutes)` (calcula `saldoDisponivel = saldoTotal - saldoBloqueado` explicitamente) e `refundCredits(jobId, reason)` usando `prisma.$transaction()`
- [x] T035 [P] Criar webhook Clerk `user.created` em `app/api/webhooks/clerk/route.ts`: verificar assinatura Svix, criar `Wallet` com `saldoTotal: 0` para nova usuária via `prisma.wallet.create()` (FR-014)
- [x] T036 [P] Configurar RLS policies no Supabase para tabelas `ProcessingJob`, `FileUpload` e `CreditReservation`: `USING (auth.uid()::text = "userId")` em `prisma/migrations/20260417_upload_queue_rls/migration.sql` (FR-009) — aplicar via `supabase db push` ou copiando o SQL no Supabase SQL Editor; documentar passo em `docs/supabase-setup.md`
- [x] T037 [P] Configurar CORS policy no bucket Supabase Storage: acessar Supabase Dashboard → Storage → bucket → CORS, adicionar origens `http://localhost:3000` e URL de produção com método `PUT` permitido — documentar passos em `docs/supabase-setup.md` (não é alteração de código; é configuração manual no dashboard)

**Checkpoint**: Foundation pronta — implementação das User Stories pode começar

---

## Phase 3: User Story 1 — Upload com Validação de Saldo (Priority: P1) 🎯 MVP

**Goal**: Usuária seleciona arquivos, vê estimativa de créditos, confirma upload → arquivos enviados via presigned URL ao Supabase Storage, créditos bloqueados atomicamente

**Teste Independente**: Selecionar 3 arquivos, visualizar estimativa e saldo (ex: "7 disponíveis / 3 bloqueados"), confirmar e ver barra de progresso em <2s

### Implementação — API Routes

- [x] T008 [P] [US1] Implementar `GET /api/uploads/jobs` com filtro por status, paginação por cursor e isolamento por `userId` em `app/api/uploads/jobs/route.ts`
- [x] T009 [P] [US1] Implementar `GET /api/uploads/jobs/[jobId]` (detalhes) e `DELETE /api/uploads/jobs/[jobId]` (cancelar + estornar; rejeitar se COMPLETED com 409) em `app/api/uploads/jobs/[jobId]/route.ts`
- [x] T010 [US1] Implementar `POST /api/uploads/presigned-url`: validar formatos/tamanho/duração, chamar `blockCredits()` em transaction, gerar presigned URL via Supabase Storage SDK, retornar `{ jobs, walletSnapshot }` em `app/api/uploads/presigned-url/route.ts`
- [x] T011 [US1] Implementar `POST /api/uploads/confirm`: verificar que `jobId` pertence à usuária autenticada; verificar idempotência (`uploadConfirmedAt` já preenchido → retornar 200 sem re-emitir evento); atualizar `FileUpload.uploadConfirmedAt`, mudar `currentStage` para `QUEUED`, emitir evento `upload/confirmed` via `inngest.send()` em `app/api/uploads/confirm/route.ts`

### Implementação — UI Components

- [x] T012 [P] [US1] Criar utilitário `getFileDuration(file: File): Promise<number>` (usa `HTMLMediaElement`, fallback por heurística de tamanho se `NaN`) em `app/uploads/utils/get-file-duration.ts`
- [x] T013 [P] [US1] Criar componente `FileUploadZone` (drag-and-drop + file picker, validação client-side de formato e tamanho, lê duração via `getFileDuration`) em `app/uploads/components/FileUploadZone.tsx`
- [x] T014 [P] [US1] Criar componente `CreditPreview` (exibe estimativa por arquivo e total, saldo disponível/bloqueado, alerta "Déficit de X minutos" quando saldo insuficiente) em `app/uploads/components/CreditPreview.tsx`
- [x] T015 [US1] Criar componente `FileList` (barra de progresso XHR `onprogress` por arquivo, etapa textual `UPLOADING`) em `app/uploads/components/FileList.tsx`
- [x] T016 [US1] Criar componente `UploadConfirmButton` (desabilitado quando saldo insuficiente, dispara `requestPresignedUrl` e inicia upload via XHR com presigned URL) em `app/uploads/components/UploadConfirmButton.tsx`
- [x] T017 [US1] Criar `app/uploads/uploads.actions.ts` com Server Actions: `requestPresignedUrl(files)` → chama POST presigned-url; `confirmUpload(jobId)` → chama POST confirm; `cancelJob(jobId)` → chama DELETE
- [x] T018 [US1] Montar `app/uploads/page.tsx` como Server Component: busca saldo inicial via RSC, compõe `FileUploadZone`, `FileList`, `CreditPreview`, `UploadConfirmButton`

**Checkpoint**: US1 funcionalmente completa — upload com bloqueio de créditos testável via Cenário 1 e 4 do quickstart.md

---

## Phase 4: User Story 2 — Processamento Assíncrono com Resiliência (Priority: P1)

**Goal**: Após upload confirmado, jobs processados em background com 3 retentativas, estorno automático em falha, notificações em tempo real (Realtime + email)

**Teste Independente**: Upload concluído → fechar navegador → aguardar Inngest processar → receber email de conclusão; simular falha → verificar estorno em <30s

### Implementação — Inngest Functions

- [x] T019 [P] [US2] Criar função Inngest `process-transcription` com `retries: 3`: step `transcribe` (Groq Whisper via URL do Supabase Storage); mapear erros Groq — `invalid_file`/`unsupported_format` → FAILED imediato sem retry; erros de serviço → retry normal; step `update-status` (muda `currentStage` para `TRANSCRIBING` → emite `transcript/completed`); `onFailure` handler (chama `refundCredits()` + `notifyUserFailure()`) em `inngest/functions/process-transcription.ts`
- [x] T020 [P] [US2] Criar função Inngest `process-ai-analysis` com `retries: 3`: step `analyze` (chama LLM com prompt de contexto), step `save-result` (salva transcrição, muda status para `COMPLETED`, atualiza `actualMinutesConsumed`), `onFailure` handler (estorno + email) em `inngest/functions/process-ai-analysis.ts`
- [x] T021 [P] [US2] Criar função Inngest `reconcile-credits`: ouvir evento `transcript/completed`, calcular diferença entre `blockedMinutes` e `actualMinutesConsumed`, estornar diferença se `actual < blocked`, atualizar `CreditReservation.status` para `RELEASED` em `inngest/functions/reconcile-credits.ts`
- [x] T022 [P] [US2] Criar helpers de email Resend em `lib/email/upload-notifications.ts`: `sendSuccessEmail(userId, fileName)`, `sendFailureEmail(userId, fileName, refundedMinutes)`, `sendExpiredUploadEmail(userId, fileName)` (template: "Seu upload de {filename} não foi concluído — o tempo expirou. Seus créditos foram estornados. Tente novamente.") e `sendLowBalanceEmail(userId, percentRemaining)` (FR-013, FR-015)

### Implementação — Realtime no Cliente

- [x] T023 [US2] Atualizar `FileList.tsx` para subscrever canal Supabase Realtime `job-status:{userId}` e atualizar etapas em tempo real (`QUEUED → TRANSCRIBING → ANALYZING → COMPLETED | FAILED`) com toast de notificação ao concluir em `app/uploads/components/FileList.tsx`

### Implementação — Registro Inngest

- [x] T024 [US2] Registrar as 4 funções Inngest (`process-transcription`, `process-ai-analysis`, `reconcile-credits`, `expire-pending-uploads`) no endpoint handler em `app/api/inngest/route.ts` — **depende de T038** (a função `expire-pending-uploads` deve existir antes de ser registrada aqui)
- [x] T038 [P] [US2] Criar função Inngest cron `expire-pending-uploads` com schedule `*/15 * * * *`: buscar `FileUpload` com `presignedUrlExpiresAt < now` e `uploadConfirmedAt` nulo → marcar `ProcessingJob` como `FAILED`, `CreditReservation.status` como `REFUNDED`, estornar créditos, enviar `sendExpiredUploadEmail()` em `inngest/functions/expire-pending-uploads.ts` (FR-013)

**Checkpoint**: US1 + US2 funcionalmente completas — testar Cenários 2, 3 e 5 do quickstart.md

---

## Phase 5: User Story 3 — Seleção de Contexto & Prompts Dinâmicos (Priority: P2)

**Goal**: Usuária escolhe um Prompt de Contexto antes de confirmar upload; prompt enviado à IA e persistido no job

**Teste Independente**: Abrir dropdown, selecionar "Resumo de Audiência", confirmar upload, verificar que `ProcessingJob.promptId` está preenchido e IA usa o prompt

### Implementação

- [x] T025 [P] [US3] Criar componente `ContextPromptSelector` (dropdown shadcn/ui listando prompts do sistema + prompts personalizados da usuária, retorna `promptId | null`) em `app/uploads/components/ContextPromptSelector.tsx`
- [x] T026 [US3] Atualizar `POST /api/uploads/presigned-url` para aceitar e persistir `promptId` opcional no `ProcessingJob`, incluir no evento `upload/confirmed` em `app/api/uploads/presigned-url/route.ts`
- [x] T027 [US3] Atualizar `process-ai-analysis.ts` para ler `promptId` do evento `transcript/completed`, buscar prompt do banco e incluir no payload do LLM em `inngest/functions/process-ai-analysis.ts`
- [x] T028 [US3] Integrar `ContextPromptSelector` na `page.tsx` e passar `promptId` para `UploadConfirmButton` → `uploads.actions.ts` → `requestPresignedUrl` em `app/uploads/page.tsx` e `app/uploads/uploads.actions.ts`

**Checkpoint**: US1 + US2 + US3 completas — testar Cenário 1 com prompt selecionado

---

## Phase 6: Polish & Preocupações Transversais

**Propósito**: Qualidade, conformidade e validação end-to-end

- [x] T039 [P] Implementar notificação de saldo baixo (FR-015): adicionar função `checkBalanceThresholds(userId, wallet)` em `app/uploads/uploads.service.ts` — se `saldoDisponivel/saldoTotal ≤ 0.20` exibe badge âmbar no `CreditPreview`; se `≤ 0.05` exibe badge vermelho; na primeira vez que cada limiar for cruzado por sessão chama `sendLowBalanceEmail()` em `lib/email/upload-notifications.ts`; chamar após `blockCredits()` e `refundCredits()`
- [x] T029 [P] Implementar middleware de log de acesso LGPD (FR-010): registrar `userId`, `action`, `resourceId`, `timestamp` para rotas `/api/uploads/*` com retenção de 90 dias em `lib/lgpd-logger.ts` e injetar via wrapper nas route handlers
- [x] T030 [P] Implementar endpoint de exclusão sob demanda LGPD (FR-011): deletar `ProcessingJob`, `FileUpload`, `CreditReservation` e arquivos no Storage para `userId` em `app/api/uploads/delete-user-data/route.ts`
- [x] T031 [P] Adicionar instrumentação Sentry nos handlers `onFailure` e nos steps críticos das funções Inngest em `inngest/functions/process-transcription.ts` e `inngest/functions/process-ai-analysis.ts`
- [x] T032 [P] Escrever testes Vitest para regras críticas de negócio: `estimateCredits`, `blockCredits` (overdraft prevention), `refundCredits`, validação de formatos em `__tests__/uploads/uploads.service.test.ts`
- [x] T033 [P] Escrever testes Vitest para retry logic e credit refund no `onFailure` handler em `__tests__/uploads/process-transcription.test.ts`
- [x] T034 Validar Cenários 1–6 do `specs/001-upload-queue-management/quickstart.md` em ambiente local com Inngest dev server; confirmar SC-001 (estimativa exibida em <30s), SC-002 (simular falhas e verificar retry + estorno), SC-003 (barra de progresso aparece em <2s após confirmar upload), SC-004 (saldo correto após reconciliação), SC-005 (email recebido após conclusão)

---

## Dependências & Ordem de Execução

### Dependências entre Fases

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: Depende do Setup — **BLOQUEIA todas as User Stories**
- **US1 (Phase 3)**: Depende da Foundational completa
- **US2 (Phase 4)**: Depende da US1 completa (componentes FileList, endpoints confirm/jobs)
- **US3 (Phase 5)**: Depende da Foundational; integra com US1 e US2 mas é independentemente testável
- **Polish (Phase 6)**: Depende de todas as US desejadas estarem completas

### Dependências dentro de cada User Story

```
US1:
  T012, T013, T014 podem rodar em paralelo (arquivos diferentes)
  T015 → T016 → T017 → T018 (dependência de composição)
  T010 depende de T007 (uploads.service.ts)
  T011 depende de T010 (precisa do jobId criado)

US2:
  T019, T020, T021, T022 podem rodar em paralelo (arquivos diferentes)
  T023 depende de T015 (modifica FileList criado na US1)
  T024 depende de T019, T020, T021

US3:
  T025 independente (novo arquivo)
  T026 modifica route.ts criado em T010 (pode começar após T010)
  T027 modifica processo criado em T020 (pode começar após T020)
  T028 depende de T025, T026
```

### Oportunidades de Paralelismo

```bash
# Phase 1 — todos em paralelo:
Task T001: lib/enums.ts
Task T002: inngest/client.ts
Task T003: lib/supabase/server.ts + browser.ts

# Phase 2 — T006 e T007 em paralelo após T004+T005:
Task T006: middleware.ts
Task T007: uploads.service.ts

# Phase 3 — API routes independentes:
Task T008: app/api/uploads/jobs/route.ts
Task T009: app/api/uploads/jobs/[jobId]/route.ts
Task T012: utils/get-file-duration.ts
Task T013: components/FileUploadZone.tsx
Task T014: components/CreditPreview.tsx

# Phase 4 — Inngest functions + email todos em paralelo:
Task T019: inngest/functions/process-transcription.ts
Task T020: inngest/functions/process-ai-analysis.ts
Task T021: inngest/functions/reconcile-credits.ts
Task T022: lib/email/upload-notifications.ts

# Phase 6 — todos em paralelo:
Task T029, T030, T031, T032, T033
```

---

## Estratégia de Implementação

### MVP Mínimo (User Story 1 apenas)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (**CRÍTICO**)
3. Completar Phase 3: User Story 1
4. **PARAR E VALIDAR**: Testar Cenários 1, 2 e 4 do quickstart.md
5. Deploy/demo se aprovado

### Entrega Incremental

1. Setup + Foundational → base pronta
2. US1 completa → testar → deploy (MVP!)
3. US2 completa → testar → deploy (processamento resiliente)
4. US3 completa → testar → deploy (personalização com prompts)
5. Polish → deploy final com conformidade LGPD

---

## Resumo

| Fase | Tarefas | User Story | Prioridade |
|------|---------|------------|------------|
| Phase 1: Setup | T001–T003 | — | Fundação |
| Phase 2: Foundational | T004–T007 | — | Bloqueante |
| Phase 3: US1 | T008–T018 | Upload + Saldo | P1 🎯 MVP |
| Phase 4: US2 | T019–T024 | Processamento Assíncrono | P1 |
| Phase 5: US3 | T025–T028 | Prompts de Contexto | P2 |
| Phase 6: Polish | T029–T034, T039 | — | Qualidade / LGPD |
| **Total** | **39 tarefas** | **3 user stories** | |

**Oportunidades de paralelismo**: 19 tarefas marcadas com [P]

**Critérios de aceite por história**:
- US1: SC-001 (estimativa <30s), SC-003 (barra de progresso <2s), Cenários 1 e 4 do quickstart
- US2: SC-002 (99% sucesso após retries), SC-004 (100% reconciliação), SC-005 (email <2h), Cenários 2, 3 e 5
- US3: Prompt persistido em `ProcessingJob.promptId` e aplicado na análise de IA
