# Tasks: Workflow de Follow-up Automático (Sergio — Novo Schema)

**Input**: Design documents from `specs/001-followup-sergio-novo-schema/`
**Workflow output**: `workflows/followup-sergio-v2.json`
**Sem testes**: Este projeto é um workflow n8n — validação via pin data e execução manual.

## Format: `[ID] [P?] [Story] Descrição com caminho`

- **[P]**: Pode rodar em paralelo (sem dependências entre si)
- **[Story]**: User story correspondente (US1–US4)

---

## Phase 1: Setup

**Purpose**: Criar a estrutura de arquivos do projeto.

- [x] T001 Criar diretório `workflows/` na raiz do projeto
- [x] T002 Inicializar `workflows/followup-sergio-v2.json` com estrutura base n8n (`{"nodes":[],"connections":{},"meta":{"instanceId":""}}`)

---

## Phase 2: Foundational (Nós Compartilhados)

**Purpose**: Cabeça do workflow — bloqueia todas as branches até estar completa.

**⚠️ CRÍTICO**: Nenhuma branch pode ser implementada antes desta fase.

- [x] T003 Implementar nó **Start** (`executeWorkflowTrigger`, inputs: `contact_id`, `etapa_funil`, `organization_id`) em `workflows/followup-sergio-v2.json`
- [x] T004 [P] Implementar nó **Busca Contato** (Postgres `executeQuery`, `alwaysOutputData: true`, SQL: SELECT id/name/email/phone FROM contacts WHERE id = contact_id AND organization_id) em `workflows/followup-sergio-v2.json`
- [x] T005 Implementar nó **IF: Contato existe?** (condição: `$json.id` is not empty) + nó **NoOp: Contato não encontrado** (output false) em `workflows/followup-sergio-v2.json`
- [x] T006 Implementar nó **Variáveis do Contato** (Set: `contact_id`, `organization_id`, `nome` ← name, `email`, `telefone` ← phone, `etapa_funil` ← Start.etapa_funil) em `workflows/followup-sergio-v2.json`
- [x] T007 [P] Implementar nó **Busca Status Atual** (Postgres `executeQuery`, `alwaysOutputData: true`, SQL: SELECT etapa_nome FROM followup_status_atual WHERE contact_id = contact_id) em `workflows/followup-sergio-v2.json`
- [x] T008 Implementar nó **Variáveis de Status** (Set: `etapa_atual` ← `$json.etapa_nome ?? ''`) em `workflows/followup-sergio-v2.json`
- [x] T009 Implementar nó **Switch** (Switch v3.3, 7 outputs, condição: Variáveis do Contato.etapa_funil; outputs nomeados: Base, Em Contato, Dia 1, Dia 2, Dia 3, Negociação Fria, Negociação Quente) em `workflows/followup-sergio-v2.json`
- [x] T010 Conectar T003→T004→T005→T006→T007→T008→T009 nas connections do JSON em `workflows/followup-sergio-v2.json`

**Checkpoint**: Cabeça completa — executar com pin data e confirmar que dados chegam no Switch.

---

## Phase 3: US1 + US2 — Branch Base (Priority: P1) 🎯 MVP

**Goal**: Implementar o padrão completo de uma branch (Base): verificação de threshold, registro no histórico, atualização do status atual e disparo ao Clint.

**Independent Test**: Executar com `etapa_funil = "Base"` e um `contact_id` sem histórico → confirmar linha em `followup_historico`, linha em `followup_status_atual` e POST recebido no Clint.

