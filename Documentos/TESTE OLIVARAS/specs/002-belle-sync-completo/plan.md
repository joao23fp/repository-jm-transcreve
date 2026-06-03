# Implementation Plan: Belle como Fonte de Verdade — Sync Completo

**Branch**: `002-belle-sync-completo` | **Date**: 2026-06-03 | **Spec**: [spec.md](spec.md)

---

## Summary

Garantir que todo evento relevante que acontece na Belle (novo cliente com agendamento, venda aprovada, sessão realizada, cancelamento) chegue automaticamente ao Clint com todos os campos necessários. Isso cobre 8 gaps identificados: sync de contatos mais abrangente, captura de indicação, parcelas, tipo de agendamento, sala, data de início do protocolo, e populamento da tabela `sessoes`.

---

## Technical Context

**Plataforma**: n8n v2.13.4 self-hosted (workflows.rotha.co)
**Banco de dados**: Supabase / PostgreSQL (projeto rvjzysywjmhkqkpxcqgi)
**CRM**: Clint Digital (api.clint.digital)
**Sistema clínico**: Belle Software (app.bellesoftware.com.br)
**Padrão de sync**: Polling periódico (não webhook — Belle não suporta)
**Credencial Postgres**: `PostgreSQL Odara` (ID: 6W46gLQ9cENri003)
**Performance**: LIMIT 10 itens por execução (conforme Princípio IV)

---

## Constitution Check

| Princípio | Verificação | Status |
|---|---|---|
| I — Belle como fonte primária | Todos os fluxos desta spec leem da Belle → escrevem no Clint. Nenhum dado vai do Clint para Belle. | ✅ PASSA |
| II — Sync unidirecional Belle → Clint | Apenas novos campos do Belle chegando ao Clint. Direção única mantida. | ✅ PASSA |
| III — Ativação gradual | Esta feature é infraestrutura/dados — não requer aprovação Meta. Pode ser ativada independente das fases. | ✅ PASSA |
| IV — Idempotência | Todos os workflows usarão flags de controle e WHERE IS NULL para evitar duplicatas. | ✅ PASSA |
| V — Credenciais manuais | Todo nó Postgres criado/editado DEVE ter credencial trocada para `PostgreSQL Odara` após deploy. | ⚠️ REQUER ATENÇÃO |
| VI — Testes no contato dev | Mensagens WhatsApp sempre para +5511940210984 durante testes. | ✅ PASSA (não há WhatsApp nesta spec) |

---

## Phase 0: Research

### Decisão 1 — Campo `data_inicio` do protocolo na Belle

**Investigado**: Endpoint `/venda_planos` retorna: `dataVenda`, `dataInclusao`, `dataRescisao`. Nenhum campo chamado `data_inicio` ou `data_inicio_protocolo` foi encontrado.

**Decisão**: `data_inicio` na tabela `vendas` deve ser populado com a data da **primeira sessão realizada** (primeiro `agendamento` com `status = 'Atendido'` vinculado à venda). Esta é a data real de início do protocolo.

**Impacto**: WF-C (sync sessões) deve detectar quando uma sessão for a primeira e atualizar `data_inicio` na venda correspondente.

---

### Decisão 2 — Scope do SYNC Novos Contatos

**Investigado**: Query atual exige `EXISTS (vendas WHERE status = 'Aprovado')`. João Miguel ficou de fora por ter só agendamento.

**Decisão**: Adicionar OR clause: clientes COM agendamento nos últimos 90 dias também são sincronizados, mesmo sem venda aprovada.

**Rationale**: Belle é a fonte de verdade. Qualquer paciente agendada já é uma oportunidade real.

---

### Decisão 3 — Armazenamento de `parcelas`

**Investigado**: `/venda_planos` retorna array `parcelas` com campos: `idParcela`, `dataLancamento`, `dataVencimento`, `dataPagamento`, `valor`, `status`.

**Decisão**: Nova tabela `parcelas` no banco (não JSONB inline) para permitir queries de faturamento por período, projeção de recebíveis e análise de inadimplência.

---

### Decisão 4 — Tabela `sessoes` vazia (00d não está populando)

**Investigado**: `sessoes` tem 0 registros; `agendamentos` tem 23 com `status = 'Atendido'`.

**Decisão**: Corrigir o workflow 00d para detectar agendamentos `Atendido` sem correspondência na tabela `sessoes` e criar os registros. Incluir backfill dos 23 agendamentos históricos.

---

## Phase 1: Design

### Mudanças no Banco de Dados

**Tabela `agendamentos`** — adicionar colunas:
```sql
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(50),        -- Consulta / Serviço / Retorno
  ADD COLUMN IF NOT EXISTS sala_nome VARCHAR(200);  -- Nome da sala do agendamento
```

**Tabela `vendas`** — adicionar colunas:
```sql
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS indicacao VARCHAR(500),  -- Quem indicou a paciente
  ADD COLUMN IF NOT EXISTS cod_indicacao VARCHAR(50); -- Código da indicação na Belle
```

**Nova tabela `parcelas`**:
```sql
CREATE TABLE IF NOT EXISTS parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID REFERENCES vendas(id),
  belle_parcela_id BIGINT,
  data_lancamento DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  valor NUMERIC(10,2),
  status VARCHAR(50),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcelas_belle_id ON parcelas(belle_parcela_id);
```

**Tabela `clientes`** — adicionar coluna:
```sql
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS dt_cadastro_belle DATE; -- Data de cadastro original na Belle
```

---

### Workflows a Modificar

| Workflow | Mudança |
|---|---|
| **SYNC Novos Contatos Belle → Clint** | Adicionar OR: clientes com agendamento nos últimos 90 dias |
| **WF-B (Belle Nova Venda → Clint)** | Capturar `indicacao` e salvar em `vendas.indicacao` e no deal Clint |
| **WF-B** | Capturar `parcelas` e fazer upsert na nova tabela `parcelas` |
| **01v2 (Sync Agendamentos)** | Capturar `tipo` e `sala.nome` e salvar em `agendamentos` |
| **01v2** | Enviar `tipo` e `sala_nome` ao criar/atualizar deal no Clint |
| **00d / 00c (Sync Sessões)** | Corrigir para popular tabela `sessoes` corretamente |
| **WF-C** | Detectar primeira sessão e atualizar `vendas.data_inicio` |

---

### Workflows Novos

Nenhum workflow novo é necessário — apenas correções e extensões dos existentes.

---

## Project Structure

```
specs/002-belle-sync-completo/
├── spec.md              ← requisitos
├── plan.md              ← este arquivo
├── data-model.md        ← schema das mudanças no banco
├── research.md          ← decisões técnicas (inline acima)
├── contracts/
│   ├── belle-api.md     ← campos novos mapeados da Belle API
│   └── clint-fields.md  ← campos novos no Clint
└── checklists/
    └── requirements.md
```

---

## Implementation Phases

### Fase 1 — Banco de dados (sem risco)
- Criar migration com ALTER TABLE e CREATE TABLE parcelas
- Não quebra nenhum workflow existente

### Fase 2 — Sync Contatos (alta prioridade)
- Corrigir query do SYNC Novos Contatos para incluir clientes com agendamentos recentes
- Testar com João Miguel

### Fase 3 — Captura de novos campos (medium)
- 01v2: adicionar `tipo` e `sala_nome`
- WF-B: adicionar `indicacao` e `parcelas`

### Fase 4 — Sessões (corretivo)
- Corrigir 00d para popular tabela `sessoes`
- Backfill dos 23 atendimentos históricos
- WF-C: detectar primeira sessão e atualizar `data_inicio`
