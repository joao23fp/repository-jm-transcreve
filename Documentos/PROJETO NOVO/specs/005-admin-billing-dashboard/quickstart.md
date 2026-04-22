# Quickstart & Test Scenarios: Módulo 005 — Admin & Billing Dashboard

**Date**: 2026-04-22

---

## Setup Local

```bash
# 1. Variáveis de ambiente necessárias (.env)
PAGARME_API_KEY=ak_test_...        # chave Pagar.me sandbox
PAGARME_WEBHOOK_SECRET=whsec_...   # secret para validação HMAC
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 2. Rodar migration após adicionar Transaction e PaymentIntent
npx prisma migrate dev --name add-billing-module

# 3. Subir dev server + Inngest dev server
npm run dev
npx inngest-cli@latest dev
```

---

## Cenário 1: Visualizar Dashboard com Saldo

**Pré-requisito**: usuária autenticada com Wallet existente (criada via webhook Clerk)

1. Acessar `http://localhost:3000/dashboard`
2. **Esperado**: card exibe saldo atual em minutos com cor verde
3. **Esperado**: gráfico de uso mostra barras para últimos 30 dias (pode ser zerado se sem jobs)
4. **Esperado**: histórico de transações vazio ou com itens de módulo 001

---

## Cenário 2: Comprar Créditos — Fluxo Completo

1. Clicar "Comprar Créditos" no WalletCard
2. Modal exibe 3 planos: 99 min, 199 min, 499 min
3. Selecionar "99 minutos" e clicar "Pagar"
4. **Esperado**: POST `/api/billing/payment-intents` cria Order no Pagar.me sandbox
5. **Esperado**: browser redireciona para `checkoutUrl` do Pagar.me
6. No sandbox, completar pagamento com cartão de teste `4000000000000010`
7. **Esperado**: Pagar.me redireciona para `/dashboard?payment=or_abc123`
8. **Esperado**: banner topo exibe "Pagamento em Processamento"
9. Simular webhook: `curl -X POST http://localhost:3000/api/webhooks/pagarme -H "x-pagarme-signature: <hmac>" -d '{"type":"order.paid","data":{"id":"or_abc123"}}'`
10. **Esperado**: dentro de 30s — saldo atualizado, banner desaparece, Transaction COMPRA visível no histórico

---

## Cenário 3: PaymentIntent Duplicado

1. Criar um PaymentIntent (Cenário 2, passos 1–4)
2. Antes de completar pagamento, clicar "Comprar" novamente
3. **Esperado**: API retorna 409 com o PaymentIntent existente (não cria duplicata)
4. **Esperado**: modal mostra "Você já tem um pagamento pendente" com link "Retomar"

---

## Cenário 4: Saldo Bloqueado Durante Processamento

1. Ter saldo de 20 minutos no dashboard
2. Fazer upload de arquivo estimado em 15 minutos (Módulo 001)
3. **Esperado**: dashboard exibe "5 disponíveis (15 bloqueados)" com ícone âmbar
4. Aguardar processamento concluir
5. **Esperado**: saldo reconciliado — se consumiu 13 min, estorno de 2 min aparece no histórico

---

## Cenário 5: Alerta de Saldo Baixo (20%)

1. Ter usuária com saldoTotal de 100 minutos
2. Via `prisma studio` ou seed, reduzir saldo para 20 minutos
3. Completar um job de processamento que leve o saldo abaixo de 20 minutos
4. **Esperado**: toast "Aviso: Saldo em 20% (20/100 minutos)" com botão "Comprar"
5. **Esperado**: email `sendLowBalanceEmail` disparado (verificar Resend logs)

---

## Cenário 6: Expiração de PaymentIntent

1. Criar PaymentIntent mas não completar pagamento
2. Via `prisma studio`, setar `expiresAt = now() - 1 minute`
3. Aguardar o cron `expire-payment-intents` rodar (ou forçar via Inngest dev server)
4. **Esperado**: PaymentIntent marcado como EXPIRED
5. **Esperado**: banner desaparece do dashboard (Realtime update)

---

## Cenário 7: Webhook Inválido (Segurança)

```bash
# Enviar webhook sem assinatura ou assinatura errada
curl -X POST http://localhost:3000/api/webhooks/pagarme \
  -H "Content-Type: application/json" \
  -H "x-pagarme-signature: invalida" \
  -d '{"type":"order.paid","data":{"id":"fake"}}'
```
**Esperado**: `401 Unauthorized` — sem mutação no banco

---

## Cenário 8: Múltiplos Navegadores — Consistência de Saldo

1. Abrir dashboard em dois navegadores com a mesma conta
2. Completar processamento em um deles
3. **Esperado**: ambos os navegadores mostram saldo atualizado via Supabase Realtime em <2s
