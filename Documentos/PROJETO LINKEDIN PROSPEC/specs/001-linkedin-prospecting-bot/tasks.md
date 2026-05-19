# Tasks: LinkedIn Prospecting Bot

**Input**: Design documents from `specs/001-linkedin-prospecting-bot/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Nota**: O projeto já tem implementação parcial. As tasks cobrem verificação, correção e validação de cada FR para garantir conformidade com a spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: User story correspondente (US1–US4)

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Confirmar que todos os pré-requisitos de infraestrutura estão operacionais.

- [x] T001 Verificar instalação do Playwright Chromium (`npx playwright install chromium`) e confirmar executável em `~/.cache/ms-playwright/`
- [ ] T002 Validar sessão LinkedIn executando `linkedin-bot/scripts/check-login.sh` e confirmar cookie `li_at` presente no perfil `profiles/linkedin-extension-native/` ⚠️ Cookie li_at não encontrado — requer login manual
- [x] T003 [P] Confirmar que N8N está rodando em `http://localhost:5679` e workflow está importado

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Corrigir gaps críticos identificados no workflow antes de qualquer validação de user story.

**⚠️ CRÍTICO**: Nenhuma user story pode ser validada antes desta fase estar completa.

- [x] T004 Corrigir nó Set em `linkedin-bot/n8n-workflow.json` — adicionar valor default `http://172.18.0.1:3456` para `tunnel_url` quando não enviado no body: alterar expression para `={{ $json.body.tunnel_url?.replace(/\/+$/, '') || 'http://172.18.0.1:3456' }}`
- [x] T005 [P] Atualizar `specs/001-linkedin-prospecting-bot/contracts/webhook.md` — documentar `tunnel_url` como campo opcional com default `http://172.18.0.1:3456`
- [ ] T006 [P] Verificar credencial Anthropic configurada no nó `Anthropic Chat Model` no N8N e confirmar que o modelo escolhido está ativo ⚠️ API REST requer auth — verificar manualmente em localhost:5679/credentials
- [x] T007 Verificar nó Code em `linkedin-bot/n8n-workflow.json` — confirmar que `extractJsonArray` trata o caso de array vazio `[]` e ObjetoInterrupcao sem campo `leads`

**Checkpoint**: Workflow completo e sem gaps — user stories podem ser validadas

---

## Phase 3: User Story 1 — Busca e Coleta de Perfis por Nicho (Priority: P1) 🎯 MVP

**Goal**: Bot navega ao LinkedIn, localiza candidatos por nicho, valida aderência e retorna JSON estruturado.

**Independent Test**: `curl -s -X POST http://localhost:5679/webhook/prospectar -H "Content-Type: application/json" -d '{"nicho":"infoprodutores","quantidade":3,"modo_teste":true,"enviar_convites":false}'` deve retornar array JSON com até 3 perfis, todos com `evidencia_aderencia` preenchida e `status: "pendente_aprovacao"`.

### Implementação para User Story 1

- [x] T008 [US1] Verificar FR-002 em `linkedin-bot/agent-prompt.txt` — confirmar instrução de navegar diretamente para `https://www.linkedin.com/search/results/people/?keywords=<nicho codificado>` sem passar pela homepage
- [x] T009 [US1] Verificar FR-003 em `linkedin-bot/agent-prompt.txt` — confirmar instrução de usar `browser_evaluate` para extrair anchors `/in/` em lote antes de visitar perfis individuais
- [x] T010 [US1] Verificar FR-004 em `linkedin-bot/agent-prompt.txt` — confirmar que a instrução de validação cobre headline, cargo, sobre e atividades; ajustar se critério de descarte não estiver explícito
- [x] T011 [P] [US1] Verificar FR-005 em `linkedin-bot/agent-prompt.txt` — confirmar que o agente coleta `nome`, `cargo`, `empresa` (nullable), `perfil_url` e `evidencia_aderencia` para cada perfil
- [x] T012 [P] [US1] Verificar FR-006 em `linkedin-bot/agent-prompt.txt` — confirmar instrução de detectar conexão de 1º grau e atribuir `status: "ja_conectado"` sem ação de convite
- [x] T013 [US1] Verificar FR-012 em `linkedin-bot/agent-prompt.txt` — confirmar instrução explícita de ignorar `perfil_url` duplicada na mesma execução
- [x] T014 [US1] Verificar FR-013 em `linkedin-bot/agent-prompt.txt` — confirmar instrução de teto fixo: máx 15 perfis em modo normal, máx 1 em `modo_teste: true`
- [x] T015 [US1] Verificar FR-015 em `linkedin-bot/agent-prompt.txt` — confirmar instrução de registrar `status: "erro"` em falhas de perfil individual e continuar (não abortar)