- [x] T011 [US1] Implementar nó **Verifica Histórico Base** (Postgres `executeQuery`, `alwaysOutputData: true`, SQL: SELECT dias_desde_criacao::integer FROM followup_historico WHERE contact_id AND organization_id AND etapa_nova = 'Base' ORDER BY created_at DESC LIMIT 1) em `workflows/followup-sergio-v2.json`
- [x] T012 [US2] Implementar nó **IF: Threshold OK? Base** (condição OR: `$json.dias_desde_criacao >= 10` OR `$json.dias_desde_criacao` is empty; true = prossegue, false = bloqueia) em `workflows/followup-sergio-v2.json`
- [x] T013 [US2] Implementar nó **NoOp: Dentro do threshold Base** (output false do IF — encerra silenciosamente) em `workflows/followup-sergio-v2.json`
- [x] T014 [US1] Implementar nó **Registra Histórico Base** (Postgres `executeQuery`, SQL: INSERT INTO followup_historico com organization_id, contact_id, NULLIF(etapa_atual, '') como etapa_anterior, etapa_nova = 'Base', motivo = 'followup_automatico', NOW() - INTERVAL '3 hours') em `workflows/followup-sergio-v2.json`
- [x] T015 [US1] Implementar nó **Atualiza Status Atual Base** (Postgres `executeQuery`, SQL: INSERT ... ON CONFLICT (contact_id) DO UPDATE SET etapa_nome = 'Base', ultima_acao_em, updated_at WHERE etapa_nome NOT IN ('Negociação Fria', 'Negociação Quente')) em `workflows/followup-sergio-v2.json`
- [x] T016 [US1] Implementar nó **Dispara Clint Base** (HTTP Request POST, URL: `https://functions-api.clint.digital/endpoints/integration/webhook/444d0784-976d-411b-8582-08ded943a245`, body: nome/email/telefone/etapa_funil das Variáveis do Contato) em `workflows/followup-sergio-v2.json`
- [x] T017 [US1] Implementar nó **NoOp: Concluído Base** (output final do Clint Base) em `workflows/followup-sergio-v2.json`
- [x] T018 [US1] Conectar Switch output 0 → T011 → T012 → (true) T014 → T015 → T016 → T017 / (false) T013 nas connections em `workflows/followup-sergio-v2.json`

**Checkpoint**: Branch Base funcional. Testar com pin data `{etapa_funil: "Base", contact_id: "<uuid_novo>"}` e verificar os 3 efeitos colaterais.

---

## Phase 4: US1 + US2 — Branches Restantes (Priority: P1)

**Goal**: Replicar o padrão da branch Base para as 6 etapas restantes. Todos os nós são cópias com substituição de `{ETAPA}` e `{ENDPOINT}`.

**Independent Test**: Para cada branch, executar com um `contact_id` sem histórico naquela etapa e confirmar os 3 efeitos colaterais (historico + status + Clint).

- [x] T019 [P] [US1] Implementar branch completa **Em Contato** (5 nós: Verifica/IF/NoOp/Registra/Atualiza/Dispara, etapa_nova = 'Em Contato', endpoint padrão `8d91a27e-...`, Switch output 1) em `workflows/followup-sergio-v2.json`
- [x] T020 [P] [US1] Implementar branch completa **Dia 1** (etapa_nova = 'Dia 1', endpoint padrão, Switch output 2) em `workflows/followup-sergio-v2.json`
- [x] T021 [P] [US1] Implementar branch completa **Dia 2** (etapa_nova = 'Dia 2', endpoint padrão, Switch output 3) em `workflows/followup-sergio-v2.json`
- [x] T022 [P] [US1] Implementar branch completa **Dia 3** (etapa_nova = 'Dia 3', endpoint padrão, Switch output 4) em `workflows/followup-sergio-v2.json`
- [x] T023 [P] [US1] Implementar branch completa **Negociação Fria** (etapa_nova = 'Negociação Fria', endpoint padrão, Switch output 5) em `workflows/followup-sergio-v2.json`
- [x] T024 [P] [US1] Implementar branch completa **Negociação Quente** (etapa_nova = 'Negociação Quente', endpoint padrão, Switch output 6) em `workflows/followup-sergio-v2.json`
- [x] T025 [US1] Conectar Switch outputs 1–6 às respectivas branches (T019–T024) nas connections em `workflows/followup-sergio-v2.json`

**Checkpoint**: Todas as 7 branches implementadas. Executar um teste por branch com pin data de primeiro contato e confirmar que cada uma grava no banco e dispara ao Clint.

---

## Phase 5: US3 — Proteção de Regressão (Priority: P2)

**Goal**: Verificar e confirmar que o SQL de UPSERT em todos os 7 nós "Atualiza Status Atual" inclui a cláusula `WHERE etapa_nome NOT IN ('Negociação Fria', 'Negociação Quente')`.

**Independent Test**: Executar com um contato cujo `followup_status_atual.etapa_nome = 'Negociação Quente'` e `etapa_funil = 'Dia 1'` → confirmar que o status_atual permanece 'Negociação Quente' após a execução.

