# Quickstart: Módulo de Envio Ágil

**Feature**: 001-upload-queue-management
**Date**: 2026-04-17

Guia para validar o módulo end-to-end após implementação.

---

## Pré-requisitos

- Ambiente local rodando (`npm run dev`)
- Supabase local ou projeto de staging configurado
- Inngest dev server rodando (`npx inngest-cli dev`)
- Variáveis de ambiente configuradas:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  GROQ_API_KEY=
  INNGEST_SIGNING_KEY=
  INNGEST_EVENT_KEY=
  RESEND_API_KEY=
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  CLERK_SECRET_KEY=
  ```
- Conta de teste com pelo menos 10 minutos de saldo na Wallet

---

## Cenário 1 — Upload com Saldo Suficiente (P1, User Story 1)

1. Acesse `/uploads` na aplicação
2. Arraste um arquivo de áudio MP3 de ~3 minutos para a zona de upload
3. **Verificar**: estimativa de créditos exibida (ex: "3 minutos")
4. **Verificar**: saldo disponível atualizado (ex: "7 disponíveis (3 bloqueados)")
5. Clique em "Confirmar Upload"
6. **Verificar**: barra de progresso aparece em <2 segundos com etapa "Enviando"
7. Aguarde conclusão do upload
8. **Verificar**: etapa muda para "Na fila" em <60 segundos
9. Aguarde processamento no Inngest dev server
10. **Verificar**: etapa muda para "Transcrevendo" → "Concluído"
11. **Verificar**: toast de notificação exibido
12. **Verificar**: email recebido (Resend dev mode)
13. **Verificar**: saldo reconciliado (ex: se durou 2min 40s → estorno de 20s)

**Critério de aceite**: SC-001, SC-002, SC-003, SC-004 ✅

---

## Cenário 2 — Saldo Insuficiente (Edge Case)

1. Defina saldo da conta de teste para 2 minutos
2. Selecione um arquivo de 5 minutos
3. **Verificar**: alerta "Déficit de 3 minutos" exibido antes de confirmar
4. **Verificar**: botão "Confirmar Upload" bloqueado

---

## Cenário 3 — Falha na Transcrição (Retry + Estorno)

1. Configure o mock do Groq para retornar erro nas 3 primeiras chamadas
2. Faça upload de um arquivo válido
3. **Verificar**: job entra em PROCESSING, status muda para FAILED após 3 tentativas
4. **Verificar**: créditos bloqueados estornados em <30 segundos
5. **Verificar**: email de falha recebido com informação de estorno

---

## Cenário 4 — Formato Não Suportado

1. Tente fazer upload de um arquivo `.flac`
2. **Verificar**: rejeição imediata com mensagem "Formato não suportado"
3. **Verificar**: nenhum crédito bloqueado, nenhum job criado

---

## Cenário 5 — Múltiplos Arquivos Simultâneos

1. Selecione 5 arquivos de ~1 minuto cada
2. **Verificar**: estimativa total exibida (5 minutos)
3. Confirme o upload
4. **Verificar**: 5 barras de progresso independentes
5. **Verificar**: fila FIFO processando um a um no Inngest
6. **Verificar**: notificação individual por arquivo ao concluir

---

## Cenário 6 — Isolamento de Usuária (Segurança)

1. Faça login com conta A, inicie um upload
2. Em outra sessão, faça login com conta B
3. **Verificar**: conta B não vê jobs ou arquivos da conta A via GET /api/uploads/jobs

---

## Verificação de Logs

- **Inngest panel** (`http://localhost:8288`): verificar jobs, tentativas e timings
- **Sentry**: verificar ausência de erros não tratados
- **Supabase Storage**: verificar arquivo no bucket após upload

---

## Cleanup após Testes

- Arquivos são deletados automaticamente após 7 dias (cron job do Módulo 005)
- Para limpeza manual: `DELETE FROM "ProcessingJob" WHERE userId = '{test_user_id}'`
