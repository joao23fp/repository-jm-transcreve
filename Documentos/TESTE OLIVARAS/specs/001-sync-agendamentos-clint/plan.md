# Implementation Plan: Workflow 01 v2 — Sync Agendamentos Belle → Clint

**Branch**: `001-sync-agendamentos-clint` | **Date**: 2026-05-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-sync-agendamentos-clint/spec.md`

## Summary

Substituir o Workflow 01 original por uma versão v2 que sincroniza agendamentos
da Belle Software com cards/deals no funil "ODARA | Aquisição TESTE" do Clint,
executando 4 vezes por dia (07:30 / 13:00 / 16:00 / 20:00). A v2 expande a
janela de datas (hoje-2d → hoje+30d), respeita idempotência via `clint_card_id`
e `clint_status_enviado`, e retorna um sumário ETL ao final de cada execução.

## Technical Context

**Language/Version**: JavaScript ESM — n8n Workflow SDK (`@n8n/workflow-sdk`)

**Primary Dependencies**: n8n (self-hosted), Belle REST API, Clint REST API, PostgreSQL (Supabase)

**Storage**: PostgreSQL — tabelas `agendamentos` e `clientes` (leitura)

**Testing**: Execução manual no n8n + verificação de sumário ETL + inspeção de cards no Clint

**Target Platform**: n8n self-hosted (Linux server)

**Project Type**: Workflow de integração ETL (Extract → Transform → Load → Notify)

**Performance Goals**: Processar até 20 agendamentos por execução em < 60 segundos

**Constraints**: LIMIT 20/execução; 5xx interrompe execução; sem retry imediato; janela 2d atrás / 30d frente

**Scale/Scope**: ~50–200 agendamentos no banco na janela ativa; 4 execuções/dia

## Constitution Check

*GATE: Verificado contra constituição v1.0.0 antes do planejamento.*

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Belle como Fonte Primária | ✅ PASSA | Leitura apenas da Belle; DB é espelho; Clint recebe projeção |
| II. Sincronização Unidirecional Belle → Clint | ✅ PASSA | Fluxo: Belle → DB → Clint. Nenhuma escrita na Belle |
| III. Ativação Gradual por Fases | ✅ PASSA | WF-B já ativo; 01 v2 é próximo passo; original mantido até validação |
| IV. Idempotência | ✅ PASSA | Upsert por `belle_id`; `clint_card_id IS NULL` / `status != clint_status_enviado`; LIMIT 20 |
| V. Credenciais Verificadas Manualmente | ✅ PASSA | Documentado no quickstart.md — obrigatório após deploy |
| Padrões n8n — Always Output Data | ✅ A implementar | Nós Postgres com LIMIT devem ter Always Output Data |
| Padrões n8n — Query Parameters | ✅ A implementar | UUIDs em `$1`, `$2` com `queryReplacement` |
| Padrões n8n — API Clint auth | ✅ A implementar | `api-token: TOKEN` (não Bearer) |
| Padrões n8n — IF node via MCP | ⚠️ ATENÇÃO | Configurar nós IF manualmente após deploy |
| Padrões n8n — Nó Code return | ✅ A implementar | `return { json: {...} }` sem array externo |

*Re-check pós-design: nenhuma violação adicional identificada.*

## Project Structure

### Documentation (this feature)

```text
specs/001-sync-agendamentos-clint/
├── plan.md              # Este arquivo
├── research.md          # Decisões técnicas: APIs, DB, SDK
├── data-model.md        # Entidades, queries, migration SQL
├── quickstart.md        # Passos de deploy, teste e ativação
├── contracts/
│   ├── belle-api.md     # Contrato Belle API (3 endpoints)
│   └── clint-api.md     # Contrato Clint API (criar/mover card)
└── tasks.md             # (criado por /speckit-tasks — não aqui)
```

### Source Code (repository root)

```text
odara-n8n/
├── workflows/
│   └── 01v2-sync-agendamentos-clint.json   # Workflow gerado pelo SDK
└── database/
    └── schema.sql                           # Incluir migration clint_status_enviado
