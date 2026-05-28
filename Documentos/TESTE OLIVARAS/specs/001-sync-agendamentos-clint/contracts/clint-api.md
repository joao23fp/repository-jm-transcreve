# Contrato: Clint API — Deals (Cards)

**Workflow**: 01 v2 | **Direção**: → Clint (escrita) | **Date**: 2026-05-28

## Base

```
Auth:   api-token: <TOKEN>   ← NUNCA Authorization: Bearer
Formato: application/json
```

> **Atenção — Princípio V**: Após todo deploy via MCP, verificar credenciais
> manualmente no n8n. O MCP auto-atribui `supabase-afiliadotruppel` (errada).
> Trocar para `PostgreSQL Odara` em todos os nós Postgres.

## Endpoint: Criar Card (Deal)

```
POST /api/deals
```

**Request body**:
```json
{
  "contact_id": "<clint_contact_uuid>",
  "origin_id": "58d30a69-...",
  "stage_id": "<uuid-da-etapa>",
  "name": "Avaliação — Maria Silva — 28/05"
}
```

**Response (sucesso 201)**:
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "contact_id": "...",
  "stage_id": "...",
  "name": "..."
}
```

O campo `id` retornado é salvo como `clint_card_id` na tabela `agendamentos`.

## Endpoint: Mover Etapa

```
PATCH /api/deals/<clint_card_id>
```

**Request body**:
```json
{
  "stage_id": "<novo-stage-uuid>"
}
```

**Response (sucesso 200)**:
```json
{
  "id": "...",
  "stage_id": "<novo-stage-uuid>"
}
```

## Mapeamento de Etapas

| Status Belle | stage_id                               | Etapa Clint         |
|--------------|----------------------------------------|---------------------|
| Marcado      | `711be8cc-a0cb-4bcb-ae40-428f1ad47873` | Avaliação Agendada  |
| Cancelado    | `455aafb0-8fef-45d6-beb4-41888cc7d18a` | Reagendar           |
| Atendido     | `f09cdbdb-fb8e-4f04-b5f8-4a20a8de3341` | Consulta Realizada  |

**origin_id do funil** "ODARA | Aquisição TESTE": `58d30a69-0378-4dc5-9a77-72a5c1570671`

## Tratamento de Erros

| Código   | Comportamento                                                  |
|----------|----------------------------------------------------------------|
| 4xx      | Incrementar contador `erros`; não salvar `clint_card_id`; tentar na próxima execução |
| 5xx      | Interromper execução atual imediatamente; tentar na próxima rodada |
| Timeout  | Interromper execução atual imediatamente; tentar na próxima rodada |

Janela de recuperação: agendamentos não processados retornam na próxima execução
(máximo 5h depois, dado o schedule 4x/dia). A janela de 2 dias para trás garante
que nenhum registro se perde.