- [x] T026 [US3] Auditar o SQL dos 7 nós "Atualiza Status Atual" em `workflows/followup-sergio-v2.json` — confirmar que todos possuem a cláusula `WHERE followup_status_atual.etapa_nome NOT IN ('Negociação Fria', 'Negociação Quente')` no DO UPDATE
- [x] T027 [US3] Adicionar pin data de teste de regressão ao arquivo: `{contact_id: "<uuid_em_neg_quente>", etapa_funil: "Dia 1", organization_id: "<org_id>"}` no nó Start em `workflows/followup-sergio-v2.json`

**Checkpoint**: Executar com pin data de regressão e confirmar que `followup_status_atual` não é atualizado.

---

## Phase 6: US4 — Rotamento de Webhooks (Priority: P2)

**Goal**: Confirmar que "Base" usa o endpoint exclusivo e as demais 6 etapas usam o endpoint padrão.

**Independent Test**: Verificar URLs nos nós "Dispara Clint" de todas as branches.

- [x] T028 [US4] Auditar URLs dos 7 nós "Dispara Clint" em `workflows/followup-sergio-v2.json` — confirmar que apenas a branch Base usa `444d0784-...` e todas as demais usam `8d91a27e-...`

**Checkpoint**: Rotamento confirmado.

---

## Phase 7: Polish & Validação Final

**Purpose**: Pin data representativo, exportação e documentação mínima.

- [x] T029 [P] Adicionar pin data de teste ao nó Start para o cenário principal: `{contact_id: "<uuid_novo>", etapa_funil: "Em Contato", organization_id: "<org_id>"}` em `workflows/followup-sergio-v2.json`
- [x] T030 Executar o workflow completo uma vez para cada uma das 7 etapas com contatos de teste e confirmar ausência de erros em `workflows/followup-sergio-v2.json`
- [x] T031 Exportar o workflow finalizado do n8n e salvar como `workflows/followup-sergio-v2.json` (substituir o rascunho pelo JSON exportado)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — iniciar imediatamente
- **Phase 2 (Foundational)**: Depende de Phase 1 — **bloqueia todas as branches**
- **Phase 3 (US1+US2 Base)**: Depende de Phase 2 — branch template, deve ser a primeira branch
- **Phase 4 (Branches Restantes)**: Depende de Phase 3 (padrão validado) — branches T019–T024 podem correr em paralelo entre si
- **Phase 5 (US3)**: Depende de Phase 4 (todos os UPSERTs existem para auditar)
- **Phase 6 (US4)**: Pode correr em paralelo com Phase 5
- **Phase 7 (Polish)**: Depende de Phases 5 e 6

### Parallel Opportunities

- **T004 + T007**: Podem ser implementados juntos (nós independentes)
- **T019–T024**: Todas as branches restantes são independentes entre si — paralelizáveis
- **T026 + T028**: Auditorias independentes — podem rodar juntas
- **T028 + T029**: Independentes — podem rodar juntas

---

## Implementation Strategy

### MVP (US1 + US2 — branch Base funcionando)

1. Completar Phase 1 + Phase 2
2. Completar Phase 3 (branch Base)
3. **PARAR e VALIDAR**: Executar com pin data, conferir historico + status_atual + Clint
4. Se validado → continuar para Phase 4

### Entrega Incremental

1. Phase 1+2 → cabeça pronta
2. Phase 3 → 1 branch funcional (MVP demonstrável)
3. Phase 4 → 7 branches funcionais
4. Phase 5+6 → proteções validadas
5. Phase 7 → workflow limpo e exportado

---

## Notes

- [P] = nós sem dependência entre si, podem ser construídos em paralelo no editor n8n
- Cada "Implementar branch completa" (T019–T024) = 6 nós + conexões (copiar padrão da branch Base e substituir etapa/endpoint)
- A cláusula NULLIF no INSERT do histórico é crítica para o primeiro registro — não omitir
- O `alwaysOutputData: true` nos nós Postgres de verificação é obrigatório — sem ele, a branch para se não houver registro
- Credential IDs: Postgres = `OU8cyzGlL8UbRk7p` (supabase-afiliadotruppel)
