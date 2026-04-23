# Guia de Deploy — TranscreveAdv

## Pré-requisitos

- Conta Vercel conectada ao repositório GitHub
- Projeto Supabase criado (banco + storage)
- Conta Clerk configurada com webhook
- Conta Groq com API key
- Conta Resend com domínio verificado
- Conta Pagar.me (sandbox para testes, produção para lançamento)
- Conta Inngest (gratuita para começar)

---

## 1. Variáveis de Ambiente (Vercel)

Configure todas as variáveis abaixo em **Vercel → Project → Settings → Environment Variables**:

| Variável | Onde obter | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (Transaction pooler) | ✅ |
| `DIRECT_URL` | Supabase → Settings → Database → Connection string (Direct connection) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys | ✅ |
| `CLERK_SECRET_KEY` | Clerk → API Keys | ✅ |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → Signing Secret | ✅ |
| `INNGEST_SIGNING_KEY` | Inngest → App → Keys | ✅ |
| `INNGEST_EVENT_KEY` | Inngest → App → Keys | ✅ |
| `GROQ_API_KEY` | console.groq.com → API Keys | ✅ |
| `RESEND_API_KEY` | resend.com → API Keys | ✅ |
| `RESEND_FROM_EMAIL` | Ex: `noreply@seudominio.com.br` | ✅ |
| `NEXT_PUBLIC_APP_URL` | Ex: `https://transcribeadv.vercel.app` | ✅ |
| `PAGARME_API_KEY` | Pagar.me → Dashboard → API Keys | ✅ |
| `PAGARME_WEBHOOK_SECRET` | Pagar.me → Dashboard → Webhooks | ✅ |
| `NEXT_PUBLIC_SENTRY_DSN` | sentry.io → Project → Settings → DSN | Opcional |

> **Importante**: em produção, NÃO definir `INNGEST_DEV` nem `LOCAL_STORAGE_PATH`.

---

## 2. Supabase Storage

Criar o bucket `transcribeadv-uploads` no Supabase Storage:

```sql
-- Supabase SQL Editor
insert into storage.buckets (id, name, public)
values ('transcribeadv-uploads', 'transcribeadv-uploads', false);
```

Adicionar política de acesso para service role (já feito via `SUPABASE_SERVICE_ROLE_KEY`).

---

## 3. Banco de Dados — Migrations

Após o primeiro deploy, rodar as migrations em produção:

```bash
# Localmente, apontando para o banco de produção
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Ou via Vercel CLI:
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

---

## 4. Seed de Templates do Sistema

Após a migration, popular os 5 templates de sistema:

```bash
DATABASE_URL="postgresql://..." npm run prisma:seed-prompts
```

---

## 5. Configurar Webhooks

### Clerk
- URL: `https://seudominio.com/api/webhooks/clerk`
- Eventos: `user.created`, `user.deleted`

### Pagar.me
- URL: `https://seudominio.com/api/webhooks/pagarme`
- Eventos: `order.paid`, `order.payment_failed`, `order.canceled`

### Inngest
- URL: `https://seudominio.com/api/inngest`
- Configurar via Inngest dashboard após o primeiro deploy

---

## 6. Validar Deploy

Após o deploy, verificar:

- [ ] `/uploads` — página de upload carrega
- [ ] `/dashboard` — dashboard de créditos carrega
- [ ] `/biblioteca` — biblioteca de prompts mostra 5 templates
- [ ] Upload de arquivo funciona (transcription pipeline)
- [ ] Inngest dashboard mostra 10 funções registradas
- [ ] T027 — Validar cenários do módulo 005 com Pagar.me sandbox

---

## 7. Variáveis opcionais removidas em produção

Remover ou deixar vazio em produção:
- `INNGEST_DEV` — ativa modo desenvolvimento do Inngest (não usar em produção)
- `LOCAL_STORAGE_PATH` — usado apenas para dev sem Supabase
