# Data Model: Módulo 005 — Admin & Billing Dashboard

**Feature**: 005-admin-billing-dashboard
**Date**: 2026-04-22

---

## Modelos Existentes (sem alteração de schema)

| Modelo | Módulo | Uso neste módulo |
|--------|--------|-----------------|
| `Wallet` | 001 | Leitura: saldo atual, saldoBloqueado |
| `CreditReservation` | 001 | Leitura: reservas ativas por userId |
| `ProcessingJob` | 001 | Leitura: jobs recentes para histórico |

---

## Novos Modelos (adicionar ao schema.prisma)

### Enum: TipoTransacao

```prisma
enum TipoTransacao {
  COMPRA    // crédito via PaymentIntent confirmado
  BLOQUEIO  // débito temporário ao iniciar processamento
  ESTORNO   // crédito por falha ou reconciliação positiva
  CONSUMO   // débito final após reconciliação (real < bloqueado)
}
```

### Enum: StatusPagamento

```prisma
enum StatusPagamento {
  PENDING    // aguardando confirmação do webhook
  SUCCEEDED  // webhook order.paid recebido e validado
  FAILED     // webhook order.payment_failed
  EXPIRED    // 24h sem confirmação — cancelado automaticamente
}
```

### Model: Transaction

```prisma
model Transaction {
  id            String        @id @default(cuid())
  userId        String
  type          TipoTransacao
  amountMinutes Float         // positivo = crédito; negativo = débito
  refType       String?       // "PaymentIntent" | "ProcessingJob"
  refId         String?       // id do objeto de referência
  balanceAfter  Float         // saldoTotal após a operação
  description   String?       // texto legível para histórico
  createdAt     DateTime      @default(now())

  @@index([userId, createdAt])
  @@index([refType, refId])
}
```

### Model: PaymentIntent

```prisma
model PaymentIntent {
  id                String          @id  // ID do Pagar.me (order_id)
  userId            String
  amountCents       Int             // valor em centavos
  status            StatusPagamento @default(PENDING)
  minutesGranted    Int             // minutos a creditar após confirmação
  planLabel         String          // ex: "99 minutos", "199 minutos"
  checkoutUrl       String          // URL gerada pelo Pagar.me
  webhookReceivedAt DateTime?       // timestamp do primeiro webhook válido
  createdAt         DateTime        @default(now())
  expiresAt         DateTime        // createdAt + 24h

  @@index([userId, status])
  @@index([status, expiresAt])  // índice para o cron de expiração
}
```

---

## Alterações em Modelos Existentes

### Wallet — adicionar relação Transaction

```prisma
// Adicionar ao model Wallet:
transactions   Transaction[]   @relation("WalletTransactions")
paymentIntents PaymentIntent[] @relation("WalletPaymentIntents")
```

> **Nota de implementação**: As relações acima são implícitas via `userId` — não requerem FK explícita no schema Prisma (Transaction e PaymentIntent usam `userId` como chave de busca, não FK direta para Wallet). Manter assim para evitar migração destrutiva do Wallet existente.

---

## Diagrama de Relacionamentos

```
Wallet (userId)
  ├─── CreditReservation[] (Módulo 001)
  ├─── ProcessingJob[] (Módulo 001)
  ├─── Transaction[] (Módulo 005) ← novo
  └─── PaymentIntent[] (Módulo 005) ← novo

PaymentIntent
  └── [após SUCCEEDED] → cria Transaction { type: COMPRA }
                        → atualiza Wallet.saldoTotal += minutesGranted
```

---

## Invariantes

1. `Wallet.saldoTotal` NUNCA fica negativo (validado em `checkBalance()` — Módulo 001)
2. Toda operação que muta `Wallet.saldoTotal` ou `saldoBloqueado` DEVE criar uma `Transaction`
3. `PaymentIntent.minutesGranted` só é creditado após webhook com `status = SUCCEEDED` e HMAC válido
4. `Transaction.balanceAfter` deve refletir o `Wallet.saldoTotal` exato após a operação (para auditoria)
