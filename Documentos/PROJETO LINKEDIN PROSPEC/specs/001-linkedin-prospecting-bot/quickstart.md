# Quickstart: LinkedIn Prospecting Bot

**Data**: 2026-05-19

---

## Pré-requisitos

- Linux (Zorin OS ou similar)
- Node.js 18+
- Docker (para N8N)
- N8N rodando em `http://localhost:5679`
- Playwright instalado: `npx playwright install chromium`

---

## Setup Inicial (uma única vez)

### 1. Login no LinkedIn com perfil persistente

```bash
cd "/home/jm/Documentos/PROJETO LINKEDIN PROSPEC/linkedin-bot"
./scripts/setup-login.sh
```

Faça o login manualmente na janela que abrir. Feche o browser ao terminar.

### 2. Validar sessão

```bash
./scripts/check-login.sh
```

Deve encontrar o cookie `li_at`. Se não encontrar, repita o passo 1.

### 3. Importar workflow no N8N

Acesse `http://localhost:5679`, importe `n8n-workflow.json` e **publique** o workflow.

---

## Uso Diário

### Passo 1 — Abrir Chromium com a extensão

```bash
cd "/home/jm/Documentos/PROJETO LINKEDIN PROSPEC/linkedin-bot"
./scripts/open-extension-chrome.sh https://www.linkedin.com/feed/
```

Clique no ícone da Playwright Extension na barra de ferramentas e **copie o token**.

### Passo 2 — Subir o servidor MCP

```bash
PLAYWRIGHT_MCP_EXTENSION_TOKEN=SEU_TOKEN ./scripts/start-extension-mcp.sh
```

O servidor sobe em `http://0.0.0.0:3456/mcp`. O N8N acessa via `http://172.18.0.1:3456/sse`.

### Passo 3 — Disparar o bot

**Dry-run (sem envio de convites):**
```bash
./scripts/test-n8n-flow.sh infoprodutores
```

**Com envio de 1 convite (modo teste):**
```bash
ENVIAR_CONVITES=true ./scripts/test-n8n-flow.sh infoprodutores
```

**Produção (workflow Published):**
```bash
curl -s -X POST http://localhost:5679/webhook/prospectar \
  -H "Content-Type: application/json" \
  -d '{"nicho":"consultores de RH","quantidade":10,"modo_teste":false,"enviar_convites":false}'
```

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| MCP não conecta | Chromium não está aberto com CDP | Rode `open-extension-chrome.sh` primeiro |
| Token inválido | Token expirou ou extensão foi reiniciada | Copie novo token da extensão |
| Cookie `li_at` ausente | Sessão expirou | Rode `setup-login.sh` novamente |
| N8N não consegue chamar MCP | Gateway Docker errado | Verifique se `172.18.0.1:3456` está acessível do container |
| Output não é JSON | Agente retornou texto extra | Revise `agent-prompt.txt` — seção SAÍDA FINAL |
| Execução interrompida | Captcha detectado | Aguarde alguns minutos e tente com menos perfis |

---

## Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `linkedin-bot/agent-prompt.txt` | Instrução do AI Agent |
| `linkedin-bot/n8n-workflow.json` | Workflow N8N exportado |
| `linkedin-bot/scripts/` | Scripts de infraestrutura |
| `linkedin-bot/profiles/linkedin-extension-native/` | Perfil Chrome com sessão LinkedIn |
| `linkedin-bot/logs/` | Logs do servidor MCP |
| `specs/001-linkedin-prospecting-bot/` | Documentação completa da feature |