**Checkpoint**: User Story 1 independentemente funcional — dry-run retorna JSON válido com perfis aderentes

---

## Phase 4: User Story 2 — Envio Controlado de Convites de Conexão (Priority: P2)

**Goal**: Quando `enviar_convites: true`, o bot envia convites sem nota e confirma o envio; quando `false`, faz dry-run sem nenhum clique de ação.

**Independent Test**: `modo_teste: true` + `enviar_convites: true` → exatamente 1 objeto com `status: "convite_enviado"` no array de resposta.

### Implementação para User Story 2

- [x] T016 [US2] Verificar FR-007 em `linkedin-bot/agent-prompt.txt` — confirmar fluxo: clicar "Conectar" → aguardar modal → clicar "Enviar sem nota"; garantir que nunca abre campo de mensagem
- [x] T017 [US2] Verificar FR-008 em `linkedin-bot/agent-prompt.txt` — confirmar instrução de capturar snapshot após envio e detectar toast "Convite enviado" ou botão "Pendente" antes de registrar `status: "convite_enviado"`
- [x] T018 [US2] Verificar dry-run em `linkedin-bot/agent-prompt.txt` — confirmar instrução explícita: quando `enviar_convites: false`, NENHUM clique em "Conectar", "Enviar", "Adicionar nota" ou "Enviar sem nota"; retornar `status: "pendente_aprovacao"`
- [ ] T019 [US2] Testar US2 manualmente com `ENVIAR_CONVITES=true linkedin-bot/scripts/test-n8n-flow.sh infoprodutores` em `modo_teste: true` e confirmar `status: "convite_enviado"` no output

**Checkpoint**: User Stories 1 e 2 independentemente funcionais

---

## Phase 5: User Story 3 — Controle de Segurança e Anti-Bloqueio (Priority: P3)

**Goal**: Bot detecta captcha/checkpoint e interrompe imediatamente, retornando array parcial com ObjetoInterrupcao.

**Independent Test**: Ao encontrar tela de segurança do LinkedIn, o array de resposta deve terminar com `{"interrupcao": "captcha_detectado"}`.

### Implementação para User Story 3

- [x] T020 [US3] Verificar FR-009 em `linkedin-bot/agent-prompt.txt` — confirmar que a instrução cobre captcha, checkpoint, bloqueio temporário, verificação e fluxo incomum de segurança; listar os sinais visuais que o agente deve reconhecer
- [x] T021 [US3] Verificar FR-010 em `linkedin-bot/agent-prompt.txt` — confirmar que após detecção a instrução é: PARAR imediatamente (sem tentar contornar) + append de `{"interrupcao": "captcha_detectado"}` no array + retornar
- [x] T022 [P] [US3] Verificar FR-011 em `linkedin-bot/agent-prompt.txt` — confirmar que esperas estão especificadas como 2–4 s em `modo_teste: true` e 6–10 s em `modo_teste: false`, aplicadas entre cada ação de navegação e clique
- [x] T023 [US3] Verificar nó Code em `linkedin-bot/n8n-workflow.json` — confirmar que `extractJsonArray` preserva o ObjetoInterrupcao ao final do array sem removê-lo ou falhar no parse (consolidado com T007)

**Checkpoint**: Proteção de conta ativa — execuções com captcha retornam parcial seguro

---

## Phase 6: User Story 4 — Execução via Webhook N8N (Priority: P4)

**Goal**: Operador dispara via POST HTTP, workflow orquestra e retorna JSON de resultados.

**Independent Test**: `curl -s -X POST http://localhost:5679/webhook/prospectar ...` retorna HTTP 200 com array JSON válido em qualquer cenário (normal, interrompido, vazio).

