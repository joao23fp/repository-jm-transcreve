# API Contracts: Módulo 005 — Admin & Billing Dashboard

**Date**: 2026-04-22

---

## GET /api/billing/wallet

Retorna saldo atual + estatísticas de uso dos últimos 30 dias.

**Auth**: Clerk — userId extraído do token

**Response 200**:
```json
{
  "saldoTotal": 99,
  "saldoBloqueado": 8,
  "saldoDisponivel": 91,
  "usageLast30Days": [
    { "date": "2026-04-01", "minutesConsumed": 12 },
    { "date": "2026-04-02", "minutesConsumed": 0 }
  ],
  "pendingPaymentIntent": {
    "id": "or_abc123",
    "planLabel": "99 minutos",
    "createdAt": "2026-04-22T10:00:00Z",
    "expiresAt": "2026-04-23T10:00:00Z"
  } | null
}
```

---

## GET /api/billing/transactions

Lista histórico de transações paginado.

**Query params**: `cursor` (cuid, opcional), `limit` (default: 20, max: 50)

**Response 200**:
```json
{
  "items": [
    {
      "id": "clx...",
      "type": "COMPRA",
      "amountMinutes": 99,
      "balanceAfter": 142,
      "description": "Pacote 99 minutos",
      "createdAt": "2026-04-22T10:30:00Z"
    }
  ],
  "nextCursor": "clx..." | null
}
```

---

## POST /api/billing/payment-intents

Cria uma Order no Pagar.me e retorna a URL de checkout.

**Body**:
```json
{ "planId": "plan_99" }
```

Planos válidos: `plan_99` (99 min, R$49,90), `plan_199` (199 min, R$89,90), `plan_499` (499 min, R$189,90)

**Response 201**:
```json
{
  "paymentIntentId": "or_abc123",
  "checkoutUrl": "https://checkout.pagar.me/...",
  "expiresAt": "2026-04-23T10:00:00Z"
}
```

**Response 409**: se já existe PaymentIntent PENDING para o usuário — retorna o existente.

---

## POST /api/webhooks/pagarme

Recebe eventos do Pagar.me. Validado via HMAC-SHA256.

**Headers obrigatórios**: `x-pagarme-signature`

**Events tratados**:

| Event | Ação |
|-------|------|
| `order.paid` | Marcar SUCCEEDED, creditar minutos, criar Transaction, enviar email |
| `order.payment_failed` | Marcar FAILED |
| `order.canceled` | Marcar FAILED |

**Idempotência**: verificar `webhookReceivedAt` — se já preenchido, retornar 200 sem reprocessar.

**Response**: sempre `200 OK` com `{ "received": true }` (Pagar.me retenta em falhas).

---

## GET /api/billing/payment-intents/[id]

Polling do status de um PaymentIntent (usado pelo dashboard após retorno do checkout).

**Response 200**:
```json
{
  "id": "or_abc123",
  "status": "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED",
  "minutesGranted": 99,
  "planLabel": "99 minutos"
}
```

---

## UI Component Contracts

### WalletCard

```ts
type WalletCardProps = {
  saldoTotal: number
  saldoBloqueado: number
  saldoDisponivel: number
  onBuyClick: () => void
}
```
- Exibe saldo com cor semântica: verde (>20%), âmbar (≤20%), vermelho (≤5%)
- Botão "Comprar Créditos" dispara `onBuyClick`

### UsageChart

```ts
type UsageChartProps = {
  data: { date: string; minutesConsumed: number }[]
}
```
- Bar chart Recharts com eixo X = datas (últimos 30 dias), eixo Y = minutos
- Altura fixa 180px; responsivo via `ChartContainer`

### TransactionHistory

```ts
type TransactionHistoryProps = {
  transactions: Transaction[]
  onLoadMore: () => void
  hasMore: boolean
}
```
- Lista com paginação por cursor; "Carregar mais" no rodapé

### PurchaseModal

```ts
type PurchaseModalProps = {
  open: boolean
  onClose: () => void
  onCheckoutRedirect: (checkoutUrl: string) => void
}
```
- Exibe 3 planos; clique em "Pagar" chama POST /api/billing/payment-intents → redireciona
