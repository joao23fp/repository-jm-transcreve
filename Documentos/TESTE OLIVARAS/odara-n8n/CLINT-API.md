# Clint API — Documentação Completa
**Base URL:** `https://api.clint.digital`
**Autenticação:** Header `api-token: SEU_TOKEN` em todas as requisições
**Referência:** https://clint-api.readme.io/reference

---

## ⚠️ Pontos Críticos para os Workflows

| Ponto | Detalhe |
|---|---|
| **Header auth** | `api-token: TOKEN` (NÃO `Authorization: Bearer`) |
| **IDs são UUID** | Todos os IDs são UUIDs — não inteiros |
| **Mensagens exigem contact_id UUID** | Precisa do UUID do contato, não só o telefone |
| **Mensagens exigem channel_account_id UUID** | UUID do canal WhatsApp cadastrado no Clint |
| **Janela 24h** | Mensagem de texto só funciona dentro da janela; template funciona sempre |
| **Mover card entre etapas** | `POST /v1/deals/{id}` com `stage_id` (UUID da etapa) |
| **Status do deal** | OPEN / WON / LOST |
| **Tipos de canal** | WHATSAPP_OFFICIAL / WHATSAPP / INSTAGRAM |

---

## IDs que precisamos antes de configurar os workflows

Execute esses GETs com seu token para obter os IDs reais:

```bash
# 1. Canal WhatsApp (channel_account_id)
GET https://api.clint.digital/v2/channel-accounts

# 2. Funis e etapas (stage_id dos deals)
GET https://api.clint.digital/v1/groups

# 3. Origens (origin_id para criar deals)
GET https://api.clint.digital/v1/origins

# 4. Usuários (user_id para atribuir deals)
GET https://api.clint.digital/v1/users

# 5. Campos customizados (IDs dos fields)
GET https://api.clint.digital/v1/account/fields

# 6. Templates WhatsApp aprovados (template_id)
GET https://api.clint.digital/v2/message-templates?channel_account_id=UUID_DO_CANAL

# 7. Motivos de perda de deal (lost_status_id)
GET https://api.clint.digital/v1/lost-status
```

---

## CONTACTS (v1)

### GET /v1/contacts — Listar contatos
```
GET https://api.clint.digital/v1/contacts
```
**Query params (todos opcionais):**
- `limit` (1-1000, default 200), `offset`, `page`
- `phone`, `email`, `name`, `ddi`
- `origin_id` (UUID)
- `tag_ids` (separados por vírgula), `tag_names`
- `fields` (filtro por campo customizado)

---

### POST /v1/contacts — Criar contato
```
POST https://api.clint.digital/v1/contacts
api-token: TOKEN
Content-Type: application/json
```
```json
{
  "name": "Maria Silva",
  "ddi": "+55",
  "phone": "21999999999",
  "email": "maria@email.com",
  "username": "maria.silva",
  "fields": {
    "CAMPO_ID": "valor"
  }
}
```
**Response 201:** `{ "id": "uuid-do-contato", ... }`

---

### GET /v1/contacts/{id} — Buscar contato por UUID
```
GET https://api.clint.digital/v1/contacts/{uuid}
```

---

### POST /v1/contacts/{id} — Atualizar contato
```
POST https://api.clint.digital/v1/contacts/{uuid}
```
Mesmos campos do create, todos opcionais.

---

### DELETE /v1/contacts/{id} — Remover contato

---

### POST /v1/contacts/{id}/tags — Adicionar tags ao contato
```
POST https://api.clint.digital/v1/contacts/{uuid}/tags
```
```json
{ "tag_ids": ["uuid-tag-1", "uuid-tag-2"] }
```

### DELETE /v1/contacts/{id}/tags — Remover tag do contato

### GET /v1/contacts/{id}/attachments — Listar anexos do contato

---

## ORGANIZATIONS (v1)

### GET /v1/organizations/{id} — Buscar organização
### POST /v1/organizations/{id} — Atualizar organização

---

## DEALS (v1)

### GET /v1/deals — Listar deals
```
GET https://api.clint.digital/v1/deals
```
**Query params:**
- `limit`, `offset`, `page`
- `status` — OPEN | WON | LOST (default OPEN)
- `stage_id` (UUID), `contact_id` (UUID)
- `user_id` (UUID), `user_email`
- `phone`, `email`
- `tag_ids`, `tag_names`
- `origin_id` (UUID)
- `created_at_start` / `created_at_end` (ISO 8601)
- `updated_at_start` / `updated_at_end`
- `updated_stage_at_start` / `updated_stage_at_end`
- `won_at_start` / `won_at_end`
- `lost_at_start` / `lost_at_end`
- `fields` (filtro por campo customizado)

