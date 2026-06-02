# Data Model: Workflow de Follow-up Automático (Sergio — Novo Schema)

**Feature**: `001-followup-sergio-novo-schema`
**Date**: 2026-06-01

---

## Tabelas consumidas pelo workflow

### `contacts` (leitura)

Fonte de verdade para dados do contato. O workflow lê mas nunca escreve nessa tabela.

| Campo | Tipo | Uso no workflow |
|-------|------|----------------|
| `id` | uuid | Filtro de busca (= contact_id recebido) |
| `organization_id` | uuid | Filtro de busca (= organization_id recebido) |
| `name` | text nullable | Enviado ao Clint como `nome` |
| `email` | text nullable | Enviado ao Clint como `email` |
| `phone` | text nullable | Enviado ao Clint como `telefone` |

**Query de busca**:
```sql
SELECT id, organization_id, name, email, phone
FROM contacts
WHERE id = '<contact_id>'::UUID
  AND organization_id = '<organization_id>'::UUID
LIMIT 1;
```

---

### `followup_status_atual` (leitura + UPSERT)

Registro único por contato. Armazena a etapa atual no funil. O workflow lê no início (para `etapa_anterior`) e faz UPSERT no final de cada branch.

| Campo | Tipo | Uso no workflow |
|-------|------|----------------|
| `id` | uuid | Gerado via `gen_random_uuid()` no INSERT |
| `organization_id` | uuid | Preenchido com o input do workflow |
| `contact_id` | uuid UNIQUE | Chave do ON CONFLICT |
| `etapa_nome` | text | Lido como `etapa_anterior`; atualizado com nova etapa |
| `ultima_acao_em` | timestamptz | `NOW() - INTERVAL '3 hours'` |
| `updated_at` | timestamptz | `NOW()` |

**Query de leitura** (antes do Switch):
```sql
SELECT etapa_nome
FROM followup_status_atual
WHERE contact_id = '<contact_id>'::UUID
LIMIT 1;
```

**Query de UPSERT** (por branch, exemplo "Base"):
```sql
INSERT INTO public.followup_status_atual (
  id, organization_id, contact_id,
  etapa_nome, ultima_acao_em, updated_at
)
VALUES (
  gen_random_uuid(),
  '<organization_id>'::UUID,
  '<contact_id>'::UUID,
  'Base',
  NOW() - INTERVAL '3 hours',
  NOW()
)
ON CONFLICT (contact_id)
DO UPDATE SET
  etapa_nome    = EXCLUDED.etapa_nome,
  ultima_acao_em = NOW() - INTERVAL '3 hours',
  updated_at    = NOW()
WHERE
  followup_status_atual.etapa_nome NOT IN ('Negociação Fria', 'Negociação Quente');
```

**Regra de proteção de regressão**: A cláusula `WHERE` no `DO UPDATE` impede que etapas avançadas ("Negociação Fria", "Negociação Quente") sejam sobrescritas por etapas inferiores.

---

### `followup_historico` (escrita — append-only)

Log de todas as transições de etapa. O workflow só insere, nunca atualiza ou deleta.

| Campo | Tipo | Uso no workflow |
|-------|------|----------------|
| `id` | uuid | Gerado pelo Postgres (default gen_random_uuid()) |
| `organization_id` | uuid | Preenchido com o input do workflow |
| `contact_id` | uuid | Preenchido com o input do workflow |
| `etapa_anterior` | text nullable | Lido de `followup_status_atual.etapa_nome`; NULL se first touch |
| `etapa_nova` | text | Nome da etapa recebida no input |
| `motivo` | text nullable | Fixo: `'followup_automatico'` |
| `created_at` | timestamptz | `NOW() - INTERVAL '3 hours'` |

**Query de verificação de threshold** (por branch, exemplo "Em Contato"):
```sql
SELECT
  contact_id,
  etapa_nova,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at)::integer AS dias_desde_criacao
FROM followup_historico
WHERE contact_id     = '<contact_id>'::UUID
  AND organization_id = '<organization_id>'::UUID
  AND etapa_nova      = 'Em Contato'
ORDER BY created_at DESC
LIMIT 1;
```
*(alwaysOutputData: true — retorna linha vazia se nunca registrado)*

