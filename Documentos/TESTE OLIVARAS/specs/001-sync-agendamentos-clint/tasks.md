# Tasks: Workflow 01 v2 — Sync Agendamentos Belle → Clint

**Input**: Design documents from `/specs/001-sync-agendamentos-clint/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/](contracts/)

**Organization**: Tarefas organizadas por user story para entrega incremental e testável.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story da spec (US1, US2, US3)
- Caminho do arquivo alvo em cada tarefa

---

## Phase 1: Setup

**Purpose**: Preparação do banco de dados e leitura da documentação do SDK

- [X] T001 Verificar que a coluna `clint_status_enviado VARCHAR(50)` existe na tabela `agendamentos` (migration executada manualmente — confirmar via Supabase SQL Editor ou MCP `execute_sql`)
- [X] T002 Confirmar que o index `idx_agendamentos_clint_sync` foi criado conforme `data-model.md`
- [X] T003 Ler o SDK reference completo via MCP `get_sdk_reference` para confirmar sintaxe de import ESM e padrões de nós antes de escrever qualquer código
- [X] T004 [P] Buscar tipos dos nós necessários via MCP `get_node_types`: `n8n-nodes-base.scheduleTrigger`, `n8n-nodes-base.code`, `n8n-nodes-base.httpRequest`, `n8n-nodes-base.postgres`, `n8n-nodes-base.if`
- [X] T005 [P] Confirmar o `origin_id` UUID completo do funil "ODARA | Aquisição TESTE" nas variáveis de ambiente n8n ou via Clint API antes de hardcoder no workflow

**Checkpoint**: SDK lido, tipos dos nós em mãos, migration confirmada, origin_id confirmado

---

## Phase 2: Foundational (Belle → DB Pipeline)

**Purpose**: Pipeline de coleta Belle → normalização → upsert no banco. Bloqueia TODAS as user stories.

**⚠️ CRÍTICO**: Nenhuma user story pode começar até esta fase estar completa

- [X] T006 Criar o arquivo de código SDK do workflow em `odara-n8n/workflows/01v2-sync-agendamentos-clint.js` com a estrutura base: import ESM, `workflow()`, trigger Schedule e declaração de todos os nós (sem lógica interna ainda)
- [X] T007 Implementar nó **Schedule 4x/dia** em `odara-n8n/workflows/01v2-sync-agendamentos-clint.js`: `scheduleTrigger` com os horários 07:30, 13:00, 16:00 e 20:00 (BRT -3) — se o SDK não suportar múltiplos `specificTime`, configurar no UI do n8n após deploy
- [X] T008 Implementar nó **Calcular Datas** (Code): gera `dtInicio = hoje - 2 dias` e `dtFim = hoje + 30 dias` em formato `DD/MM/YYYY` para passar às queries Belle
- [X] T009 Implementar nó **Preparar 3 Requests** (Code): retorna 3 items — `{ url: 'agendamentos', dtInicio, dtFim, tipo: 'abertos' }`, `{ url: 'agendamentos/finalizados', ... }`, `{ url: 'agendamentos/cancelados', ... }`
- [X] T010 Implementar nó **BELLE: Buscar Agendamentos** (httpRequest): `GET https://app.bellesoftware.com.br/api/release/controller/IntegracaoExterna/v1.0/{{ $json.url }}` com header `Authorization: 669ebde7afafcd939eff35cc43a594cb` e query params `codEstab=1`, `dtInicio={{ $json.dtInicio }}`, `dtFim={{ $json.dtFim }}`
- [X] T011 Implementar nó **Combinar e Normalizar** (Code, `runOnceForAllItems`): merge dos 3 responses, converte `dtAgenda` DD/MM/YYYY → ISO, combina com `hrConsulta` → `data_hora` timestamp, escapa aspas simples em strings, extrai todos os campos conforme `contracts/belle-api.md`
- [X] T012 Implementar nó **DB: Upsert Agendamentos** (Postgres): `INSERT INTO agendamentos (...) ON CONFLICT (belle_id) DO UPDATE SET status, servicos, nome_profissional, nome_sala, data_hora, sinc_em, atualizado_em` com `RETURNING id, belle_id, status` — habilitar `alwaysOutputData: true`
- [X] T013 Validar o workflow parcial (Phases 1–2) via MCP `validate_workflow` antes de continuar

**Checkpoint**: Belle → DB funcional; upsert confirmado via execução manual parcial

---

## Phase 3: User Story 1 — Agendamento Belle aparece como card no Clint (Priority: P1) 🎯 MVP

