# Quickstart & Test Scenarios: Módulo 004 — Biblioteca de Prompts

**Date**: 2026-04-22

---

## Setup Local

```bash
# 1. Rodar migration
npx prisma migrate dev --name add-prompt-library-module

# 2. Semear templates de sistema
npx ts-node prisma/seed-prompts.ts

# 3. Subir dev server
npm run dev
```

---

## Cenário 1: Visualizar Templates de Sistema

1. Acessar `http://localhost:3000/biblioteca`
2. **Esperado**: seção "Modelos do Sistema" exibe 5 templates bloqueados
3. Clicar "Visualizar" em "Resumo de Audiência"
4. **Esperado**: modal exibe nome, descrição e body do prompt — sem botão Editar
5. Tentar clicar em "Editar" (se aparecer)
6. **Esperado**: ação bloqueada; mensagem "Templates de sistema não podem ser editados"

---

## Cenário 2: Duplicar e Editar Template

1. Clicar "Duplicar" em "Resumo de Audiência"
2. **Esperado**: novo prompt criado: "[Meu] Resumo de Audiência" em biblioteca pessoal
3. Clicar "Editar" no prompt duplicado
4. Alterar nome para "Resumo de Audiência Criminal" e adicionar instrução ao body
5. Clicar "Salvar"
6. **Esperado**: alterações persistidas; prompt aparece na biblioteca pessoal

---

## Cenário 3: Criar Prompt do Zero com Validações

1. Clicar "Novo Prompt"
2. Deixar o campo "Body" vazio e clicar "Salvar"
3. **Esperado**: botão Salvar desabilitado (validação em tempo real)
4. Preencher `name = "Análise Criminal"`, `body = "Analise..."`, clicar Salvar
5. Clicar "Novo Prompt" novamente e tentar criar com mesmo nome na mesma pasta
6. **Esperado**: erro "Já existe prompt com este nome nesta pasta"

---

## Cenário 4: Organização por Pastas

1. Clicar "Criar Nova Pasta" → nomear "Casos Criminais"
2. **Esperado**: pasta exibida na hierarquia
3. Criar subpasta dentro de "Casos Criminais" → "Réus Primários"
4. **Esperado**: hierarquia exibida com 2 níveis
5. Criar novo prompt diretamente em "Réus Primários"
6. **Esperado**: prompt vinculado à subpasta; aparece agrupado no dropdown

---

## Cenário 5: Aplicar Prompt em Análise

1. Acessar `http://localhost:3000/resultados/{jobId}` (página de análise do Módulo 002)
2. Abrir dropdown "Selecione Contexto"
3. **Esperado**: lista mostra templates sistema + prompts pessoais agrupados por pasta
4. Selecionar "Resumo de Audiência Criminal" (duplicado editado)
5. Enviar pergunta ou clicar "Analisar"
6. **Esperado**: IA responde com tom e foco definidos pelo prompt customizado
7. **Esperado**: `PromptApplication` criada no banco (audit trail)

---

## Cenário 6: Edge Cases

**Exclusão de pasta com conteúdo**:
1. Criar pasta com 2 prompts dentro
2. Clicar "Excluir Pasta"
3. **Esperado**: modal confirma "Pasta contém 2 prompts. Ao excluir, todos serão removidos. Continuar?"
4. Confirmar
5. **Esperado**: pasta e prompts deletados (soft delete)

**Prompt vazio**:
- Tentar criar prompt com body vazio → botão Salvar desabilitado

---

## Validação de Critérios de Aceite

| Critério | Como validar |
|----------|-------------|
| SC-001: Criar prompt ≤1 min | Cronometrar Cenário 2 do início ao fim |
| SC-002: Zero data loss | Criar 10 prompts, reiniciar server, verificar todos presentes |
| SC-003: Templates imutáveis | Cenário 1: tentativa de edição → bloqueada |
| SC-004: Dropdown ≤2s com 50+ | Seed 60 prompts, medir abertura do dropdown |
| SC-005: Erro IA <1% | Monitorar Sentry em produção |
