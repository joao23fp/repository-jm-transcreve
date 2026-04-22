# Implementation Plan: Módulo 004 — Biblioteca de Prompts de IA

**Branch**: `004-prompt-library-management` | **Date**: 2026-04-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-prompt-library-management/spec.md`

## Summary

Módulo que permite advogados gerenciar uma biblioteca de prompts de IA personalizados: visualizar templates de sistema imutáveis, duplicar e editar cópias pessoais, organizar em pastas com até 3 níveis, e aplicar prompts selecionados como instrução de sistema nas análises de IA do Módulo 002. Audit trail completo via `PromptApplication`.

## Technical Context

**Language/Version**: TypeScript (Next.js App Router)
**Primary Dependencies**: Prisma, Clerk, shadcn/ui, Tailwind CSS, Vitest, Sentry
**Storage**: PostgreSQL via Supabase (sem binários externos; apenas texto)
**Testing**: Vitest — imutabilidade de templates, unicidade de nomes, validações de campos
**Target Platform**: Web (Vercel), SSR padrão Next.js
**Performance Goals**: SC-001 (criar prompt ≤1 min); SC-004 (dropdown ≤2s com 50+ prompts)
**Constraints**: Máximo 1000 prompts customizados/usuário; 3 níveis de pasta; sem histórico de versões v1
**Scale/Scope**: Por usuário; seed de 5–10 templates de sistema no banco

## Constitution Check

| Gate | Princípio | Status |
|------|-----------|--------|
| I — Spec-First | Spec aprovada com 4 user stories + edge cases | ✅ PASS |
| II — Isolamento | `PromptTemplate.userId` enforçado; templates sistema (userId=null) só leitura | ✅ REQUER validação |
| II — LGPD | Prompts são dados pessoais; acesso logado (90 dias) | ✅ REQUER T024 |
| III — Traceabilidade IA | `PromptApplication` registra qual prompt foi usado em cada análise | ✅ PASS |
| III — Opt-in | Prompts só aplicados quando usuário seleciona explicitamente | ✅ PASS |
| IV — Modular | `app/biblioteca/` com `prompts.service.ts` separado | ✅ PASS |
| V — N/A | Módulo não envolve créditos/cobrança | — |

## Project Structure

### Documentation (this feature)

```text
specs/004-prompt-library-management/
├── plan.md              ← este arquivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-contracts.md
└── tasks.md
```

### Source Code

```text
app/
├── biblioteca/
│   ├── prompts.service.ts          # CRUD prompts + pastas + aplicação + validações
│   ├── page.tsx                    # Minha Biblioteca (Server Component)
│   └── components/
│       ├── PromptLibraryClient.tsx # Client Component raiz
│       ├── PromptList.tsx          # lista prompts com badge sistema/pessoal
│       ├── FolderTree.tsx          # hierarquia pastas (3 níveis)
│       ├── PromptModal.tsx         # modal visualizar/editar/criar
│       └── PromptSelector.tsx      # dropdown usado no Módulo 002
app/api/
├── prompts/
│   ├── route.ts                    # GET listar, POST criar
│   └── [id]/
│       ├── route.ts                # GET detalhe, PUT editar, DELETE
│       └── duplicate/route.ts      # POST duplicar template
├── folders/
│   ├── route.ts                    # GET listar, POST criar pasta
│   └── [id]/route.ts               # PUT renomear, DELETE (cascata)
├── prompt-applications/
│   └── route.ts                    # POST registrar aplicação (audit trail)
prisma/
└── seed-prompts.ts                 # 5-10 templates de sistema iniciais
__tests__/biblioteca/
└── prompts.service.test.ts
```

## Phases

### Phase 0: Research

1. **Seed de templates de sistema**: usar `prisma/seed.ts` (upsert para idempotência). Templates com `userId = null` e `type = 'Sistema'`. Verificar se seed está configurado no `package.json` (`prisma.seed`).
2. **Dropdown performance (SC-004)**: SSR com os templates de sistema (raramente mudam) + fetch client-side dos prompts pessoais do usuário. Sem paginação para ≤1000 prompts (limite enforçado).
3. **Integração Módulo 002**: `PromptSelector` exportado de `app/biblioteca/components/` e importado em `app/resultados/[jobId]/page.tsx`; `promptId` passado como prop para o chat/análise.
4. **Pastas recursivas**: `parent_folder_id` com `Prisma.findMany` recursivo (CTE via raw SQL) para listas hierárquicas. Para v1 com 3 níveis: query em 3 passes simples (suficiente, sem CTE).
5. **Limite 1000 prompts**: enforçado no `prompts.service.ts` (count + throw se ≥1000) antes de insert.

**Output**: [research.md](research.md)

### Phase 1: Design

1. **data-model.md**: PromptTemplate, PromptFolder, PromptApplication, enums TipoPrompt
2. **contracts/api-contracts.md**: CRUD `/api/prompts`, `/api/folders`, `/api/prompt-applications`
3. **quickstart.md**: 6 cenários de teste (visualizar, duplicar, editar, pastas, aplicar, edge cases)

### Phase 2: Tasks

Executar `/speckit.tasks` para gerar `tasks.md`.

## Implementation Strategy

### MVP (US1 + US2 + US4)

1. Seed templates de sistema + listagem na biblioteca (US1)
2. Duplicar + editar prompts pessoais (US2)
3. Aplicar prompt em análise via `PromptSelector` (US4)
4. Validação: Cenários 1–2–4 do quickstart

### Entrega Incremental

1. US1 (templates sistema + visualização + duplicar)
2. US2 (CRUD prompts pessoais + validações)
3. US4 (aplicação em análise + `PromptApplication` audit)
4. US3 (pastas temáticas + dropdown agrupado)

## Dependencies

- **Módulo 002**: `app/resultados/[jobId]/` — `PromptSelector` integrado na UI de análise para passar `promptId` ao chat
- **Prisma seed**: script para inserir templates de sistema no primeiro deploy
- **Clerk**: `userId` para isolar prompts pessoais; templates sistema têm `userId = null`
