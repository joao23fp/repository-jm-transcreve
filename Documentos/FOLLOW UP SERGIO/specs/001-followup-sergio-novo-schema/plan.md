# Implementation Plan: Workflow de Follow-up Automático (Sergio — Novo Schema)

**Branch**: `001-followup-sergio-novo-schema` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

---

## Summary

Sub-workflow n8n que recebe `contact_id`, `organization_id` e `etapa_funil`, verifica o histórico de follow-up do contato, registra a transição de etapa nas tabelas `followup_historico` e `followup_status_atual` (com proteção de regressão), e dispara o webhook correspondente no Clint. Threshold de 10 dias para todas as etapas.

---

## Technical Context

**Platform**: n8n (workflow automation)
**Language/Version**: n8n expressions + SQL (PostgreSQL 15+)
**Primary Dependencies**: n8n Postgres node (executeQuery), n8n HTTP Request node
**Storage**: Supabase/PostgreSQL — tabelas: `contacts`, `followup_historico`, `followup_status_atual`
**Testing**: Execução manual no n8n com pin data (contact_id de teste por etapa)
**Target Platform**: n8n cloud/self-hosted
**Performance Goals**: < 5s de execução em condições normais
**Constraints**: Threshold de 10 dias; sem regressão de etapa em Neg. Fria / Neg. Quente
**Scale/Scope**: Um contato por execução; ~7 etapas de funil

---

## Constitution Check

A constitution do projeto está em template vazio — sem princípios definidos. Nenhum gate a verificar. Prosseguir.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-followup-sergio-novo-schema/
├── plan.md              ← este arquivo
├── spec.md              ← especificação funcional
├── research.md          ← decisões técnicas
├── data-model.md        ← tabelas, queries SQL, mapeamento de etapas
├── checklists/
│   └── requirements.md
└── tasks.md             ← gerado por /speckit-tasks
```

### Source Code (workflow n8n)

```text
workflows/
└── followup-sergio-v2.json   ← workflow n8n exportado
```

---

## Architecture — Grafo de Nós

### Nós Compartilhados (cabeça do workflow)

```
[Start]
  → [Busca Contato]
  → [IF: Contato existe?]
      → [false] [NoOp: Contato não encontrado] — FIM
      → [true]  [Variáveis do Contato]
                  → [Busca Status Atual]
                  → [Variáveis de Status]
                  → [Switch por etapa_funil]
```

**Nó: Start** (`executeWorkflowTrigger`)
- Inputs: `contact_id` (any), `etapa_funil` (string), `organization_id` (any)

**Nó: Busca Contato** (Postgres → executeQuery, `alwaysOutputData: true`)
```sql
SELECT id, organization_id, name, email, phone
FROM contacts
WHERE id = '{{ $json.contact_id }}'::UUID
  AND organization_id = '{{ $json.organization_id }}'::UUID
LIMIT 1;
```

**Nó: IF: Contato existe?** (IF)
- Condição: `{{ $json.id }}` is not empty
- true → prossegue | false → NoOp

**Nó: Variáveis do Contato** (Set)
- `contact_id` ← `{{ $json.id }}`
- `organization_id` ← `{{ $json.organization_id }}`
- `nome` ← `{{ $json.name }}`
- `email` ← `{{ $json.email }}`
- `telefone` ← `{{ $json.phone }}`
- `etapa_funil` ← `{{ $('Start').item.json.etapa_funil }}`

**Nó: Busca Status Atual** (Postgres → executeQuery, `alwaysOutputData: true`)
```sql
SELECT etapa_nome
FROM followup_status_atual
WHERE contact_id = '{{ $('Variáveis do Contato').item.json.contact_id }}'::UUID
LIMIT 1;
```

**Nó: Variáveis de Status** (Set)
- `etapa_atual` ← `{{ $json.etapa_nome ?? '' }}`

**Nó: Switch** (Switch, 7 outputs)
- Condição: `{{ $('Variáveis do Contato').item.json.etapa_funil }}`
- output 0 → `Base`
- output 1 → `Em Contato`
- output 2 → `Dia 1`
- output 3 → `Dia 2`
- output 4 → `Dia 3`
- output 5 → `Negociação Fria`
- output 6 → `Negociação Quente`

---

### Padrão por Branch (repetido 7×)

Cada branch segue exatamente este padrão (substituir `{ETAPA}` e `{ENDPOINT}` pelos valores da tabela no data-model.md):

```
[Verifica Histórico {ETAPA}]  (Postgres, alwaysOutputData: true)
  → [IF: Threshold OK?]
      → [false] [NoOp: Dentro do threshold] — FIM
      → [true]  [Registra Histórico {ETAPA}]  (Postgres INSERT)
                  → [Atualiza Status Atual {ETAPA}]  (Postgres UPSERT)
                  → [Dispara Clint {ETAPA}]  (HTTP POST)
                  → [NoOp: Concluído]
