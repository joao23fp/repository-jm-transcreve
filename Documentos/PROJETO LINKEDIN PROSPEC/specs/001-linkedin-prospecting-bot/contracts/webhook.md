# Contract: Webhook de Prospecção

**Versão**: 1.0
**Data**: 2026-05-19

---

## Endpoint

### Produção (workflow Published)

```
POST http://localhost:5679/webhook/prospectar
```

### Teste (workflow aberto no editor N8N)

```
POST http://localhost:5679/webhook-test/prospectar
```

---

## Request

**Content-Type**: `application/json`

### Schema

```json
{
  "nicho": "string (obrigatório)",
  "quantidade": "integer (obrigatório, 1–15)",
  "enviar_convites": "boolean (opcional, default: false)",
  "modo_teste": "boolean (opcional, default: false)",
  "tunnel_url": "string (opcional, default: 'http://172.18.0.1:3456')"
}
```

> **`tunnel_url`**: URL base do servidor Playwright MCP. Usar quando o MCP não estiver no gateway Docker padrão (ex: ngrok tunnel, host alternativo). O default `http://172.18.0.1:3456` funciona para setup local padrão.

### Exemplos

**Dry-run — coletar 5 perfis sem enviar convites:**
```json
{
  "nicho": "infoprodutores",
  "quantidade": 5,
  "modo_teste": false,
  "enviar_convites": false
}
```

**Modo teste — 1 perfil, 1 convite:**
```json
{
  "nicho": "coaches de carreira",
  "quantidade": 1,
  "modo_teste": true,
  "enviar_convites": true
}
```

**Produção — 10 perfis com envio de convites:**
```json
{
  "nicho": "consultores de RH",
  "quantidade": 10,
  "modo_teste": false,
  "enviar_convites": true
}
```

---

## Response

**HTTP Status**: `200 OK` (sempre, incluindo interrupções)
**Content-Type**: `application/json`

### Schema — Execução Normal

```json
[
  {
    "nome": "string",
    "cargo": "string",
    "empresa": "string | null",
    "perfil_url": "string",
    "status": "pendente_aprovacao | convite_enviado | ja_conectado | erro",
    "mensagem_enviada": "string | null",
    "criterio": "string",
    "evidencia_aderencia": "string"
  }
]
```

### Schema — Interrupção por Segurança

Array parcial com objetos de perfil processados + objeto de interrupção ao final:

```json
[
  {
    "nome": "João Silva",
    "cargo": "Criador de Conteúdo",
    "empresa": "Solo",
    "perfil_url": "https://www.linkedin.com/in/joao-silva/",
    "status": "pendente_aprovacao",
    "mensagem_enviada": null,
    "criterio": "infoprodutores",
    "evidencia_aderencia": "Headline menciona 'infoprodutor' e 'lançamento digital'"
  },
  {
    "interrupcao": "captcha_detectado"
  }
]
```

### Schema — Sem Resultados

```json
[]
```

---

## Contratos de Comportamento

| Condição | Comportamento Garantido |
|----------|------------------------|
| `modo_teste: true` | Máx 1 perfil processado |
| `enviar_convites: false` | Zero cliques em botões de ação de conexão |
| Captcha detectado | Interrupção imediata + retorno parcial |
| Perfil já conectado | `status: "ja_conectado"`, sem ação |
| Erro em perfil individual | `status: "erro"`, execução continua |
| Output | JSON puro, sem Markdown, sem texto adicional |

---

## Disparo via CLI

```bash
# Produção
curl -s -X POST http://localhost:5679/webhook/prospectar \
  -H "Content-Type: application/json" \
  -d '{"nicho":"infoprodutores","quantidade":5,"modo_teste":false,"enviar_convites":false}'

# Teste rápido com script
cd "/home/jm/Documentos/PROJETO LINKEDIN PROSPEC/linkedin-bot"
./scripts/test-n8n-flow.sh infoprodutores

# Teste com envio de convite
ENVIAR_CONVITES=true ./scripts/test-n8n-flow.sh infoprodutores
```