---

### POST /v1/deals — Criar deal
```
POST https://api.clint.digital/v1/deals
api-token: TOKEN
Content-Type: application/json
```
```json
{
  "origin_id": "uuid-origem",
  "name": "Nome do deal",
  "phone": "21999999999",
  "email": "contato@email.com",
  "value": 1500.00,
  "stage_id": "uuid-etapa-funil",
  "user_id": "uuid-responsavel",
  "contact_id": "uuid-contato-existente",
  "fields": {
    "CAMPO_ID": "valor"
  }
}
```
**Response 201:** `{ "id": "uuid-do-deal", ... }`

---

### GET /v1/deals/{id} — Buscar deal por UUID

---

### POST /v1/deals/{id} — Atualizar deal
```
POST https://api.clint.digital/v1/deals/{uuid}
```
```json
{
  "name": "Nome atualizado",
  "value": 2000.00,
  "stage_id": "uuid-nova-etapa",
  "status": "WON",
  "user_id": "uuid-novo-responsavel",
  "origin_id": "uuid-origem",
  "fields": { "CAMPO_ID": "novo-valor" }
}
```
**`status`:** `OPEN` | `WON` | `LOST`

---

### DELETE /v1/deals/{id} — Remover deal

---

## GROUPS (v1) — Funis/Pipelines

### GET /v1/groups — Listar funis
```
GET https://api.clint.digital/v1/groups
```
Retorna funis com suas etapas e os `stage_id` UUIDs necessários para criar/mover deals.

### GET /v1/groups/{id} — Buscar funil específico

---

## LOST STATUS (v1)

### GET /v1/lost-status — Listar motivos de perda
```
GET https://api.clint.digital/v1/lost-status
```
Retorna motivos de perda de deal (usados ao marcar deal como LOST).

---

## ORIGINS (v1)

### GET /v1/origins — Listar origens
```
GET https://api.clint.digital/v1/origins
```
Retorna origens (WhatsApp, Instagram, Indicação etc.) com `origin_id` UUIDs.

---

## TAGS (v1)

### GET /v1/tags — Listar tags
### POST /v1/tags — Criar tag
```json
{ "name": "Nome da Tag" }
```
### DELETE /v1/tags/{id} — Remover tag

---

## USERS (v1)

### GET /v1/users — Listar usuários da conta
### GET /v1/users/{id} — Buscar usuário

---

## CHANNEL ACCOUNTS (v2)

### GET /v2/channel-accounts — Listar canais
```
GET https://api.clint.digital/v2/channel-accounts
```
**Query params:**
- `type` — WHATSAPP_OFFICIAL | WHATSAPP | INSTAGRAM

Retorna canais conectados com seus UUIDs. Necessário para enviar mensagens.

### GET /v2/channel-accounts/{id} — Buscar canal específico

---

## MESSAGE TEMPLATES (v2)

### GET /v2/message-templates — Listar templates
```
GET https://api.clint.digital/v2/message-templates?channel_account_id=UUID
```
`channel_account_id` é **obrigatório**. Retorna templates aprovados com UUIDs.

### GET /v2/message-templates/{id} — Buscar template específico

---

## MESSAGES (v2)

### POST /v2/messages/text — Enviar mensagem de texto
```
POST https://api.clint.digital/v2/messages/text
api-token: TOKEN
```
```json
{
  "channel_account_id": "uuid-canal-whatsapp",
  "contact_id": "uuid-contato",
  "message": "Texto da mensagem",
  "chat_id": "uuid-chat-existente"
}
```
**⚠️ Só funciona dentro da janela 24h de conversa ativa.**

**Erros 400 comuns:**
- `Messaging Window Closed` → use template
- `Channel Account Disconnected`
- `Contact Has No Phone Number`

---

### POST /v2/messages/template — Enviar template WhatsApp
```
POST https://api.clint.digital/v2/messages/template
```
```json
{
  "channel_account_id": "uuid-canal",
  "contact_id": "uuid-contato",
  "template_id": "uuid-template-aprovado",
  "chat_id": "uuid-chat",
  "parameters": {
    "body": ["valor1", "valor2"]
  }
}
```
**✅ Funciona fora da janela 24h. Template deve estar APROVADO pela Meta.**

---

