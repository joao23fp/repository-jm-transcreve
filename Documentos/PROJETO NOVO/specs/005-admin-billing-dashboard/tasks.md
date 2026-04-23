# Tasks: Módulo 005 — Admin & Billing Dashboard

**Feature**: `005-admin-billing-dashboard`
**Input**: Design documents from `/specs/005-admin-billing-dashboard/`
**Date**: 2026-04-22

**Organização**: Tarefas agrupadas por User Story para implementação e teste independentes.

## Format: `[ID] [P?] [Story?] Descrição com caminho de arquivo`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências pendentes)
- **[Story]**: A qual User Story esta tarefa pertence (US1–US4)

---

## Phase 1: Setup

**Propósito**: Preparar dependências e variáveis de ambiente necessárias para o módulo.

- [x] T001 Instalar componente Chart do shadcn/ui via `npx shadcn@latest add chart` (dependência do `UsageChart.tsx` — adiciona Recharts + wrapper `ChartContainer`)
- [x] T002 [P] Verificar/adicionar variáveis de ambiente em `.env` e `.env.example`: `PAGARME_API_KEY` (chave da conta Pagar.me sandbox), `PAGARME_WEBHOOK_SECRET` (secret HMAC), `NEXT_PUBLIC_APP_URL` (usado na `return_url` do checkout)

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Propósito**: Schema do banco + camada de serviço que TODAS as user stories dependem.

**⚠️ CRÍTICO**: Nenhuma User Story pode começar antes desta fase estar completa.

- [x] T003 Adicionar enums `TipoTransacao` (COMPRA, BLOQUEIO, ESTORNO, CONSUMO) e `StatusPagamento` (PENDING, SUCCEEDED, FAILED, EXPIRED) + modelos `Transaction` e `PaymentIntent` ao `prisma/schema.prisma` conforme `specs/005-admin-billing-dashboard/data-model.md`
- [x] T004 Gerar e aplicar migration: `npx prisma migrate dev --name add-billing-module` em `prisma/migrations/`
- [x] T005 [P] Criar `app/billing/billing.service.ts` com funções: `getWalletWithStats(userId)` (retorna saldo + array usage últimos 30 dias + pendingPaymentIntent), `createPaymentIntent(userId, planId)` (cria Order na Pagar.me API + salva `PaymentIntent` com `expiresAt = now + 24h`), `confirmPayment(paymentIntentId)` (HMAC já validado no webhook; credita `minutesGranted` em `Wallet.saldoTotal` + cria `Transaction { type: COMPRA }` atomicamente via `prisma.$transaction()`), `expireIntent(paymentIntentId)` (marca `EXPIRED`), `createTransaction(tx, userId, type, amountMinutes, refType, refId, balanceAfter, description)` (helper para criar `Transaction` row dentro de uma `prisma.$transaction()`)
- [x] T006 [P] Adicionar matcher `/api/billing/(.*)` ao middleware Clerk em `middleware.ts` para proteger todas as rotas de billing

**Checkpoint**: Migration aplicada + `billing.service.ts` compilando sem erros → fases de US podem começar

---

## Phase 3: User Story 1 — Visualização de Saldo & Histórico (Priority: P1) 🎯 MVP

**Goal**: Usuária acessa `/dashboard` e visualiza saldo em destaque, gráfico de uso dos últimos 30 dias e histórico de transações com atualização em tempo real.

**Teste Independente**: Acessar `/dashboard`; ver saldo com cor semântica; gráfico com barras por dia; histórico de transações paginado.

