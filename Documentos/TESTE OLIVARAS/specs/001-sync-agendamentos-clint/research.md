# Research: Workflow 01 v2 — Sync Agendamentos Belle → Clint

**Branch**: `001-sync-agendamentos-clint` | **Date**: 2026-05-28

## Decisões Técnicas

### 1. Plataforma de Automação

**Decisão**: n8n self-hosted com SDK ESM (`@n8n/workflow-sdk`)

**Rationale**: Projeto já executa 19 workflows n8n. Infraestrutura e credenciais
já configuradas. SDK ESM é obrigatório — `require()` e destructuring via require
não são permitidos na versão atual do n8n.

**Padrão de import obrigatório**:
```js
import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';
```

### 2. Belle API — Endpoints e Formato

**Decisão**: 3 chamadas GET separadas por tipo de status

**Base URL**: `https://app.bellesoftware.com.br/api/release/controller/IntegracaoExterna/v1.0/`

**Auth**: Header `Authorization: 669ebde7afafcd939eff35cc43a594cb` (token direto, não Bearer)

**Endpoints**:
| Endpoint               | Tipo        | Janela de datas          |
|------------------------|-------------|--------------------------|
| `agendamentos`         | Marcados    | hoje-2d → hoje+30d       |
| `agendamentos/finalizados` | Atendidos | hoje-2d → hoje+30d   |
| `agendamentos/cancelados`  | Cancelados | hoje-2d → hoje+30d   |

**Query params**: `codEstab=1`, `dtInicio=DD/MM/YYYY`, `dtFim=DD/MM/YYYY`

**Campos de resposta relevantes**:
- `codConsulta` → `belle_id`
- `cliente.cod` → `belle_cliente_cod`
- `cliente.nome` → `nome_cliente`
- `prof.nome` → `nome_profissional`
- `sala.nome` → `nome_sala`
- `servicos[]` → array de `{cod, nome}`
- `dtAgenda` → formato DD/MM/YYYY (precisa conversão para ISO)
- `hrConsulta` → HH:MM (combinar com dtAgenda → timestamp ISO)
- `status` → "Marcado" / "Atendido" / "Cancelado"

**Janela v2** (vs v1):
- v1: abertos hoje→+7d, finalizados/cancelados só hoje
- v2: todos os 3 endpoints com janela hoje-2d → hoje+30d (FR-002)

### 3. Clint API — Criação e Movimentação de Cards

**Decisão**: API REST Clint com header `api-token`

**Auth**: Header `api-token: TOKEN` — NUNCA `Authorization: Bearer`

**Criar card (deal)**:
```
POST /api/deals
Body: {
  "contact_id": "<clint_contact_uuid>",
  "origin_id": "58d30a69-...",         // funil ODARA | Aquisição TESTE
  "stage_id": "<uuid-da-etapa>",
  "name": "<título do card>",
  // campos customizados conforme Clint
}
Response: { "id": "<clint_card_id UUID>", ... }
```

**Mover etapa**:
```
PATCH /api/deals/<clint_card_id>
Body: { "stage_id": "<novo-stage-uuid>" }
```

**Mapeamento de etapas** (FR-007):
| Status Belle | Etapa Clint         | stage_id                               |
|--------------|---------------------|----------------------------------------|
| Marcado      | Avaliação Agendada  | `711be8cc-a0cb-4bcb-ae40-428f1ad47873` |
| Cancelado    | Reagendar           | `455aafb0-8fef-45d6-beb4-41888cc7d18a` |
| Atendido     | Consulta Realizada  | `f09cdbdb-fb8e-4f04-b5f8-4a20a8de3341` |

**origin_id do funil**: `58d30a69-0378-4dc5-9a77-72a5c1570671` (ODARA | Aquisição TESTE)

**Tratamento de erros**:
- 4xx: registrar erro, não marcar como sincronizado, tentar na próxima rodada
- 5xx / timeout: interromper execução imediatamente (sem retry imediato)

### 4. Banco de Dados — Tabela Agendamentos

**Decisão**: PostgreSQL (Supabase) via credencial `PostgreSQL Odara`

**Colunas existentes relevantes**:
- `id UUID PK`
- `belle_id INTEGER UNIQUE` — chave de upsert
- `clint_card_id UUID` — preenchido após criar card no Clint
- `cliente_id UUID FK → clientes(id)`
- `data_hora TIMESTAMP`
- `status VARCHAR(50)` — status atual Belle
- `nome_profissional`, `nome_sala`, `servicos JSONB`

**Join necessário**:
```sql
SELECT a.*, c.clint_contact_uuid
FROM agendamentos a
JOIN clientes c ON c.belle_cliente_cod::text = a.belle_cliente_cod
WHERE a.data_hora BETWEEN NOW() - INTERVAL '2 days' AND NOW() + INTERVAL '30 days'
  AND c.clint_contact_uuid IS NOT NULL
  AND (a.clint_card_id IS NULL OR a.status != a.clint_status_enviado)
LIMIT 20
```

**Coluna nova necessária**: `clint_status_enviado VARCHAR(50)` — para rastrear qual
status foi enviado ao Clint pela última vez (idempotência, FR-004).
Ver data-model.md para o migration SQL.

### 5. Agendador — Schedule Trigger

**Decisão**: Nó `scheduleTrigger` do n8n com modo `specificTime` (4 horários fixos)

**Configuração**:
```
07:30, 13:00, 16:00, 20:00 (horário de Brasília, UTC-3)
```

No SDK n8n, usar o trigger com `rule.interval` do tipo `specificTime` ou configurar
manualmente no n8n UI após deploy via MCP (o SDK pode não suportar múltiplos
horários fixos nativamente — verificar ao implementar).

### 6. Idempotência (Princípio IV da Constituição)

**Decisão**: Dois filtros de controle

1. `clint_card_id IS NULL` → criar card
2. `clint_card_id IS NOT NULL AND status != clint_status_enviado` → mover etapa
3. Caso contrário → ignorar (sem atualização desnecessária — SC-004)

**LIMIT 20 por execução** (FR-008) — segurança contra sobrecarga.

### 7. Sumário ETL (FR-011)

**Decisão**: Nó Code final agrega contadores de cada ramo do workflow

Campos do sumário:
- `total_encontrados`: agendamentos dentro da janela com clint_contact_uuid
- `criados`: cards novos criados no Clint
- `atualizados`: etapas movidas no Clint
- `ignorados_sem_contato`: sem clint_contact_uuid
- `erros`: chamadas Clint com 4xx

### 8. Workflow 01 original

**Decisão**: Manter ativo em paralelo durante desenvolvimento; desativar SOMENTE
após primeira execução manual bem-sucedida do 01 v2 (FR-010, Princípio III).

ID do workflow original: `wwVjH7n0hTLQust5` (n8n)
