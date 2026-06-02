# Research: Workflow de Follow-up Automático (Sergio — Novo Schema)

**Feature**: `001-followup-sergio-novo-schema`
**Date**: 2026-06-01

---

## Decision 1: Nó de banco de dados — Supabase node vs Postgres node

**Decision**: Usar exclusivamente o nó **Postgres** (executeQuery) para todas as operações de banco de dados.

**Rationale**: O novo schema requer SQL customizado (UPSERT com ON CONFLICT e WHERE clause de proteção, NULLIF para etapa_anterior nullable, EXTRACT com cast). O nó Supabase do n8n só suporta operações CRUD simples e não aceita SQL arbitrário. O nó Postgres (executeQuery) é necessário para as queries de threshold e UPSERT com proteção de regressão.

**Alternatives considered**: Supabase node para INSERTs simples — rejeitado porque tornaria o fluxo inconsistente (alguns nós Supabase, outros Postgres) sem ganho real.

---

## Decision 2: Tipo de dados de `dias_desde_criacao`

**Decision**: Usar `EXTRACT(DAY FROM NOW() - created_at)::integer AS dias_desde_criacao` no SELECT de threshold.

**Rationale**: No fluxo antigo, o resultado de `EXTRACT(DAY ...)` chegava como string no n8n, exigindo um Set node separado para castear para número. Com `::integer` no SQL, o nó Postgres retorna o valor já como número inteiro, eliminando o Set node intermediário.

**Alternatives considered**: Set node "transforma em inteiro" (padrão do fluxo antigo) — rejeitado para simplificar o grafo.

---

## Decision 3: Etapas como texto vs UUID

**Decision**: Usar **nomes de etapa como texto** (strings) diretamente — sem lookup de UUIDs na tabela `followup_etapas`.

**Rationale**: O novo schema usa `etapa_nome text` em `followup_status_atual` e `followup_historico`. Não há necessidade de buscar UUIDs. Isso elimina o Set node "Etapas no banco de dados" do fluxo antigo (que hardcodava 7 UUIDs).

**Alternatives considered**: Lookup dinâmico via `followup_etapas` — rejeitado por adicionar complexidade sem benefício; os nomes de etapa são estáveis e controlados.

---

## Decision 4: Origem de `etapa_anterior` no histórico

**Decision**: Buscar `followup_status_atual` do contato **antes** do Switch, armazenar `etapa_nome` em um Set node de variáveis, e usar esse valor como `etapa_anterior` em todos os INSERTs do histórico.

**Rationale**: O campo `etapa_anterior` em `followup_historico` exige saber a etapa atual antes de atualizar. O query de status_atual deve acontecer uma única vez no fluxo compartilhado (antes do Switch), não dentro de cada branch.

**Alternatives considered**: Buscar status_atual dentro de cada branch — rejeitado por duplicar 7 queries idênticas.

---

## Decision 5: Tratamento de `etapa_anterior` nulo (primeiro registro)

**Decision**: Usar `NULLIF('{{ expressão }}', '')` no SQL do INSERT para converter string vazia em NULL quando o contato ainda não tem `followup_status_atual`.

**Rationale**: Quando o contato não existe em `followup_status_atual`, o query retorna sem dados. Em n8n, isso produz uma string vazia ou null na expressão. `NULLIF(valor, '')` converte corretamente para NULL no Postgres sem erro.

**Alternatives considered**: Verificação no n8n com operador ternário — possível, mas menos legível e mais frágil com diferentes versões do n8n.

---

## Decision 6: Fluxo quando `contact_id` não existe em `contacts`

**Decision**: Usar `alwaysOutputData: true` no nó de busca do contato + IF node verificando se `id` está presente. Se não encontrado, encerrar em NoOp.

**Rationale**: Evita erro de execução se o contact_id for inválido. O workflow termina graciosamente sem ações colaterais.

---

## Decision 7: Ajuste de fuso horário em timestamps

**Decision**: Usar `NOW() - INTERVAL '3 hours'` em `ultima_acao_em` e `created_at` (consistente com o padrão do projeto antigo).

**Rationale**: O projeto já usa esse padrão para ajuste de fuso UTC→Brasília. Mantido por consistência com outros workflows do cliente.