- [x] T007 [P] [US1] Criar `app/api/billing/wallet/route.ts`: `GET` autenticado via Clerk; chama `getWalletWithStats(userId)`; retorna `{ saldoTotal, saldoBloqueado, saldoDisponivel, usageLast30Days, pendingPaymentIntent }` (contrato: `api-contracts.md#GET-wallet`)
- [x] T008 [P] [US1] Criar `app/api/billing/transactions/route.ts`: `GET` com query params `cursor` e `limit` (default 20, max 50); filtra por `userId`; ordena `createdAt DESC`; retorna `{ items, nextCursor }` (contrato: `api-contracts.md#GET-transactions`)
- [x] T009 [P] [US1] Criar `app/dashboard/components/WalletCard.tsx`: exibe `saldoDisponivel` em fonte grande com cor semântica — verde quando `saldoDisponivel/saldoTotal > 0.20`, âmbar quando `≤ 0.20`, vermelho quando `≤ 0.05`; exibe `saldoBloqueado` em linha secundária quando > 0; botão "Comprar Créditos" dispara `onBuyClick` (contrato: `api-contracts.md#WalletCard`)
- [x] T010 [P] [US1] Criar `app/dashboard/components/UsageChart.tsx`: `BarChart` do Recharts envolvido em `ChartContainer` do shadcn/ui; eixo X = datas formatadas como `dd/MM`; eixo Y = minutos; altura fixa 180px; responsivo via CSS; dados recebidos como `{ date: string; minutesConsumed: number }[]` (contrato: `api-contracts.md#UsageChart`)
- [x] T011 [P] [US1] Criar `app/dashboard/components/TransactionHistory.tsx`: lista de transações com ícone por tipo (COMPRA=verde+, BLOQUEIO=âmbar−, ESTORNO=verde+, CONSUMO=vermelho−); exibe `description`, `amountMinutes` com sinal, `balanceAfter`, data formatada; botão "Carregar mais" quando `hasMore: true` dispara `onLoadMore` (contrato: `api-contracts.md#TransactionHistory`)
- [x] T012 [US1] Criar `app/dashboard/DashboardClient.tsx`: Client Component raiz; recebe props iniciais `{ wallet, transactions, hasMore, userId }`; assina canal Supabase Realtime `wallet:{userId}` — ao receber UPDATE na tabela `Wallet`, atualiza `wallet` state; gerencia estado de `purchaseModalOpen`, paginação do histórico; renderiza `WalletCard`, `UsageChart`, `TransactionHistory`, `PurchaseModal`
- [x] T013 [US1] Criar `app/dashboard/page.tsx`: Server Component; verifica auth Clerk (redirect para `/uploads` se não autenticado); busca `wallet` via `billing.service.getWalletWithStats(userId)` e primeiras 20 `Transaction` via Prisma; passa como props para `DashboardClient`

**Checkpoint**: US1 testável via Cenário 1 do quickstart.md

---

## Phase 4: User Story 2 — Fluxo de Compra com Reserva de Intenção (Priority: P1)

**Goal**: Usuária seleciona plano, é redirecionada para checkout Pagar.me, retorna ao dashboard com banner de status; webhook confirma pagamento e atualiza saldo em ≤30s.

**Teste Independente**: Clicar "Comprar" → modal com 3 planos → selecionar → redirect Pagar.me → retornar → banner; simular webhook → saldo atualizado em ≤30s.