```

**Structure Decision**: Projeto de workflow único n8n. Sem frontend ou backend
separado. O código do workflow é gerado pelo SDK e deployado via MCP n8n.

## Phase 0: Research — Concluída

Ver [research.md](research.md) para todas as decisões.

Principais achados:
- Belle usa 3 endpoints separados (abertos / finalizados / cancelados)
- Clint auth é `api-token` (não Bearer) — erro crítico do workflow 01 original
- Coluna `clint_status_enviado` é necessária (nova, não existe no schema)
- LIMIT 20 atende a escala esperada com folga
- n8n schedule pode exigir configuração manual dos 4 horários após deploy via MCP

## Phase 1: Design — Concluída

Ver [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md).

### Arquitetura do Workflow v2

```
[Schedule: 07:30/13:00/16:00/20:00]
         │
         ▼
[Code: Calcular datas (hoje-2d, hoje+30d, DD/MM/YYYY)]
         │
         ▼
[Code: Preparar 3 requests Belle (abertos, finalizados, cancelados)]
         │
         ▼ (3 items em paralelo / sequencial por item)
[HTTP: GET Belle /agendamentos]
[HTTP: GET Belle /agendamentos/finalizados]
[HTTP: GET Belle /agendamentos/cancelados]
         │
         ▼
[Code: Combinar e Normalizar → ISO dates, escapar strings]
         │
         ▼
[Postgres: Upsert em agendamentos ON CONFLICT (belle_id)]
         │
         ▼
[Postgres: SELECT agendamentos pendentes Clint — sem card (LIMIT 20)]
   + [Postgres: SELECT agendamentos com card para atualizar etapa (LIMIT 20)]
         │
    ┌────┴────┐
    ▼         ▼
[IF: tem   [IF: status
clint_     mudou?]
card_id?]       │
    │       [HTTP PATCH /api/deals/{id}]
[HTTP POST       │
/api/deals]  [Postgres: UPDATE clint_status_enviado]
    │
[Postgres: UPDATE clint_card_id + clint_status_enviado]
         │
         ▼
[Code: Montar sumário ETL]
         │
         ▼
[Respond: {total, criados, atualizados, ignorados, erros}]
```

### Nós do Workflow v2

| # | Nome do Nó                     | Tipo               | Função                                    |
|---|--------------------------------|--------------------|-------------------------------------------|
| 1 | Schedule 4x/dia                | scheduleTrigger    | 07:30, 13:00, 16:00, 20:00               |
| 2 | Calcular Datas                 | code               | Gera datas hoje-2d / hoje+30d em DD/MM/YYYY |
| 3 | Preparar Requests Belle        | code               | Cria 3 items com URL, dtInicio, dtFim     |
| 4 | BELLE: Buscar Agendamentos     | httpRequest        | GET 3 endpoints Belle                     |
| 5 | Combinar e Normalizar          | code               | Merge + ISO dates + escape strings        |
| 6 | DB: Upsert Agendamentos        | postgres           | ON CONFLICT belle_id DO UPDATE            |
| 7 | DB: Buscar Pendentes de Criação| postgres           | IS NULL clint_card_id, com JOIN clientes  |
| 8 | IF: Tem Contato Clint?         | if                 | clint_contact_uuid IS NOT NULL            |
| 9 | CLINT: Criar Card              | httpRequest        | POST /api/deals                           |
|10 | DB: Salvar clint_card_id       | postgres           | UPDATE agendamentos SET clint_card_id     |
|11 | DB: Buscar Pendentes de Update | postgres           | clint_card_id NOT NULL + status mudou     |
|12 | CLINT: Mover Etapa             | httpRequest        | PATCH /api/deals/{id}                     |
|13 | DB: Atualizar Status Enviado   | postgres           | UPDATE clint_status_enviado               |
|14 | Montar Sumário ETL             | code               | Agrega contadores de todos os ramos       |

### Decisões de Implementação

1. **Schedule**: usar `scheduleTrigger` com múltiplos horários fixos. Se o SDK não
   suportar nativamente múltiplos `specificTime`, configurar no UI do n8n após deploy.

2. **Dois loops independentes**: busca por "criar" e busca por "atualizar" são
   queries separadas — simplifica o código e respeita LIMIT 20 em cada operação.

3. **Always Output Data**: nós Postgres 7 e 11 devem ter `alwaysOutputData: true`
   para não quebrar o fluxo quando não há pendências.

4. **Parameterized queries**: todos os UUIDs e valores dinâmicos via `$1, $2...`
   com `queryReplacement` em Expression mode.

5. **Coluna clint_status_enviado**: adicionada via migration antes do deploy.
   Garante idempotência sem re-envio desnecessário ao Clint (FR-004 / SC-004).

## Complexity Tracking

*Nenhuma violação da constituição identificada. Seção não aplicável.*