```

---

#### Nó: Verifica Histórico {ETAPA}

```sql
SELECT
  contact_id,
  etapa_nova,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at)::integer AS dias_desde_criacao
FROM followup_historico
WHERE contact_id      = '{{ $('Variáveis do Contato').item.json.contact_id }}'::UUID
  AND organization_id = '{{ $('Variáveis do Contato').item.json.organization_id }}'::UUID
  AND etapa_nova      = '{ETAPA}'
ORDER BY created_at DESC
LIMIT 1;
```

#### Nó: IF: Threshold OK?

- Condição A: `{{ $json.dias_desde_criacao }}` >= 10 (number)
- Condição B: `{{ $json.dias_desde_criacao }}` is empty
- Combinator: **OR**
- true (prossegue) = A ou B | false (bloqueia) = nenhuma das condições

#### Nó: Registra Histórico {ETAPA}

```sql
INSERT INTO public.followup_historico (
  organization_id,
  contact_id,
  etapa_anterior,
  etapa_nova,
  motivo,
  created_at
)
VALUES (
  '{{ $('Variáveis do Contato').item.json.organization_id }}'::UUID,
  '{{ $('Variáveis do Contato').item.json.contact_id }}'::UUID,
  NULLIF('{{ $('Variáveis de Status').item.json.etapa_atual }}', ''),
  '{ETAPA}',
  'followup_automatico',
  NOW() - INTERVAL '3 hours'
);
```

#### Nó: Atualiza Status Atual {ETAPA}

```sql
INSERT INTO public.followup_status_atual (
  id,
  organization_id,
  contact_id,
  etapa_nome,
  ultima_acao_em,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '{{ $('Variáveis do Contato').item.json.organization_id }}'::UUID,
  '{{ $('Variáveis do Contato').item.json.contact_id }}'::UUID,
  '{ETAPA}',
  NOW() - INTERVAL '3 hours',
  NOW()
)
ON CONFLICT (contact_id)
DO UPDATE SET
  etapa_nome     = EXCLUDED.etapa_nome,
  ultima_acao_em = NOW() - INTERVAL '3 hours',
  updated_at     = NOW()
WHERE
  followup_status_atual.etapa_nome NOT IN ('Negociação Fria', 'Negociação Quente');
```

#### Nó: Dispara Clint {ETAPA}

- Método: POST
- URL: `https://functions-api.clint.digital/endpoints/integration/webhook/{ENDPOINT}`
- Body (JSON):
  - `nome` ← `{{ $('Variáveis do Contato').item.json.nome }}`
  - `email` ← `{{ $('Variáveis do Contato').item.json.email }}`
  - `telefone` ← `{{ $('Variáveis do Contato').item.json.telefone }}`
  - `etapa_funil` ← `{{ $('Variáveis do Contato').item.json.etapa_funil }}`

---

## Contagem de nós

| Grupo | Nós |
|-------|-----|
| Cabeça compartilhada | 7 (Start, Busca Contato, IF existe, NoOp 404, Set Variáveis, Busca Status, Set Status, Switch) |
| Por branch (7×) | 6 nós × 7 = 42 (Verifica, IF threshold, NoOp bloqueado, Registra, Atualiza, Dispara) |
| **Total estimado** | **~49 nós** |

Redução de ~15% vs fluxo antigo (~60 nós) pela eliminação de: Set nodes "transforma em inteiro", nó hardcoded de UUIDs de etapas, nós Supabase duplicados.

---

## Credenciais

| Serviço | Credential ID | Nome |
|---------|--------------|------|
| Postgres | `OU8cyzGlL8UbRk7p` | supabase-afiliadotruppel |
| Supabase (não usado) | `ibm5ISOqJ9w5zJrI` | afiliadotruppel |

> Apenas o nó Postgres é necessário. O nó Supabase não é usado neste fluxo.

---

## Fora de Escopo

- `followup_respostas` — gerenciado por outro workflow
- `followup_etapas` — etapas usadas como texto direto, sem lookup
- Lógica de `devices`, `ai_configs`, `messages` — não relacionados ao follow-up