- [x] T014 [P] [US2] Criar `app/api/billing/payment-intents/route.ts`: `POST`; validar `planId` em `{ plan_99: { minutes: 99, amountCents: 4990 }, plan_199: { minutes: 199, amountCents: 8990 }, plan_499: { minutes: 499, amountCents: 18990 } }`; verificar PaymentIntent PENDING existente para `userId` → retornar 409 com o existente; chamar `billing.service.createPaymentIntent(userId, planId)` → retornar `{ paymentIntentId, checkoutUrl, expiresAt }` (contrato: `api-contracts.md#POST-payment-intents`)
- [x] T015 [P] [US2] Criar `app/api/billing/payment-intents/[id]/route.ts`: `GET`; verificar que `PaymentIntent.userId === userId` autenticado (retornar 404 se não); retornar `{ id, status, minutesGranted, planLabel }` (contrato: `api-contracts.md#GET-payment-intent`)
- [x] T016 [US2] Criar `app/api/webhooks/pagarme/route.ts`: `POST`; ler raw body via `request.text()` ANTES de parsear JSON (necessário para HMAC correto); validar `x-pagarme-signature` via `crypto.createHmac('sha256', PAGARME_WEBHOOK_SECRET).update(rawBody).digest('hex')`; retornar 401 se inválido; buscar `PaymentIntent` pelo `data.id` do evento; verificar idempotência (`webhookReceivedAt != null` → return 200 sem reprocessar); tratar eventos: `order.paid` → `billing.service.confirmPayment()` + `sendSuccessPaymentEmail()`; `order.payment_failed` | `order.canceled` → marcar FAILED; sempre retornar `200 { "received": true }` (Pagar.me retenta em falhas 5xx)
- [x] T017 [US2] Criar `app/dashboard/components/PurchaseModal.tsx`: Dialog shadcn/ui; lista 3 planos com nome, minutos e preço formatado em R$; estado `selectedPlan` e `loading`; clique em "Pagar" → `POST /api/billing/payment-intents` → `window.location.href = checkoutUrl`; trata resposta 409 exibindo "Você já tem um pagamento pendente" com botão "Retomar" que redireciona para `checkoutUrl` existente (contrato: `api-contracts.md#PurchaseModal`)
- [x] T018 [US2] Integrar banner de status em `app/dashboard/DashboardClient.tsx`: ao montar, verificar `?payment=<id>` na URL via `useSearchParams`; se presente, iniciar polling `GET /api/billing/payment-intents/[id]` a cada 3s; exibir banner âmbar "Pagamento em Processamento — Aguardando confirmação" enquanto `PENDING`; remover banner e atualizar saldo quando `SUCCEEDED`; exibir banner vermelho "Pagamento não confirmado" quando `FAILED` ou `EXPIRED`

**Checkpoint**: US1 + US2 testáveis via Cenários 2, 3 e 7 do quickstart.md

---

## Phase 5: User Story 3 — Exibição de Créditos Bloqueados (Priority: P1)

**Goal**: Dashboard reflete em tempo real créditos bloqueados durante processamento de uploads; auditoria via Transaction rows.

**Teste Independente**: Iniciar upload de 15 min com saldo de 20 min → dashboard mostra "5 disponíveis (15 bloqueados)"; após conclusão → saldo reconciliado + Transaction ESTORNO visível.

- [x] T019 [P] [US3] Atualizar `app/uploads/uploads.service.ts`: em `blockCredits()`, após `prisma.$transaction()` que atualiza Wallet, adicionar chamada `createTransaction(tx, userId, 'BLOQUEIO', -reservedMinutes, 'ProcessingJob', jobId, novoSaldoTotal - novoSaldoBloqueado, 'Bloqueio para processamento de ' + fileName)`; em `refundCredits()`, adicionar `createTransaction(tx, userId, type === 'FAILED' ? 'ESTORNO' : 'CONSUMO', deltaMinutes, 'ProcessingJob', jobId, balanceAfter, description)` (importar `createTransaction` de `app/billing/billing.service.ts`)
- [x] T020 [US3] ~~Atualizar `app/dashboard/components/WalletCard.tsx`~~ — **já implementado em T009** (Phase 3): WalletCard exibe linha secundária com ⏳ quando `saldoBloqueado > 0`

**Checkpoint**: US3 testável via Cenário 4 do quickstart.md

---

## Phase 6: User Story 4 — Alertas de Saldo Crítico (Priority: P2)

**Goal**: Usuária recebe email + toast quando saldo atinge 20% e 5%; cron expira PaymentIntents vencidos.

**Teste Independente**: Reduzir saldo para ≤20% via prisma → completar job → toast + email disparados; forcefully expirar PaymentIntent → marcado EXPIRED + banner desaparece.

