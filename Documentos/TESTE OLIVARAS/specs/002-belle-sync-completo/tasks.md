# Tasks: Belle como Fonte de Verdade — Sync Completo

**Input**: Design documents from `/specs/002-belle-sync-completo/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [data-model.md](data-model.md) · [contracts/](contracts/)

**Organization**: Tarefas organizadas por user story para entrega incremental e testável.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: User story correspondente (US1, US2, US3, US4)

---

## Phase 1: Setup — Migrations no Banco

**Purpose**: Criar as novas colunas e tabelas sem quebrar nenhum workflow existente.

- [X] T001 Criar migration no Supabase: `ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tipo VARCHAR(50), ADD COLUMN IF NOT EXISTS sala_nome VARCHAR(200)` — via MCP execute_sql
- [X] T002 Criar migration no Supabase: `ALTER TABLE vendas ADD COLUMN IF NOT EXISTS indicacao VARCHAR(500), ADD COLUMN IF NOT EXISTS cod_indicacao VARCHAR(50)` — via MCP execute_sql
- [X] T003 Criar migration no Supabase: `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dt_cadastro_belle DATE` — via MCP execute_sql
- [X] T004 Criar tabela `parcelas` no Supabase com campos: id, venda_id, belle_parcela_id (UNIQUE), data_lancamento, data_vencimento, data_pagamento, valor, status — via MCP execute_sql
- [X] T005 Verificar estrutura atual da tabela `sessoes` no Supabase e confirmar colunas: id, venda_id, agendamento_id, numero_sessao, data_sessao, servico_nome — via MCP list_tables + execute_sql

**Checkpoint**: Todas as migrações executadas sem erro; colunas visíveis no Supabase.

---

## Phase 2: Foundational — Verificação de Pré-condições

**Purpose**: Garantir que os dados de referência existem antes de modificar workflows.

- [X] T006 Verificar via Supabase se tabela `sessoes` tem 0 registros e tabela `agendamentos` tem registros `status = 'Atendido'` sem correspondência em `sessoes` — confirmar o gap
- [X] T007 [P] Verificar workflow 00d no n8n: identificar por que não está populando a tabela `sessoes` — via MCP get_workflow_details (BUG: nó 1 faz DROP TABLE a cada 30min + usa INTEGER em vez de UUID)
- [X] T008 [P] Testar endpoint `/venda_planos` da Belle com filtro de 1 mês para confirmar campos `indicacao` e `parcelas` na resposta — via curl (parcelas confirmadas com formaPagamento, valorBruto, dataConfirmacao)

**Checkpoint**: Gap da tabela sessoes confirmado; Belle retorna indicação e parcelas.

---

## Phase 3: US1 — Toda paciente da Belle aparece no Clint (P1)

**Goal**: Clientes com agendamentos recentes (últimos 90 dias) são sincronizados para o Clint, mesmo sem venda aprovada.

**Independent Test**: Criar cliente na Belle, agendar consulta, aguardar 1 hora → contato aparece no Clint com nome e telefone corretos.

- [X] T009 [US1] Atualizar query do nó "DB Clientes Sem Clint UUID" no workflow "SYNC Novos Contatos Belle → Clint" (ID: yHxYYFbtu5PatBWU) para incluir OR com agendamentos nos últimos 90 dias — conforme `contracts/clint-fields.md`
- [X] T010 [US1] Salvar e publicar o workflow "SYNC Novos Contatos Belle → Clint" após a alteração
- [X] T011 [US1] Testar com João Miguel (belle_id: 16559580) executando manualmente o workflow — clint_contact_uuid = 09dbe993 salvo às 10:49 ✅

**Checkpoint (US1)**: João Miguel aparece no Clint e `clint_contact_uuid` está preenchido no banco.

---

## Phase 4: US2 — Deal reflete todos os dados da venda Belle (P1)

**Goal**: Indicação e parcelas da Belle chegam ao banco e ao deal do Clint.

**Independent Test**: Aprovar venda com indicação na Belle → deal no Clint mostra quem indicou + tabela `parcelas` tem registros.

- [ ] T012 [US2] Atualizar workflow WF-B: adicionar captura de `indicacao` do campo `venda_planos.indicacao` e salvar em `vendas.indicacao` via queryReplacement no nó DB de upsert
- [ ] T013 [US2] Atualizar WF-B: enviar campo `indicacao_belle` ao criar/atualizar deal no Clint no objeto `fields`
- [ ] T014 [US2] Atualizar WF-B: capturar array `parcelas` da resposta da Belle e fazer upsert na tabela `parcelas` via nó Postgres (INSERT ON CONFLICT belle_parcela_id DO UPDATE)
- [ ] T015 [US2] Atualizar WF-B: capturar `dataInclusao` da Belle e salvar como `dt_cadastro_belle` em `clientes` quando processar a venda
- [ ] T016 [US2] Testar WF-B com uma venda que tenha indicação preenchida — verificar banco e deal no Clint

**Checkpoint (US2)**: `vendas.indicacao` preenchida; tabela `parcelas` com registros; deal Clint com `indicacao_belle` visível.

---

## Phase 5: US3 — Agendamento reflete tipo e sala (P2)

**Goal**: Tipo de atendimento (Consulta/Serviço/Retorno) e sala chegam ao banco e ao deal do Clint.

**Independent Test**: Criar agendamento tipo "Consulta" na Sala de Procedimento → deal Clint mostra tipo e sala.

- [ ] T017 [US3] Atualizar workflow 01v2: adicionar captura de `tipo` e `sala.nome` do JSON de agendamentos da Belle e salvar em `agendamentos.tipo` e `agendamentos.sala_nome` no upsert Postgres
- [ ] T018 [US3] Atualizar 01v2: incluir `tipo_agendamento` e `sala_belle` ao criar/atualizar deal no Clint no objeto `fields`
- [ ] T019 [US3] Testar 01v2 com agendamento do João Miguel (03/06/2026, tipo: Consulta) — verificar banco e deal Clint

**Checkpoint (US3)**: `agendamentos.tipo = 'Consulta'` e `sala_nome = 'Sala de Procedimento'` no banco; campos visíveis no deal do Clint.

---

## Phase 6: US4 — Tabela sessões populada a cada atendimento (P2)

**Goal**: Cada atendimento finalizado na Belle gera um registro na tabela `sessoes`.

**Independent Test**: Marcar agendamento como "Atendido" na Belle → registro aparece em `sessoes` com número de sessão correto.

- [ ] T020 [US4] Corrigir workflow 00d no n8n: identificar o bug que impede o populamento da tabela `sessoes` e corrigir a lógica de detecção de agendamentos Atendidos sem sessão correspondente
- [ ] T021 [US4] Atualizar 00d: garantir INSERT idempotente em `sessoes` com ON CONFLICT em `agendamento_id`
- [ ] T022 [US4] Executar backfill dos 23 agendamentos históricos com `status = 'Atendido'` que não têm registro em `sessoes` — via script SQL manual
- [ ] T023 [US4] Atualizar WF-C: após detectar nova sessão realizada, verificar se é a primeira sessão da venda e atualizar `vendas.data_inicio` com a data desse atendimento
- [ ] T024 [US4] Testar end-to-end: marcar agendamento como Atendido na Belle → aguardar 00d → verificar registro em `sessoes` + verificar `vendas.data_inicio` atualizado

**Checkpoint (US4)**: Tabela `sessoes` com 23+ registros; `vendas.data_inicio` preenchido para protocolos com ao menos 1 sessão.

---

## Phase Final: Polish & Validação

- [ ] T025 Verificar credencial `PostgreSQL Odara` em todos os nós Postgres modificados nos workflows WF-B, 01v2, 00d e WF-C — conforme Princípio V da Constitution
- [ ] T026 [P] Publicar todos os workflows modificados no n8n após validação
- [ ] T027 [P] Executar manualmente o SYNC de Contatos para confirmar que João Miguel agora aparece no Clint
- [ ] T028 Atualizar `data-model.md` com schema final das migrations executadas
- [ ] T029 Commitar todos os artefatos da spec (spec.md, plan.md, data-model.md, contracts/, tasks.md)

---

## Dependencies

```
Phase 1 (Setup/Migrations) → Phase 2 (Verificação) → Phases 3, 4, 5, 6 (paralelas entre si) → Phase Final
```

US3 e US4 dependem de Phase 1 (novas colunas).
US1 e US2 são independentes entre si e podem rodar em paralelo.

## Parallel Opportunities

- T007 + T008: verificar 00d e testar Belle API simultaneamente
- T012 + T017: atualizar WF-B e 01v2 são em workflows diferentes — paralelos
- T020 + T023: corrigir 00d e atualizar WF-C são independentes
- T025 + T026 + T027: polish tasks são todas independentes

## Implementation Strategy

**MVP (US1 — Toda paciente aparece no Clint):**
1. Phases 1+2 (migrations + verificação)
2. Phase 3 (US1 — SYNC Contatos)
3. Testar com João Miguel

**Incremento 1**: US2 (indicação + parcelas) — maior impacto para dashboards
**Incremento 2**: US4 (sessões + data_inicio) — desbloqueia NPS automático
**Incremento 3**: US3 (tipo + sala) — qualidade de dados operacionais
