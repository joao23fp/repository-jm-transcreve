# ODARA RIO — Integração Belle × Clint via n8n

## Estrutura dos Arquivos

```
odara-n8n/
├── database/
│   └── schema.sql              ← Rodar primeiro no PostgreSQL
├── workflows/
│   ├── 01-sync-agendamentos.json
│   ├── 02a-disparar-confirmacao-24h.json
│   ├── 02b-webhook-resposta-confirmacao.json
│   ├── 02c-verificar-sem-resposta.json
│   ├── 03-lembrete-dia.json
│   ├── 04a-pos-atendimento.json
│   ├── 04b-followup-24h.json
│   ├── 05-cadastro-lead.json
│   ├── 06-conversao-venda.json
│   ├── 07a-automacao-renovacao.json
│   ├── 07b-automacao-upsell.json
│   ├── 07c-automacao-nps.json
│   ├── 07d-automacao-aniversario.json
│   ├── 07e-automacao-nurturing.json
│   ├── 07f-alerta-sem-engajamento.json
│   └── 07g-migrar-pos-venda.json
├── VARIAVEIS.md                ← 4 variáveis a definir com a equipe
└── README.md
```

---

## Setup — Passo a Passo

### 1. Banco de Dados (PostgreSQL)

Recomendado: **Supabase** (free tier suficiente para começar).

1. Crie um projeto em supabase.com
2. Vá em **SQL Editor**
3. Cole e execute o conteúdo de `database/schema.sql`
4. Anote a **connection string** (Settings → Database)

### 2. Credenciais no n8n

Antes de importar os workflows, crie estas credenciais em **Settings → Credentials**:

#### PostgreSQL Odara
- Type: `Postgres`
- Host, Port, Database, User, Password: dados do Supabase
- Nome da credential: **PostgreSQL Odara**
- Após criar, **copie o ID** e substitua `POSTGRES_CREDENTIAL_ID` em todos os workflows

#### (Opcional) Belle API — como Header Auth
- Type: `HTTP Header Auth`
- Name: `Authorization`
- Value: `669ebde7afafcd939eff35cc43a594cb`

### 3. Importar Workflows

No n8n: **Workflows → Import from file** → selecione cada `.json`

**Ordem de importação sugerida:**
1. 01 (sync base)
2. 05 (entrada de leads)
3. 06 (conversão)
4. 02a → 02b → 02c (confirmações)
5. 03, 04a, 04b (comunicações)
6. 07a até 07g (automações)

### 4. Configurar Variáveis

Veja `VARIAVEIS.md` e defina os 4 valores pendentes.
Após definir, abra cada workflow e atualize o nó `Config: NOME_VARIAVEL`.

### 5. Configurar Webhooks no Clint

Os workflows que precisam de webhook do Clint:

| Workflow | URL do Webhook n8n |
|---|---|
| 05-cadastro-lead | `SEU_N8N/webhook/novo-lead` |
| 06-conversao-venda | `SEU_N8N/webhook/venda-convertida` |
| 02b-webhook-resposta | `SEU_N8N/webhook/confirmacao-resposta` |

> **SEU_N8N** = URL base do seu n8n (ex: `https://odara.app.n8n.cloud` ou IP:5678)

### 6. Substituir placeholders do Clint

Em todos os nós `🔵 CLINT: ...`, substitua:
- `SEU_DOMINIO_CLINT` → domínio real da API do Clint
- `SEU_TOKEN_CLINT` → token de acesso da API Clint

---

## Onde Testar Cada Workflow

| Workflow | Como testar |
|---|---|
| 01-sync-agendamentos | Executar manualmente → verificar tabela `agendamentos` no DB |
| 02a-confirmacao | Criar agendamento para daqui 24h no DB e executar manualmente |
| 02b-resposta | Enviar POST para `webhook/confirmacao-resposta` com `{"agendamento_id": X, "resposta": "confirmar"}` |
| 02c-sem-resposta | Criar agendamento com `confirmacao_enviada=true` sem resposta e horário próximo |
| 05-cadastro-lead | Enviar POST para `webhook/novo-lead` com `{"clint_id":"1","nome":"Teste","telefone":"49999999999"}` |
| 06-conversao | Enviar POST para `webhook/venda-convertida` com dados completos |

---

## Campos Belle API — Referência Rápida

### Agendamento (response)
```json
{
  "codConsulta": 14351765,
  "dtAgenda": "30/06/2022",
  "hrConsulta": "08:30",
  "status": "Marcado",
  "tipo": "Serviço",
  "cliente": { "cod": "123", "nome": "...", "celular": "..." },
  "prof": { "cod": "1", "nome": "..." },
  "servicos": [{ "cod": "2", "nome": "Peeling" }]
}
```

### Status possíveis de agendamento
- `Marcado` → em aberto
- `Atendido` → finalizado
- `Cancelado` → cancelado

### Criar lead no Belle
`POST /cliente/gravar-lead` — CPF não obrigatório

### Criar venda no Belle
1. `POST /venda_planos/inserir` → retorna `codOrcamento`
2. `POST /venda_planos/aprovar` → confirma com parcelas

---

## Notas Importantes

- **Belle não tem webhooks** — todos os dados são via polling (workflow 01 roda a cada 5 min)
- **sessoes_realizadas** no DB precisa ser atualizado pelo workflow 01 (contar agendamentos `Atendido` por cliente/protocolo)
- Os textos de **pós-atendimento e check-in** (workflows 04a e 04b) precisam ser criados pela equipe da clínica — ver checklist no briefing
- Para **relatórios**, os dados estão todos no banco — conectar uma ferramenta de BI (Metabase, Grafana, ou dashboards do próprio Clint) à tabela do Supabase