- [x] T021 [P] [US4] Criar função Inngest cron `expire-payment-intents` com schedule `0 * * * *` em `inngest/functions/expire-payment-intents.ts`: buscar `PaymentIntent` com `status = 'PENDING'` e `expiresAt < now`; para cada um, chamar `billing.service.expireIntent(id)`; emitir evento Supabase Realtime `wallet:{userId}` para atualizar dashboard (FR-008)
- [x] T022 [P] [US4] Registrar `expire-payment-intents` no endpoint Inngest em `app/api/inngest/route.ts` — adicionar à lista de funções junto com as do Módulo 001 (T022 depende de T021)
- [x] T023 [US4] Atualizar `app/billing/billing.service.ts`: adicionar `checkAndNotifyLowBalance(userId, wallet)` — calcular `pct = saldoDisponivel / saldoTotal`; se `pct ≤ 0.20` chamar `sendLowBalanceEmail(userId, 20)` de `lib/email/upload-notifications.ts`; se `pct ≤ 0.05` chamar `sendLowBalanceEmail(userId, 5)`; evitar spam verificando via Prisma se já existe `Transaction` recente com `description LIKE 'Alerta saldo %${threshold}%'` e `createdAt > now - 24h` para esse `userId` — se existir, skip; chamar `checkAndNotifyLowBalance()` ao final de `confirmPayment()` e ao final da reconciliação de créditos no Módulo 001

**Checkpoint**: US4 testável via Cenários 5 e 6 do quickstart.md

---

## Phase 7: Polish & Preocupações Transversais

**Propósito**: LGPD, navegação, testes e validação end-to-end.

- [x] T024 [P] Aplicar `lgpd-logger` wrapper nas rotas `/api/billing/*` e `/api/webhooks/pagarme` — reutilizar `lib/lgpd-logger.ts` do Módulo 001; registrar `userId`, `action`, `resourceId`, `timestamp` (Constitution Princípio II — LGPD 90 dias)
- [x] T025 [P] Adicionar link "Dashboard" para `/dashboard` no header/navegação principal da aplicação — verificar se existe componente de navegação compartilhado ou adicionar em `app/layout.tsx`
- [x] T026 [P] Escrever testes Vitest em `__tests__/billing/billing.service.test.ts`: (1) validação HMAC do webhook — assinatura válida passa, inválida retorna 401; (2) idempotência de PaymentIntent — segundo POST retorna 409; (3) `createTransaction` atômica — se Wallet update falhar, Transaction não é criada
- [x] T028 [P] Implementar escalação de falha de webhook em `app/api/webhooks/pagarme/route.ts`: adicionar campo `webhookAttempts Int @default(0)` ao model `PaymentIntent` no `prisma/schema.prisma` (+ migration); no handler, incrementar `webhookAttempts` a cada chamada com evento válido que não resulte em SUCCEEDED; se `webhookAttempts >= 3` e status ainda PENDING, criar registro em tabela `WebhookAlert { id, paymentIntentId, userId, createdAt }` via Prisma e emitir Inngest event `billing/webhook.escalated` para revisão manual — previne pagamentos perdidos (Constitution Princípio II MUST)
- [ ] T027 ⏳ AGUARDA SANDBOX — Validar Cenários 1–8 do `specs/005-admin-billing-dashboard/quickstart.md` com Pagar.me sandbox configurado (requer `PAGARME_API_KEY` e `PAGARME_WEBHOOK_SECRET` reais no `.env`). Passos: (1) criar conta sandbox em pagar.me, (2) configurar variáveis de ambiente, (3) executar cada cenário do quickstart.md, (4) confirmar SC-001–SC-004

---

## Dependências & Ordem de Execução