### POST /v2/messages/image — Enviar imagem
```json
{
  "channel_account_id": "uuid",
  "contact_id": "uuid",
  "url": "https://url-da-imagem.jpg",
  "caption": "Legenda opcional"
}
```

### POST /v2/messages/document — Enviar documento
### POST /v2/messages/audio — Enviar áudio

---

## CHATS (v2)

### GET /v2/chats/contact/{contactId} — Chats de um contato
```
GET https://api.clint.digital/v2/chats/contact/{uuid-contato}
```
Retorna chats por WHATSAPP_OFFICIAL, WHATSAPP e INSTAGRAM.
Ordenados por `last_message_at` decrescente.

### GET /v2/chats/channel-account/{channelAccountId} — Chats por canal
### GET /v2/chats/{id} — Buscar chat específico

### GET /v2/messages/chat/{chatId} — Listar mensagens de um chat
### GET /v2/messages/{id} — Buscar mensagem específica

---

## DASHBOARDS (v2)

### GET /v2/dashboards — Listar dashboards
### GET /v2/dashboards/{id} — Buscar dashboard
### GET /v2/dashboards/{id}/data — Dados de gráficos do dashboard
### GET /v2/charts/{id}/data — Dados de gráfico específico

---

## ACCOUNT (v1)

### GET /v1/account/fields — Campos customizados da conta
```
GET https://api.clint.digital/v1/account/fields
api-token: TOKEN
```
Retorna todos os campos customizados disponíveis para contacts e deals, com seus IDs.
Esses IDs são usados no objeto `fields` ao criar/atualizar contatos e deals.

---

## Mapeamento: Ações ODARA → Endpoints Reais Clint

| Ação nos workflows | Endpoint Clint | Campos obrigatórios |
|---|---|---|
| Criar contato (lead) | `POST /v1/contacts` | name, phone |
| Atualizar contato com belle_id | `POST /v1/contacts/{uuid}` | fields.CAMPO_BELLE_ID |
| Buscar contato por telefone | `GET /v1/contacts?phone=XX` | phone |
| Criar deal/card | `POST /v1/deals` | origin_id, stage_id, contact_id |
| Mover card de etapa | `POST /v1/deals/{uuid}` | stage_id |
| Marcar deal como WON | `POST /v1/deals/{uuid}` | status: "WON" |
| Marcar deal como LOST | `POST /v1/deals/{uuid}` | status: "LOST" |
| Adicionar tag ao contato | `POST /v1/contacts/{uuid}/tags` | tag_ids |
| Enviar WhatsApp (janela aberta) | `POST /v2/messages/text` | channel_account_id, contact_id, message |
| Enviar template WhatsApp | `POST /v2/messages/template` | channel_account_id, contact_id, template_id |
| Enviar imagem | `POST /v2/messages/image` | channel_account_id, contact_id, url |
| Listar chats do contato | `GET /v2/chats/contact/{uuid}` | contactId |
| Ver dados de relatórios | `GET /v2/dashboards/{id}/data` | dashboard_id |

---

## Mudanças necessárias nos workflows ODARA

### 1. Header de autenticação (TODOS os nós CLINT)
```
# ERRADO (como está agora nos workflows)
Authorization: Bearer SEU_TOKEN_CLINT

# CORRETO
api-token: SEU_TOKEN_CLINT
```

### 2. Adicionar colunas UUID no banco
```sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS clint_contact_uuid VARCHAR(36);
ALTER TABLE vendas    ADD COLUMN IF NOT EXISTS clint_deal_uuid    VARCHAR(36);
```

### 3. Workflow 05 (cadastro-lead) — fluxo correto
```
Webhook (lead chega) 
→ GET /v1/contacts?phone=XX (verificar se já existe)
→ SE NÃO existe: POST /v1/contacts (criar)
→ Salvar clint_contact_uuid no banco
→ POST /v1/deals (criar card no funil Aquisição)
→ Salvar clint_deal_uuid no banco
```

### 4. Confirmar/Cancelar via WhatsApp
Não existe botão interativo via API simples.
Opções:
- **Template com Quick Reply** (botões pré-aprovados no WhatsApp Business)
- **Texto simples** + capturar resposta por palavra-chave (ex: "1 para confirmar, 2 para cancelar")

### 5. Identificar contato para enviar mensagem
Todo envio precisa do `contact_id` UUID do Clint.
O workflow deve:
1. Buscar o `clint_contact_uuid` da tabela `clientes`
2. Usar esse UUID no campo `contact_id` do envio
