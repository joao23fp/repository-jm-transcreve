# Data Model: Gestora de Qualificação Genérica

**Feature**: 002-gestora-followup-generica  
**Date**: 2026-06-02

---

## Entidades

### Conversa (Input)

Payload entregue à gestora pelo n8n.

| Campo | Tipo | Descrição |
|---|---|---|
| `messages` | string (JSON serializado) | Array de objetos `{type, content}` representando o histórico completo |

**Formato do array deserializado**:

```json
[
  {
    "type": "human",
    "content": "-----\ndata_de_hoje: |\n- Hoje é [DIA], [DATA]\n...\nNome do usuário: [NOME]\nEmail do usuário: [EMAIL]\nlead_id do usuário: [UUID]\n-----\nmensagem do usuário:[MENSAGEM_REAL]"
  },
  {
    "type": "ai",
    "content": "[RESPOSTA DA ANNA]"
  }
]
```

---

### Mensagem

| Campo | Tipo | Valores possíveis | Descrição |
|---|---|---|---|
| `type` | string | `"human"` \| `"ai"` | Origem da mensagem |
| `content` | string | — | Texto completo. Para `human`: inclui bloco de metadados prefixado pelo n8n + fala real do lead |

**Parsing do content humano**:
- Bloco antes de `mensagem do usuário:` → metadados (data, nome, lead_id)
- Conteúdo após `mensagem do usuário:` → fala real do lead

---

### Metadados do Lead (extraídos do content humano)

| Campo | Fonte | Uso pela gestora |
|---|---|---|
| `data_de_hoje` | Bloco de metadados | Referência temporal para cálculo de prazo |
| `Nome do usuário` | Bloco de metadados | Personalizar `MENSAGEM SUGERIDA` |
| `Email do usuário` | Bloco de metadados | Ignorado (dado operacional) |
| `lead_id do usuário` | Bloco de metadados | Ignorado (dado operacional) |

---

### Status do Lead (Output — Enum)

| Valor | Significado |
|---|---|
| `EM QUALIFICAÇÃO` | Etapa pendente no funil — próxima pergunta deve ser enviada agora |
| `LEAD DESQUALIFICADO` | Critério desqualificante atingido — encerrar com educação |
| `FOLLOW-UP ESTRATÉGICO` | Lead qualificado travado em pagamento — destravar conversão |
| `ENCAMINHAR PARA ATENDIMENTO HUMANO` | Complexidade ou perfil exige toque humano imediato |

---

### Etapa do Funil (inferida pela gestora)

| Etapa | Descrição | Critério de conclusão |
|---|---|---|
| Etapa 1 | Disponibilidade / critério primário | Lead confirmou ou recusou a condição principal (ex: datas) |
| Etapa 2 | Engajamento no conceito | Lead respondeu à pergunta "faz sentido pra você?" |
| Etapa 3 | Fit final | Lead respondeu à pergunta de confirmação de interesse |
| Etapa 4 | Decisão de formato de pagamento | Lead escolheu à vista ou parcelado |
| Etapa 5 | Clique no link de pagamento | Lead clicou e finalizou ou não finalizou a compra |

*Nota: os rótulos de cada etapa são inferidos do que a Anna perguntou na conversa — não são fixos no prompt.*

---

### Decisão (Output — campos rotulados)

Saída estruturada produzida pela gestora. Não é JSON — são campos rotulados para leitura pelo prompt Anna Follow-up e pelo n8n.

**Campos obrigatórios em todas as saídas**:

| Campo | Tipo | Descrição |
|---|---|---|
| `STATUS` | enum | Um dos quatro valores de status |
| `MENSAGEM SUGERIDA PARA ANNA` | string | Texto de referência — a Anna Follow-up adapta e gera o final |
| `PRAZO` | string | `IMEDIATO` ou tempo específico (ex: `2h`, `24h`) |

**Campos adicionais por status**:

*EM QUALIFICAÇÃO*:

| Campo | Descrição |
|---|---|
| `ETAPAS JÁ CONCLUÍDAS` | Lista do que o lead já respondeu |
| `PRÓXIMAS ETAPAS NECESSÁRIAS` | O que falta no fluxo |
| `SINAIS POSITIVOS` | Indicadores de interesse observados |
| `SINAIS DE ALERTA` | Indicadores de risco ou hesitação |

*LEAD DESQUALIFICADO*:

| Campo | Descrição |
|---|---|
| `MOTIVO` | Explicação objetiva da desqualificação |
| `CRITÉRIO DESQUALIFICANTE` | Categoria do critério atingido |
| `AÇÃO RECOMENDADA` | Encerrar / manter no radar |

*FOLLOW-UP ESTRATÉGICO*:

| Campo | Descrição |
|---|---|
| `CLASSIFICAÇÃO DO LEAD` | Qualificado + etapas concluídas |
| `ETAPA ATUAL` | Onde o lead travou |
| `SITUAÇÃO` | Descrição do bloqueio |
| `ESTRATÉGIA DE FOLLOW-UP` | Abordagem para destravar |

*ENCAMINHAR PARA ATENDIMENTO HUMANO*:

| Campo | Descrição |
|---|---|
| `CLASSIFICAÇÃO` | Big Fish / Dúvida Específica / Objeção Estratégica / Urgência de Fechamento |
| `MOTIVO DO ENCAMINHAMENTO` | Explicação em até 150 caracteres |
| `CONTEXTO` | Resumo da situação para o vendedor humano |
| `OPORTUNIDADE IDENTIFICADA` | Por que não perder esse lead |
| `URGÊNCIA` | Alta / Média |
| `BRIEFING PARA VENDEDOR` | O que o humano precisa saber antes de assumir |
| `AÇÃO IMEDIATA` | O que fazer agora |
