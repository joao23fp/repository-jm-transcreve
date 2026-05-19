# Implementation Plan: LinkedIn Prospecting Bot

**Branch**: `001-linkedin-prospecting-bot` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification de prospecção automatizada no LinkedIn via N8N + Playwright MCP

---

## Summary

Bot de prospecção que recebe parâmetros via webhook N8N (nicho, quantidade, flags de controle), usa um AI Agent Claude para navegar no LinkedIn via Playwright MCP, valida aderência de perfis ao nicho e retorna um array JSON estruturado. Toda a infraestrutura roda localmente em Linux.

---

## Technical Context

**Language/Version**: JavaScript / Node.js 18+ (N8N runtime); Bash (scripts de infraestrutura)
**Primary Dependencies**:
- N8N (Docker) — orquestração de workflow; nós usados: Webhook, Set, AI Agent, MCP Client Tool, Code, Respond to Webhook
- @n8n/n8n-nodes-langchain.lmChatAnthropic — modelo Claude (Anthropic)
- @playwright/mcp — servidor MCP para controle do browser via CDP
- Chromium (Playwright) — browser com perfil persistente + Playwright Extension
- CDP (Chrome DevTools Protocol) — ponte entre Chromium e Playwright MCP (porta 9222)

**Storage**: Nenhum banco de dados. Logs de execução em arquivos (`logs/mcp-YYYYMMDD.log`). Dados de perfil apenas em memória (retornados via webhook response).

**Testing**: Manual via `scripts/test-n8n-flow.sh` e `curl`. Sem suite automatizada.

**Target Platform**: Linux local (Zorin OS). Não containerizado além do N8N Docker.

**Project Type**: Automation bot / local tooling

**Performance Goals**:
- Processar até 15 perfis em < 5 minutos (modo normal)
- Processar 1 perfil em < 30 segundos (modo teste)
- Detectar e interromper em < 5 s ao encontrar captcha

**Constraints**:
- Limite hardcoded: máx 15 perfis/execução
- Sem burla de captcha, checkpoint ou bloqueio — interrupção imediata
- Sessão LinkedIn deve estar autenticada antes da execução
- Output exclusivamente JSON válido (sem Markdown)

**Scale/Scope**: Single-user, single-instance. Uma execução por vez.

---

## Constitution Check

*GATE: Verificado antes da Phase 0. Re-verificado após Phase 1.*

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Segurança da Conta — interrupção em captcha/checkpoint | ✅ | FR-009, FR-010 cobrem isso; fluxo do agente inclui detecção |
| I. Segurança da Conta — esperas obrigatórias entre ações | ✅ | FR-011 define 2–4 s (teste) e 6–10 s (normal) |
| I. Segurança da Conta — limite fixo 15/1 perfis | ✅ | FR-013 e parâmetro `quantidade` na entrada |
| I. Segurança da Conta — sem login automático | ✅ | FR-016 + Assumption documentada na spec |
| II. Saída Determinística — JSON válido sempre | ✅ | FR-014; nó Code no workflow faz o parse |
| II. Saída Determinística — campos obrigatórios presentes | ✅ | Schema definido no agent-prompt e no data-model |
| II. Saída Determinística — zero duplicatas por URL | ✅ | FR-012 |
| III. Operação Auditável — logs por data | ✅ | Scripts gravam em `logs/mcp-YYYYMMDD.log` |
| III. Operação Auditável — erros individuais não abortam | ✅ | FR-015 |
| IV. Infraestrutura Local — zero dependência externa | ✅ | N8N Docker + Playwright MCP local + Chromium local |
| IV. Infraestrutura Local — sem persistência de dados | ✅ | Nenhum banco; output apenas na response do webhook |

**Resultado**: ✅ Sem violações. Pode prosseguir para Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-linkedin-prospecting-bot/
├── plan.md              ← este arquivo
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1
├── quickstart.md        ← Phase 1
├── contracts/
│   └── webhook.md       ← Phase 1
├── checklists/
│   └── requirements.md  ← gerado pelo /speckit-specify
└── tasks.md             ← gerado pelo /speckit-tasks
```

### Source Code (repository root)

```text
linkedin-bot/
├── agent-prompt.txt              ← prompt do AI Agent (instrução do agente)
├── n8n-workflow.json             ← workflow N8N exportado
├── scripts/
│   ├── open-extension-chrome.sh  ← abre Chromium com extensão + CDP
│   ├── start-extension-mcp.sh    ← sobe servidor Playwright MCP (modo extensão)
│   ├── start-mcp.sh              ← sobe servidor Playwright MCP (modo headless)
│   ├── setup-login.sh            ← login manual inicial no LinkedIn
│   ├── check-login.sh            ← verifica cookie li_at no perfil
│   ├── test-n8n-flow.sh          ← dispara webhook de teste
│   └── linkedin-agent.sh         ← atalho para execução do agente
├── profiles/
│   └── linkedin-extension-native/ ← perfil Chromium com sessão LinkedIn
└── logs/
    └── mcp-YYYYMMDD.log          ← logs do servidor MCP
```

**Structure Decision**: Projeto de tooling local de arquivo único (sem monorepo, sem frontend separado). Todos os componentes de automação ficam em `linkedin-bot/`. Specs ficam em `specs/`.

---

## Complexity Tracking

> Sem violações de constituição. Seção não aplicável.
