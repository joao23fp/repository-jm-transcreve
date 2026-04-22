# Research: Módulo 005 — Admin & Billing Dashboard

**Feature**: 005-admin-billing-dashboard
**Date**: 2026-04-22
**Status**: Complete

---

## 1. Gateway de Pagamento — Pagar.me

**Decision**: Pagar.me com hosted checkout (redirect flow).

**Rationale**: Usuária é redirecionada para a página hospedada do Pagar.me; retorna via `return_url` após pagamento. Sem PCI scope no nosso servidor — Pagar.me lida com todos os dados do cartão.

**Fluxo**:
```
1. POST /api/billing/payment-intents → cria Order no Pagar.me → retorna checkout_url
2. Servidor salva PaymentIntent { status: PENDING, expiresAt: now+24h }
3. Usuária é redirecionada para checkout_url (Pagar.me)
4. Após pagamento: Pagar.me redireciona para /dashboard?payment=<id>
5. Dashboard exibe banner "Aguardando confirmação"
6. Pagar.me envia webhook POST /api/webhooks/pagarme com event = order.paid
7. Servidor valida HMAC-SHA256, credita minutos, atualiza status SUCCEEDED
```

**Webhook Validation**:
- Header: `x-pagarme-signature` contém HMAC-SHA256 do body com a secret key da conta
- Validar antes de qualquer mutação: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`

**Alternatives considered**:
- Stripe: descartado — Constitution define Pagar.me como gateway nacional obrigatório
- Embedded iframe: descartado — aumenta PCI scope sem benefício claro no MVP

---

## 2. Biblioteca de Gráficos

**Decision**: Recharts via shadcn/ui `Chart` component (`npx shadcn@latest add chart`).

**Rationale**: Zero dependências adicionais — shadcn/ui já usa Recharts internamente. Componentes `BarChart` prontos com tema dark automático via CSS vars. Consistência visual com o restante da UI.

**Uso**:
```tsx
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
// Dados: [{ date: '01/04', minutes: 12 }, ...]
```

**Alternatives considered**:
- Chart.js: mais pesado, API imperativa, não integra com shadcn/ui
- Tremor: descontinuado para novo shadcn/ui ecosystem
- Victory: boa API mas 40kb extra desnecessário

---

## 3. Atualização em Tempo Real do Saldo

**Decision**: Supabase Realtime — canal `wallet:{userId}` escuta UPDATE na tabela `Wallet`.

**Rationale**: Já configurado e em uso no Módulo 001 (canal `job-status:{userId}`). Zero setup adicional. Garante que múltiplos navegadores abertos veem saldo atualizado simultaneamente.

**Padrão**:
```ts
supabase
  .channel(`wallet:${userId}`)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Wallet', filter: `userId=eq.${userId}` },
    (payload) => setWallet(payload.new))
  .subscribe()
```

---

## 4. Expiração de PaymentIntent

**Decision**: Inngest cron `expire-payment-intents` com schedule `0 * * * *` (a cada hora).

**Rationale**: Consistente com o padrão de cron jobs do Módulo 001 (`expire-pending-uploads` a cada 15min). 24h de janela para confirmação é suficiente; checagem horária é eficiente.

**Ação**: Buscar `PaymentIntent` com `status = PENDING` e `expiresAt < now` → marcar `EXPIRED` → não há créditos a estornar (créditos só são creditados após webhook de sucesso).

---

## 5. Escopo de FR-002, FR-003, FR-004 neste Módulo

**Decision**: FR-002 (bloqueio), FR-003 (reconciliação) e FR-004 (validação de saldo) já são implementados no Módulo 001 (`uploads.service.ts`). O Módulo 005 **não reimplementa** essa lógica — apenas a **exibe** no dashboard.

**Rationale**: DRY. A camada de serviço do Módulo 001 é a única fonte de verdade para operações de crédito. O dashboard consome o estado resultante (via `Wallet`, `CreditReservation`, `Transaction`).

**Impacto no plan**: Módulo 005 adiciona apenas:
- Modelo `Transaction` (audit log de todas as operações)
- Modelo `PaymentIntent` (ciclo de vida do checkout)
- UI do dashboard (leitura + fluxo de compra)
- Inngest function de expiração de PaymentIntent

---

## 6. Cobrança Recorrente vs. Pacotes Avulsos

**Decision**: MVP cobre exclusivamente pacotes avulsos (one-time purchase). Cobrança recorrente (assinatura mensal) é funcionalidade futura.

**Rationale**: Spec US2 descreve "Comprar Créditos" como compra pontual de pacotes. Constitution menciona "cobrança recorrente" como política de billing futura. Módulo 005 implementa apenas o fluxo de compra avulsa via Pagar.me Orders API.

---

## 7. Transaction Model — Registro de Auditoria

**Decision**: Criar `Transaction` row para cada operação de crédito:

| Tipo | Quando | amountMinutes |
|------|--------|---------------|
| `COMPRA` | Webhook `order.paid` confirmado | +N (positivo) |
| `BLOQUEIO` | `blockCredits()` no Módulo 001 | -N (negativo) |
| `ESTORNO` | `refundCredits()` no Módulo 001 | +N (positivo) |
| `CONSUMO` | `reconcileCredits()` — diferença bloqueado vs real | -N (negativo) |

**Rationale**: Constitution Principle V MUST: "All transactions are logged and reconcilable via the Admin Dashboard."