### Dependências entre Fases

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: Depende do Setup — **BLOQUEIA todas as User Stories**
- **US1 (Phase 3)**: Depende da Foundational completa
- **US2 (Phase 4)**: Depende da Foundational; integra com US1 via `DashboardClient`
- **US3 (Phase 5)**: Depende da Foundational; modifica `uploads.service.ts` do Módulo 001 (T019)
- **US4 (Phase 6)**: Depende da Foundational; T023 depende de `sendLowBalanceEmail` do Módulo 001
- **Polish (Phase 7)**: Depende de todas as US desejadas completas

### Dependências dentro de cada User Story

```
US1:
  T007, T008, T009, T010, T011 podem rodar em paralelo
  T012 depende de T009, T010, T011 (componentes prontos para compor)
  T013 depende de T012 (DashboardClient existente)

US2:
  T014, T015 podem rodar em paralelo
  T016 depende de T005 (billing.service.confirmPayment existe)
  T017 independente (novo arquivo)
  T018 depende de T012 (modifica DashboardClient)

US3:
  T019 depende de T005 (importa createTransaction)
  T020 depende de T009 (modifica WalletCard)

US4:
  T021 independente (novo arquivo)
  T022 depende de T021
  T023 depende de T005 (modifica billing.service.ts)
```

### Oportunidades de Paralelismo

```bash
# Phase 1 — ambas em paralelo:
T001  instalar shadcn chart
T002  variáveis de ambiente

# Phase 2 — T005 e T006 após T003+T004:
T005  billing.service.ts
T006  middleware.ts

# Phase 3 — API routes e componentes em paralelo:
T007  api/billing/wallet
T008  api/billing/transactions
T009  WalletCard.tsx
T010  UsageChart.tsx
T011  TransactionHistory.tsx

# Phase 4 — API routes em paralelo:
T014  payment-intents/route.ts
T015  payment-intents/[id]/route.ts
T017  PurchaseModal.tsx

# Phase 6 — cron e registro em paralelo:
T021  expire-payment-intents.ts
T022  registrar no inngest/route.ts (após T021)

# Phase 7 — todos em paralelo:
T024, T025, T026
```

---

## Estratégia de Implementação

### MVP (US1 + US2 primeiro)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (**CRÍTICO**)
3. Completar Phase 3: US1 — Dashboard de saldo
4. Completar Phase 4: US2 — Fluxo de compra
5. **PARAR E VALIDAR**: Cenários 1, 2 e 7 do quickstart.md
6. Deploy/demo se aprovado

### Entrega Incremental

1. Setup + Foundational → base pronta
2. US1 completa → dashboard funcional
3. US2 completa → compra de créditos funcional
4. US3 completa → créditos bloqueados visíveis no dashboard
5. US4 completa → alertas + expiração automática
6. Polish → LGPD, testes, validação final

---

## Resumo

| Fase | Tarefas | User Story | Prioridade |
|------|---------|------------|------------|
| Phase 1: Setup | T001–T002 | — | Fundação |
| Phase 2: Foundational | T003–T006 | — | Bloqueante |
| Phase 3: US1 | T007–T013 | Saldo & Histórico | P1 🎯 MVP |
| Phase 4: US2 | T014–T018 | Fluxo de Compra | P1 |
| Phase 5: US3 | T019–T020 | Créditos Bloqueados | P1 |
| Phase 6: US4 | T021–T023 | Alertas Críticos | P2 |
| Phase 7: Polish | T024–T028 | — | Qualidade / LGPD |
| **Total** | **28 tarefas** | **4 user stories** | |

**Oportunidades de paralelismo**: 15 tarefas marcadas com [P]

**Critérios de aceite por história**:
- US1: SC-001 (saldo nunca negativo visível), dashboard carrega ≤1s, Cenário 1
- US2: SC-002 (saldo atualizado ≤30s após webhook), SC-004 (ciclo ≤5 min), Cenários 2–3–7
- US3: Créditos bloqueados visíveis em tempo real, Transaction BLOQUEIO/ESTORNO no histórico, Cenário 4
- US4: Email disparado nos limiares 20%/5%, PaymentIntent expirado automaticamente, Cenários 5–6
