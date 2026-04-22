# Tasks: Módulo 004 — Biblioteca de Prompts de IA

**Feature**: `004-prompt-library-management`
**Input**: Design documents from `/specs/004-prompt-library-management/`
**Date**: 2026-04-22

---

## Phase 1: Setup

**Propósito**: Schema do banco + seed de templates de sistema.

- [ ] T001 Adicionar enum `TipoPrompt` (Sistema, Usuario) em `lib/enums.ts`
- [ ] T002 Adicionar modelos `PromptTemplate`, `PromptFolder`, `PromptApplication` ao `prisma/schema.prisma` conforme `specs/004-prompt-library-management/data-model.md`
- [ ] T003 Gerar e aplicar migration: `npx prisma migrate dev --name add-prompt-library-module` em `prisma/migrations/`
- [ ] T004 Criar `prisma/seed-prompts.ts` com upsert de 5 templates de sistema (ids fixos: `sys_resumo_audiencia`, `sys_analise_contradicoes`, `sys_fatos_chave`, `sys_perfil_falante`, `sys_cronologia`); adicionar script `"prisma:seed-prompts": "ts-node prisma/seed-prompts.ts"` ao `package.json`; executar seed

**Checkpoint**: Migration aplicada + 5 templates de sistema no banco → `npx prisma studio` confirma

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Propósito**: Camada de serviço que todas as user stories dependem.

- [ ] T005 Criar `app/biblioteca/prompts.service.ts` com funções:
  - `listPrompts(userId, opts?)` — retorna templates Sistema (userId=null) + prompts Usuario do userId; suporta filtro por `folderId`
  - `getPrompt(userId, promptId)` — valida acesso (próprio userId ou Sistema)
  - `createPrompt(userId, data)` — valida campos, verifica unicidade de nome na pasta, verifica limite 1000, insert
  - `updatePrompt(userId, promptId, data)` — bloqueia edição de tipo=Sistema; valida campos
  - `deletePrompt(userId, promptId)` — soft delete (isDeleted=true); bloqueia tipo=Sistema
  - `duplicatePrompt(userId, promptId, folderId?)` — cria cópia com prefixo "[Meu] ", tipo=Usuario
  - `createFolder(userId, name, parentFolderId?)` — valida máx 3 níveis
  - `listFolders(userId)` — retorna hierarquia completa (3 queries em cascata)
  - `deleteFolder(userId, folderId)` — soft delete em cascata dos prompts internos
  - `recordApplication(userId, fileId, promptId)` — cria PromptApplication (audit)

**Checkpoint**: `prompts.service.ts` compilando sem erros → fases de US podem começar

---

## Phase 3: User Story 1 — Acesso a Modelos Padrão (Priority: P1) 🎯 MVP

**Goal**: Usuária acessa "Minha Biblioteca" e vê templates de sistema + pode duplicar sem editar originais.

**Teste Independente**: Acessar /biblioteca → templates listados → visualizar → tentar editar → bloqueado → duplicar → cópia criada.

- [ ] T006 [P] [US1] Criar `app/api/prompts/route.ts`: `GET` autenticado — chama `listPrompts(userId)`; retorna lista sem `body` (preservar privacidade do body em listagem); suporta query params `type` e `folderId`
- [ ] T007 [P] [US1] Criar `app/api/prompts/[id]/route.ts`: `GET` — retorna detalhes completos incluindo `body`; `PUT` — chama `updatePrompt()` (retorna 403 para Sistema); `DELETE` — chama `deletePrompt()` (retorna 403 para Sistema)
- [ ] T008 [P] [US1] Criar `app/api/prompts/[id]/duplicate/route.ts`: `POST` — chama `duplicatePrompt()`; retorna 201 com novo prompt
- [ ] T009 [P] [US1] Criar `app/biblioteca/components/PromptList.tsx`: lista de prompts com badge "Sistema" (cadeado) ou "Pessoal"; botão "Visualizar" abre `PromptModal`; botão "Duplicar" para ambos tipos; botão "Editar"/"Excluir" apenas para tipo=Usuario
- [ ] T010 [P] [US1] Criar `app/biblioteca/components/PromptModal.tsx`: Dialog shadcn/ui; modo visualização (campos readonly) para tipo=Sistema; modo edição (campos editáveis) para tipo=Usuario; validação em tempo real: botão Salvar desabilitado se body vazio; `onSave` chama `PUT /api/prompts/[id]`
- [ ] T011 [US1] Criar `app/biblioteca/page.tsx` (Server Component): busca templates sistema + prompts pessoais via `prompts.service.listPrompts()`; passa para `PromptLibraryClient`
- [ ] T012 [US1] Criar `app/biblioteca/components/PromptLibraryClient.tsx`: Client Component raiz; gerencia estado de modal aberto, pasta selecionada, modo edição; renderiza `FolderTree`, `PromptList`, `PromptModal`

**Checkpoint**: US1 testável via Cenários 1–2 do quickstart.md

---

## Phase 4: User Story 2 — Criação & Edição de Prompts Pessoais (Priority: P1)

