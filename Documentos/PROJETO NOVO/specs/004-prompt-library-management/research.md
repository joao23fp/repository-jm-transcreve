# Research: Módulo 004 — Biblioteca de Prompts de IA

**Date**: 2026-04-22

---

## Decisão 1: Seed de Templates de Sistema

**Decision**: Usar `prisma/seed.ts` com `upsert` (idempotente). Templates com `userId = null` e `type = 'Sistema'`.

**Rationale**: O Prisma seed (`npx prisma db seed`) já é o padrão do projeto para dados iniciais. `upsert` garante idempotência — re-rodar o seed não duplica templates. Templates de sistema são identificados por `id` fixo (string literal, ex: `"sys_resumo_audiencia"`).

**Package.json config**:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

**Templates iniciais** (5):
1. "Resumo de Audiência" — extrai pontos principais
2. "Análise de Contradições" — identifica inconsistências no depoimento
3. "Extração de Fatos-Chave" — lista cronológica dos fatos
4. "Perfil de Falante" — resume comportamento e credibilidade
5. "Cronologia do Caso" — linha do tempo dos eventos mencionados

---

## Decisão 2: Performance do Dropdown (SC-004)

**Decision**: SSR para templates de sistema (cache 1h) + fetch client-side para prompts pessoais do usuário. Sem paginação para ≤1000 prompts.

**Rationale**: Templates de sistema raramente mudam → SSR com `cache: 'force-cache'` ou `revalidate: 3600`. Prompts pessoais variam por usuário → client fetch no mount do `PromptSelector`. Com ≤1000 prompts e respostas JSON simples (<50KB), a latência fica bem abaixo de 2s mesmo sem paginação.

---

## Decisão 3: Integração com Módulo 002

**Decision**: `PromptSelector` exportado de `app/biblioteca/components/PromptSelector.tsx`, importado em `app/resultados/[jobId]/page.tsx`. `promptId` passado como prop para o componente de chat/análise.

**Rationale**: Prop drilling simples para 1 nível de aninhamento. Evita over-engineering (Context, Zustand) para um dado simples. O `promptId` selecionado é enviado junto com cada mensagem do chat via body da requisição à IA.

---

## Decisão 4: Pastas Recursivas com 3 Níveis

**Decision**: `parent_folder_id` com 3 queries separadas (raiz → filhos → netos). Sem CTE/recursão SQL.

**Rationale**: Com máximo 3 níveis, 3 queries simples são suficientes e mais legíveis que uma CTE recursiva. Prisma não suporta CTEs nativamente; raw SQL seria necessário para recursão — complexidade desnecessária para v1.

**Alternatives considered**:
- Path materializado (`/pasta/subpasta/subsubpasta`): mais simples para queries, mas difícil de renomear/mover
- CTE recursiva via `$queryRaw`: funciona, mas over-engineering para 3 níveis

---

## Decisão 5: Limite de 1000 Prompts

**Decision**: Enforçado no `prompts.service.ts` via count + throw antes de insert.

**Rationale**: Constraint no banco seria mais seguro em concorrência, mas para esta escala (usuários individuais) a verificação no service é suficiente. Se dois inserts simultâneos ultrapassarem o limite, o segundo falhará graciosamente com mensagem clara ao usuário.

```typescript
const count = await prisma.promptTemplate.count({ where: { userId, type: 'Usuario' } })
if (count >= 1000) throw new Error('Limite de 1000 prompts atingido')
```