**Goal**: Para cada agendamento com `clint_contact_uuid` e sem `clint_card_id`, criar um deal no Clint e salvar o ID retornado.

**Independent Test**: Criar agendamento na Belle → executar workflow manualmente → verificar card no Clint na etapa "Avaliação Agendada" com `clint_card_id` salvo no banco.

**Acceptance Scenarios cobertos**: 1 (criação), 3 (ignorar sem contato), 4 (sem duplicata)

- [X] T014 [US1] Implementar nó **DB: Buscar Pendentes de Criação** (Postgres): `SELECT a.id, a.belle_id, a.status, a.data_hora, a.nome_profissional, a.nome_sala, a.servicos, c.clint_contact_uuid FROM agendamentos a JOIN clientes c ON c.belle_cliente_cod::text = a.belle_cliente_cod WHERE a.data_hora BETWEEN NOW() - INTERVAL '2 days' AND NOW() + INTERVAL '30 days' AND a.clint_card_id IS NULL AND c.clint_contact_uuid IS NOT NULL LIMIT 20` — habilitar `alwaysOutputData: true`
- [X] T015 [US1] Implementar nó **IF: Tem Contato Clint?** (if): `{{ $json.clint_contact_uuid }} IS NOT NULL` — configurar manualmente após deploy (MCP salva IF com condições vazias)
- [X] T016 [US1] Implementar nó **CLINT: Criar Card** (httpRequest): `POST /api/deals` com header `api-token: TOKEN` (NUNCA Bearer), body `{ contact_id, origin_id, stage_id (mapeado do status Belle), name: "Avaliação — [nome_cliente] — [dt_agenda]" }` — usar mapeamento de `contracts/clint-api.md`
- [X] T017 [US1] Implementar nó **Code: Mapear stage_id** (Code, antes do POST Clint): traduz `status` Belle → `stage_id` Clint usando o mapeamento de `contracts/clint-api.md` (Marcado→711be8cc, Cancelado→455aafb0, Atendido→f09cdbdb)
- [X] T018 [US1] Implementar nó **DB: Salvar clint_card_id** (Postgres): `UPDATE agendamentos SET clint_card_id = $1, clint_status_enviado = $2, atualizado_em = NOW() WHERE id = $3` com `queryReplacement` em Expression mode
- [X] T019 [US1] Incrementar contador `criados` no Code de sumário para cada POST bem-sucedido; incrementar `erros` para cada 4xx; implementar interrupção em 5xx/timeout (throw Error para parar execução)

**Checkpoint**: US1 testável independentemente — card aparece no Clint com etapa correta

---

## Phase 4: User Story 2 — Status refletido na etapa do funil (Priority: P2)

**Goal**: Para cada agendamento com `clint_card_id` cujo `status` mudou desde a última sync, mover o card para a etapa correta no Clint.

**Independent Test**: Alterar status na Belle (ex: Marcado → Cancelado) → executar workflow → verificar card movido para "Reagendar" no Clint.

**Acceptance Scenarios cobertos**: 2 (mudança de status), Acceptance Scenario US2.1, US2.2, US2.3

- [X] T020 [US2] Implementar nó **DB: Buscar Pendentes de Update** (Postgres): `SELECT a.id, a.clint_card_id, a.status, a.clint_status_enviado FROM agendamentos a WHERE a.data_hora BETWEEN NOW() - INTERVAL '2 days' AND NOW() + INTERVAL '30 days' AND a.clint_card_id IS NOT NULL AND (a.clint_status_enviado IS NULL OR a.status != a.clint_status_enviado) LIMIT 20` — habilitar `alwaysOutputData: true`
- [X] T021 [US2] Implementar nó **Code: Mapear stage_id para update** (Code): mesmo mapeamento de T017, aplicado ao status atual
- [X] T022 [US2] Implementar nó **CLINT: Mover Etapa** (httpRequest): `PATCH /api/deals/{{ $json.clint_card_id }}` com header `api-token: TOKEN`, body `{ stage_id: "<novo-stage-uuid>" }`
- [X] T023 [US2] Implementar nó **DB: Atualizar clint_status_enviado** (Postgres): `UPDATE agendamentos SET clint_status_enviado = $1, atualizado_em = NOW() WHERE id = $2` com `queryReplacement`
- [X] T024 [US2] Incrementar contador `atualizados` para cada PATCH bem-sucedido no Code de sumário