**Goal**: Usuária cria/edita/deleta prompts pessoais com validações de campos.

**Teste Independente**: Criar prompt → aparece na lista → editar → salvar → validações de nome duplicado e body vazio.

- [ ] T013 [P] [US2] Criar `app/api/prompts/route.ts` `POST` handler: valida campos (name ≤255, body obrigatório ≤2000, description opcional ≤500); chama `createPrompt()`; retorna 201, 409 (nome duplicado) ou 429 (limite 1000)
- [ ] T014 [US2] Adicionar botão "Novo Prompt" ao `PromptLibraryClient.tsx`: abre `PromptModal` em modo criação (campos vazios, sem id); `onSave` chama `POST /api/prompts`; atualiza lista localmente

**Checkpoint**: US2 testável via Cenário 3 do quickstart.md

---

## Phase 5: User Story 3 — Organização por Pastas (Priority: P2)

**Goal**: Usuária cria pastas (até 3 níveis) e organiza prompts dentro delas.

**Teste Independente**: Criar pasta raiz → criar subpasta → criar prompt na subpasta → dropdown mostra agrupado.

- [ ] T015 [P] [US3] Criar `app/api/folders/route.ts`: `GET` — chama `listFolders(userId)` retornando árvore hierárquica; `POST` — chama `createFolder()` com validação de 3 níveis máx
- [ ] T016 [P] [US3] Criar `app/api/folders/[id]/route.ts`: `PUT` — renomear pasta; `DELETE` — `deleteFolder()` com cascata (retorna `{ ok, deletedPrompts }`)
- [ ] T017 [US3] Criar `app/biblioteca/components/FolderTree.tsx`: árvore de pastas clicável; botão "+" para criar subpasta; botão "..." para renomear/excluir; pasta selecionada filtra `PromptList`; confirmação de exclusão exibe contagem de prompts internos

**Checkpoint**: US3 testável via Cenário 4 do quickstart.md

---

## Phase 6: User Story 4 — Aplicação de Prompts em Análise (Priority: P1)

**Goal**: Dropdown de seleção de prompt integrado na tela de análise do Módulo 002; audit trail via PromptApplication.

**Teste Independente**: Acessar análise → abrir dropdown → selecionar prompt → IA usa o prompt → PromptApplication criada no banco.

- [ ] T018 [P] [US4] Criar `app/api/prompt-applications/route.ts`: `POST` — valida `fileId` e `promptId`; chama `recordApplication()`; retorna 201
- [ ] T019 [P] [US4] Criar `app/biblioteca/components/PromptSelector.tsx`: Select shadcn/ui que carrega `GET /api/prompts` no mount; agrupa por pasta; exibe templates Sistema no topo; `onChange` salva seleção em state e chama `POST /api/prompt-applications`
- [ ] T020 [US4] Integrar `PromptSelector` na página `app/resultados/[jobId]/page.tsx` (ou componente de chat do Módulo 002): `promptId` selecionado é incluído no body de cada requisição à IA para ser usado como system instruction

**Checkpoint**: US4 testável via Cenário 5 do quickstart.md

---

## Phase 7: Polish & Preocupações Transversais

- [ ] T021 [P] Aplicar `logLgpdAccess` em `app/api/prompts/route.ts` e `app/api/prompts/[id]/route.ts` — registrar ACCESS e UPDATE (Constitution Princípio II — dados pessoais/profissionais)
- [ ] T022 [P] Adicionar link "Minha Biblioteca" na navegação em `app/uploads/page.tsx` (ou layout compartilhado)
- [ ] T023 [P] Escrever testes Vitest em `__tests__/biblioteca/prompts.service.test.ts`: (1) templates Sistema não editáveis; (2) unicidade de nome na mesma pasta; (3) limite 1000 prompts lança erro; (4) duplicar cria cópia com prefixo "[Meu] "; (5) soft delete preserva PromptApplication histórico
- [ ] T024 Validar Cenários 1–6 do `specs/004-prompt-library-management/quickstart.md` em ambiente local

---

## Dependências & Ordem de Execução

```
Setup (T001–T004) → Foundational (T005) → US1 → US2 → US4 → US3 → Polish

US1: T006, T007, T008, T009, T010 em paralelo → T011 → T012
US2: T013, T014 em paralelo
US3: T015, T016 em paralelo → T017
US4: T018, T019 em paralelo → T020
```

---

## Resumo

| Fase | Tarefas | User Story | Prioridade |
|------|---------|------------|------------|
| Phase 1: Setup | T001–T004 | — | Fundação |
| Phase 2: Foundational | T005 | — | Bloqueante |
| Phase 3: US1 | T006–T012 | Modelos Padrão | P1 🎯 MVP |
| Phase 4: US2 | T013–T014 | Criação & Edição | P1 |
| Phase 5: US3 | T015–T017 | Pastas Temáticas | P2 |
| Phase 6: US4 | T018–T020 | Aplicação em Análise | P1 |
| Phase 7: Polish | T021–T024 | — | Qualidade/LGPD |
| **Total** | **24 tarefas** | **4 user stories** | |