**Query de INSERT** (por branch, exemplo "Em Contato"):
```sql
INSERT INTO public.followup_historico (
  organization_id, contact_id,
  etapa_anterior, etapa_nova,
  motivo, created_at
)
VALUES (
  '<organization_id>'::UUID,
  '<contact_id>'::UUID,
  NULLIF('<etapa_atual_ou_vazio>', ''),
  'Em Contato',
  'followup_automatico',
  NOW() - INTERVAL '3 hours'
);
```

---

## Mapeamento de etapas × endpoints Clint

| `etapa_funil` | Branch Switch | Endpoint Clint |
|---------------|--------------|----------------|
| `Base` | output 0 | `444d0784-976d-411b-8582-08ded943a245` |
| `Em Contato` | output 1 | `8d91a27e-2743-4eaf-bfb9-4dbd93957ce7` |
| `Dia 1` | output 2 | `8d91a27e-2743-4eaf-bfb9-4dbd93957ce7` |
| `Dia 2` | output 3 | `8d91a27e-2743-4eaf-bfb9-4dbd93957ce7` |
| `Dia 3` | output 4 | `8d91a27e-2743-4eaf-bfb9-4dbd93957ce7` |
| `Negociação Fria` | output 5 | `8d91a27e-2743-4eaf-bfb9-4dbd93957ce7` |
| `Negociação Quente` | output 6 | `8d91a27e-2743-4eaf-bfb9-4dbd93957ce7` |

---

## Queries do Scheduler (por etapa)

Cada etapa tem um workflow scheduler separado que roda periodicamente, busca os contatos elegíveis e chama o sub-workflow `followup-sergio-v2` para cada um.

**Parâmetros fixos:**
- `organization_id`: `693a2307-d35b-4739-8783-fdf8c28dec2d`
- Janela de tempo: entre **24 horas** e **2 dias** desde a entrada na etapa
- Ajuste de fuso: `NOW() - INTERVAL '3 hours'` (UTC → Brasília)
- Limite: 500 leads por execução

### Follow Up 1 — Em Contato

```sql
WITH leads_para_follow AS (
    SELECT 
        s.contact_id,
        s.organization_id,
        s.etapa_nome,
        s.ultima_acao_em                                              AS entrada_etapa,
        EXTRACT(EPOCH FROM ((NOW() - INTERVAL '3 hours') - s.ultima_acao_em))/3600
                                                                      AS horas_na_etapa,
        true                                                          AS success
    FROM public.followup_status_atual s
    WHERE 
        s.organization_id = '693a2307-d35b-4739-8783-fdf8c28dec2d'::uuid
        AND s.etapa_nome = 'Em Contato'
        AND s.ultima_acao_em <= (NOW() - INTERVAL '3 hours') - INTERVAL '24 hours'
        AND s.ultima_acao_em >= (NOW() - INTERVAL '3 hours') - INTERVAL '2 days'
    ORDER BY s.ultima_acao_em ASC
    LIMIT 500
)
SELECT * FROM leads_para_follow

UNION ALL

SELECT
    NULL::uuid        AS contact_id,
    NULL::uuid        AS organization_id,
    NULL::text        AS etapa_nome,
    NULL::timestamptz AS entrada_etapa,
    NULL::float8      AS horas_na_etapa,
    true              AS success
WHERE NOT EXISTS (SELECT 1 FROM leads_para_follow);
```

---

## Payload do webhook Clint

Igual para todos os endpoints:

```json
{
  "nome": "{{ $('Variáveis do Contato').item.json.nome }}",
  "email": "{{ $('Variáveis do Contato').item.json.email }}",
  "telefone": "{{ $('Variáveis do Contato').item.json.telefone }}",
  "etapa_funil": "{{ $('Variáveis do Contato').item.json.etapa_funil }}"
}
```
