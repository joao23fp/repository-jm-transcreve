# Implementation Plan: Módulo 005 — Admin & Billing Dashboard

**Branch**: `005-admin-billing-dashboard` | **Date**: 2026-04-22
**Spec**: [spec.md](./spec.md)

## Summary

Dashboard centralizado de créditos com: visualização de saldo em tempo real (Supabase Realtime), gráfico de uso (Recharts via shadcn/ui), histórico de transações paginado, e fluxo de compra de pacotes via Pagar.me (hosted checkout redirect). Novos modelos `Transaction` (audit log de todas as operações de crédito) e `PaymentIntent` (ciclo de vida do checkout) são adicionados ao schema. A lógica de bloqueio/estorno/reconciliação de créditos **não é reimplementada** — o Módulo 005 reutiliza o `uploads.service.ts` do Módulo 001 e apenas exibe o estado resultante.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.2.4 (App Router)
**Primary Dependencies**: Prisma, Inngest, Supabase Realtime, Clerk, Resend, shadcn/ui (Chart component), Pagar.me API
**Storage**: PostgreSQL via Supabase; sem novos arquivos em Storage
**Testing**: Vitest — regras críticas: webhook validation, idempotência de PaymentIntent
**Target Platform**: Web (Vercel)
**Performance Goals**: Saldo atualizado em ≤30s após webhook; Realtime ≤2s; dashboard carrega em ≤1s
**Constraints**: Pagar.me sandbox para testes; webhook HMAC-SHA256 obrigatório; sem PCI scope no servidor

## Constitution Check

| Princípio | Gate | Status | Notas |
|-----------|------|--------|-------|
| I — Spec-First | Spec + clarifications antes de código | ✅ PASS | spec.md com 8 cenários de teste |
| II — Idempotência + Logs | Webhooks idempotentes; transactions logadas | ✅ PASS | `webhookReceivedAt` previne reprocessamento; `Transaction` model para auditoria |
| II — Isolamento | Nenhuma usuária acessa dados de outra | ✅ PASS | Todos endpoints filtram por `userId` do Clerk |
| II — LGPD | Logs de acesso 90 dias | ✅ PASS | `lgpd-logger` aplicado nas novas rotas `/api/billing/*` |
| IV — Camada de serviço | Regras de negócio em `*.service.ts` | ✅ PASS | `billing.service.ts` centraliza createPaymentIntent, confirmPayment, expireIntent |
| V — Saldo nunca negativo | Validação antes de processar | ✅ PASS | Reutiliza `checkBalance()` do Módulo 001 |
| V — Pagar.me | Gateway nacional obrigatório | ✅ PASS | Pagar.me Orders API com hosted checkout |
| V — Transactions logadas | Toda operação de crédito cria Transaction | ✅ PASS | Invariante no `billing.service.ts` |
| V — Notificação 20%/5% | Alertas de saldo baixo | ✅ PASS | Reutiliza `sendLowBalanceEmail` do Módulo 001; lógica de threshold em `billing.service.ts` |

## Project Structure

```text
app/
├── dashboard/
│   ├── page.tsx                          # Server Component — busca wallet + transactions
│   ├── DashboardClient.tsx               # Client root — Realtime subscription
│   └── components/
│       ├── WalletCard.tsx                # Saldo + cor semântica + botão Comprar
│       ├── UsageChart.tsx                # Recharts BarChart — uso últimos 30 dias
│       ├── TransactionHistory.tsx        # Lista paginada de transactions
│       └── PurchaseModal.tsx             # Seleção de plano + redirect checkout

app/api/billing/
├── wallet/route.ts                       # GET — saldo + stats + pendingIntent
├── transactions/route.ts                 # GET — histórico paginado por cursor
├── payment-intents/route.ts             # POST — criar Order no Pagar.me
└── payment-intents/[id]/route.ts        # GET — polling de status

app/api/webhooks/
└── pagarme/route.ts                     # POST — receber eventos Pagar.me (HMAC-SHA256)

app/billing/
└── billing.service.ts                   # createPaymentIntent, confirmPayment, expireIntent, createTransaction

inngest/functions/
└── expire-payment-intents.ts            # Cron horário — expirar PaymentIntents vencidos

prisma/
└── schema.prisma                        # + TipoTransacao, StatusPagamento, Transaction, PaymentIntent
```

## Phase 0 Artifacts

- [research.md](research.md) — decisões: Pagar.me redirect flow, Recharts, Realtime, cron expiry, escopo de FR-002/003/004

## Phase 1 Artifacts

- [data-model.md](data-model.md) — 2 novos enums + 2 novos modelos (Transaction, PaymentIntent)
- [contracts/api-contracts.md](contracts/api-contracts.md) — 5 endpoints + 4 UI component contracts
- [quickstart.md](quickstart.md) — 8 cenários de teste (checkout, webhook, saldo, Realtime)

## Complexity Tracking

Nenhuma violação de constituição identificada. FR-002/003/004 da spec são reutilizações de lógica existente do Módulo 001 — não há duplicação de implementação.

## Implementation Strategy

**MVP (US1 + US2 primeiro)**:
1. Migration: adicionar Transaction + PaymentIntent ao schema
2. `billing.service.ts` + endpoint GET /wallet
3. Dashboard page com WalletCard + UsageChart (dados reais)
4. Fluxo de compra: PurchaseModal + POST /payment-intents + webhook handler
5. **PARAR e VALIDAR**: Cenários 1, 2 e 7 do quickstart.md

**Incremento 2**:
6. Realtime subscription (DashboardClient)
7. Inngest `expire-payment-intents`
8. TransactionHistory paginado
9. Alertas de saldo 20%/5%
10. Polish + LGPD logging + validação Cenários 3–8