### Implementação para User Story 4

- [x] T024 [US4] Verificar nó Webhook em `linkedin-bot/n8n-workflow.json` — confirmar `httpMethod: POST`, `path: prospectar`, `responseMode: responseNode`
- [x] T025 [US4] Verificar nó Set em `linkedin-bot/n8n-workflow.json` — confirmar extração correta de todos os campos FR-001: `nicho`, `quantidade` (com teto 15), `modo_teste` (boolean, default false), `enviar_convites` (boolean, default false), e `tunnel_url` com default local após fix T004
- [x] T026 [US4] Verificar nó Respond to Webhook em `linkedin-bot/n8n-workflow.json` — confirmar que retorna `$json.leads` quando sucesso e `$json` (com campo `erro`) quando parse falhou; content-type JSON
- [ ] T027 [US4] Executar smoke test completo com `linkedin-bot/scripts/test-n8n-flow.sh infoprodutores` e verificar: HTTP 200, array JSON parseável, campos obrigatórios presentes em todos os objetos

**Checkpoint**: Fluxo completo end-to-end operacional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentação sincronizada, validação final do quickstart, checklist fechado.

- [x] T028 [P] Atualizar `linkedin-bot/README.md` — adicionar nota sobre parâmetro `tunnel_url` (opcional, default 172.18.0.1:3456) na seção "Integração com N8N"
- [x] T029 [P] Revisar `specs/001-linkedin-prospecting-bot/quickstart.md` — confirmar que todos os comandos funcionam conforme o estado atual dos scripts
- [ ] T030 Marcar todos os itens do checklist `specs/001-linkedin-prospecting-bot/checklists/requirements.md` após validação end-to-end confirmada

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — **bloqueia todas as user stories**
- **User Stories (Phases 3–6)**: Todas dependem de Phase 2; podem prosseguir em sequência de prioridade (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depende das user stories desejadas estarem completas

### User Story Dependencies

- **US1 (P1)**: Pode começar após Phase 2 — sem dependências de outras stories
- **US2 (P2)**: Depende de US1 funcional (envio de convite pressupõe coleta funcionando)
- **US3 (P3)**: Pode ser verificada em paralelo com US2 (arquivos diferentes)
- **US4 (P4)**: Depende de US1, US2, US3 para teste end-to-end completo

### Within Each User Story

- Verificações [P] podem rodar em paralelo (arquivos diferentes)
- Testes manuais dependem de implementação completa da story
- Correções em `agent-prompt.txt` são sequenciais (mesmo arquivo)

### Parallel Opportunities

- T001, T002, T003 → paralelo (Phase 1)
- T005, T006, T007 → paralelo entre si (após T004)
- T011, T012 → paralelo (US1, arquivos diferentes)
- T022, T023 → T022 paralelo; T023 sequencial
- T028, T029 → paralelo (Phase 7)

---

## Parallel Example: User Story 1

```bash
# Verificações paralelas dentro de US1:
Task T011: Verificar FR-005 em agent-prompt.txt (campos coletados)
Task T012: Verificar FR-006 em agent-prompt.txt (detecção 1º grau)
# (arquivos diferentes / seções diferentes do mesmo arquivo — revisar em paralelo)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRÍTICO — fix de tunnel_url)
3. Complete Phase 3: User Story 1
4. **PARAR e VALIDAR**: dry-run retornando JSON com perfis aderentes
5. Demo se pronto

### Incremental Delivery

1. Setup + Foundational → infraestrutura pronta
2. US1 → coleta e validação de perfis → demo (MVP!)
3. US2 → envio de convites → demo com convite real
4. US3 → proteção de conta → produção segura
5. US4 → webhook validado end-to-end → operação contínua

---

## Notes

- [P] = arquivos diferentes ou seções independentes, sem lock
- [Story] mapeia a tarefa à user story para rastreabilidade com a spec
- `agent-prompt.txt` é o arquivo central de US1–US3; edições são sequenciais
- `n8n-workflow.json` deve ser re-exportado do N8N após qualquer alteração manual
- Commit após cada fase ou grupo lógico de tasks
- Parar em qualquer checkpoint para validar a story independentemente