**Checkpoint**: US2 testável — mudança de status Belle refletida na etapa Clint na próxima execução

---

## Phase 5: User Story 3 — Dados do agendamento visíveis no card Clint (Priority: P3)

**Goal**: O card criado no Clint exibe data, horário, profissional e serviço. Se reagendado, os dados são atualizados.

**Independent Test**: Abrir card no Clint e verificar que data, horário e profissional batem com o agendamento na Belle.

**Acceptance Scenarios cobertos**: US3.1 (dados na criação), US3.2 (dados atualizados)

- [X] T025 [US3] Expandir body do **CLINT: Criar Card** (T016) para incluir campos customizados: `data_consulta`, `hr_consulta`, `nome_profissional`, `servico` (primeiro serviço do array) — confirmar nomes dos campos customizados na API Clint antes de implementar
- [X] T026 [US3] Expandir body do **CLINT: Mover Etapa** (T022) para incluir atualização de campos customizados quando os dados mudaram (ex: reagendamento com novo horário)

**Checkpoint**: US3 testável — campos visíveis no card ao abrir no Clint

---

## Phase Final: Polish & Deploy

**Purpose**: Sumário ETL, configurações obrigatórias pós-MCP e ativação em produção

- [X] T027 Implementar nó **Montar Sumário ETL** (Code, `runOnceForAllItems`): agrega contadores de todos os ramos — `total_encontrados`, `criados`, `atualizados`, `ignorados_sem_contato`, `erros`, `executado_em` — conforme FR-011
- [X] T028 Revisar todos os nós Postgres do workflow e confirmar `alwaysOutputData: true` nos nós T014 (Buscar Pendentes Criação) e T020 (Buscar Pendentes Update) para não quebrar fluxo quando não há pendências
- [X] T029 Revisar todos os nós Postgres e confirmar uso de `queryReplacement` com `$1, $2...` para UUIDs e valores dinâmicos (evitar interpolação direta de UUID no SQL)
- [X] T030 Validar workflow completo via MCP `validate_workflow` — corrigir todos os erros antes de criar
- [X] T031 Deploy via MCP `create_workflow_from_code` com description "Sincroniza agendamentos Belle com cards/deals no funil Clint — 4x/dia (07:30, 13:00, 16:00, 20:00)"
- [X] T032 **OBRIGATÓRIO (Princípio V)**: Abrir workflow no n8n, trocar credencial de TODOS os nós Postgres de `supabase-afiliadotruppel` para `PostgreSQL Odara`
- [X] T033 **OBRIGATÓRIO**: Verificar e configurar manualmente todos os nós IF (MCP salva IF com condições vazias) — IF: Tem Contato Clint? usa `clint_contact_uuid IS NOT NULL`
- [X] T034 Executar workflow manualmente uma vez e verificar: sumário retorna `erros = 0`; cards aparecem no Clint; `clint_card_id` e `clint_status_enviado` preenchidos no banco
- [X] T035 Habilitar o schedule do Workflow 01 v2 no n8n (toggle ativo)
- [X] T036 Desativar o Workflow 01 original (`WR0aydR8CK2sjDWN`) após confirmação da primeira execução agendada bem-sucedida — confirmado inativo desde 20/05; nós Clint nunca foram configurados (placeholder URLs)

---

## Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Final
                                          ↗
                           Todas as US dependem da Phase 2
                           US2 e US3 dependem de US1 (card precisa existir para mover/enriquecer)
```

**MVP Scope**: Phases 1 + 2 + 3 (US1) — card criado no Clint com etapa correta. US2 e US3 são incrementos.

## Parallel Opportunities

- **T003 + T004 + T005**: Leitura SDK + tipos de nós + confirmar origin_id (todos independentes)
- **T008 + T009**: Calcular Datas e Preparar Requests (sem dependência entre si)
- **T017 + T018**: Mapear stage_id e preparar DB update (podem ser escritos em paralelo)
- **T020 + T021**: DB Buscar Pendentes Update + Mapear stage_id update (independentes)
- **T025 + T026**: Campos customizados criação e atualização (independentes)
- **T032 + T033**: Verificação de credenciais e configuração de IF (independentes no n8n)

## Implementation Strategy

1. **MVP**: Completar Phases 1–3 → executar teste manual → confirmar US1 funcional
2. **Incremento 1**: Phase 4 (US2) — mover etapas quando status muda
3. **Incremento 2**: Phase 5 (US3) — dados customizados no card
4. **Produção**: Phase Final — deploy, credenciais, ativação, desativação do 01 original
