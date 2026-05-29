# ODARA RIO — Status do Projeto
**Atualizado em:** 29/05/2026
**Responsável técnico:** João Miguel Pelais (dev)

---

## Objetivo

Automatizar confirmações de agendamento, pós-atendimento, nurturing de leads e gestão de protocolos entre **Belle Software** (sistema de clínica) e **Clint** (CRM/WhatsApp) via **n8n**, sem intervenção manual da equipe.

---

## Fase 1 — Infraestrutura ✅ CONCLUÍDA

| O que foi feito | Status |
|---|---|
| Banco de dados Supabase — tabelas `clientes`, `agendamentos`, `vendas`, `sessoes`, `servicos_mapeamento` | ✅ |
| Carga inicial de clientes e vendas da Belle | ✅ |
| Mapeamento de todos os contatos e deals existentes no Clint | ✅ |
| WF-B — quando vendedora fecha deal WON no Clint → cria venda na Belle | ✅ Ativo |
| WF-C — sincroniza sessões realizadas da Belle → atualiza progresso no Clint | ✅ Ativo |
| 00c — sincroniza sessões realizadas diariamente (meia-noite) | ✅ Ativo |
| 01v2 — sincroniza agendamentos Belle → cards Clint (só leads sem protocolo aprovado) | ✅ Funcionando |
| Sync automático de novos clientes Belle → banco → Clint | ✅ Ativo |
| 10 deals Pós-Venda criados no Clint para clientes com protocolo aprovado | ✅ |
| Constitution do projeto documentada e ratificada (v1.1.0) | ✅ |
| Variáveis de negócio definidas (4h / 7d / 10d / 21d) | ✅ |
| IDs Clint mapeados — funis, etapas, campos customizados, canal WhatsApp | ✅ |

---

## Fase 2 — Confirmação de Agendamento ⏳ EM ANDAMENTO

> Bloqueio principal: aprovação de templates WhatsApp pela Meta.

| Workflow | O que faz | Status |
|---|---|---|
| **02a** — Disparar Confirmação 24h | Envia WhatsApp 24h antes do agendamento pedindo confirmação (botões Confirmar / Cancelar) | ✅ Construído — aguarda template `odara_confirmacao_agendamento` |
| **02b** — Webhook Resposta Confirmação | Recebe resposta da paciente e atualiza o card no Clint (Confirmado ou Reagendar) | ✅ Construído e validado |
| **02c** — Verificar Sem Resposta | Se paciente não respondeu 4h antes do atendimento, adiciona tag `confirmacao-pendente` no Clint | ✅ Construído e validado — **pode ativar hoje** |
| **03** — Lembrete Dia | Envia WhatsApp na manhã do dia do atendimento | ✅ Construído — aguarda template `odara_lembrete_dia` |

**Ação necessária:** Aguardar aprovação da Meta para `odara_confirmacao_agendamento` e `odara_lembrete_dia`.

---

## Fase 3 — Pós-Atendimento ⏸️ AGUARDANDO

| Workflow | O que faz | Status |
|---|---|---|
| **04a** — Pós-Atendimento | Mensagem personalizada logo após sessão finalizada | ⏸️ Construído — template precisa de texto por tipo de serviço Belle |
| **04b** — Follow-up 24h | Mensagem de acompanhamento 24h após o atendimento | ⏸️ Construído — aguarda template `odara_followup_24h` |

**Bloqueio:** O template `odara_pos_atendimento` não pode ser genérico — precisa de um texto diferente por tipo de serviço. Ainda não foi definido com a equipe.

---

## Fase 4 — Protocolo Pós-Venda ⏸️ AGUARDANDO

| Workflow | O que faz | Status |
|---|---|---|
| **07a** — Automação Renovação | 2 sessões restantes no protocolo → oferta de renovação via WhatsApp | ⏸️ Construído — aguarda template `odara_oferta_renovacao` |
| **07b** — Automação Upsell | 2ª ou 3ª sessão → cria tarefa no Clint para vendedora oferecer upsell | ⏸️ Construído e corrigido |
| **07c** — Automação NPS | 21 dias após início do protocolo → pesquisa de satisfação | ⏸️ Construído — aguarda template `odara_nps` |
| **07d** — Automação Aniversário | Aniversário da paciente → mensagem personalizada | ⏸️ Construído — aguarda template `odara_aniversario` |
| **07e** — Automação Nurturing | Leads não convertidos: mensagens aos 7d / 30d / 60d | ⏸️ Construído — aguarda 3 templates + decisão sobre pós-60d |
| **07f** — Alerta Sem Engajamento | Protocolo ativo sem agendamento há 10 dias → alerta para Especialista de Relacionamento | ⏸️ Construído — **pode ativar quando Meta aprovar** |
| **07g** — Migrar Pós-Venda | 7 dias após conversão → move card do Funil Aquisição para Funil Pós-Venda | ⏸️ Construído — **pode ativar quando Meta aprovar** |

---

## Templates WhatsApp — Situação

| Template | Workflow | Enviado para Meta | Aprovado |
|---|---|---|---|
| `odara_confirmacao_agendamento` | 02a | ✅ | ⏳ Aguardando |
| `odara_lembrete_dia` | 03 | ✅ | ⏳ Aguardando |
| `odara_followup_24h` | 04b | ✅ | ⏳ Aguardando |
| `odara_oferta_renovacao` | 07a | ✅ | ⏳ Aguardando |
| `odara_nps` | 07c | ✅ | ⏳ Aguardando |
| `odara_aniversario` | 07d | ✅ | ⏳ Aguardando |
| `odara_nurturing_7d` | 07e | ✅ | ⏳ Aguardando |
| `odara_nurturing_30d` | 07e | ✅ | ⏳ Aguardando |
| `odara_nurturing_60d` | 07e | ✅ | ⏳ Aguardando |
| `odara_pos_atendimento` | 04a | ❌ Não enviado | Precisa texto por tipo de serviço |

---

## Variáveis de Negócio Definidas

| Variável | Valor | Workflow |
|---|---|---|
| Horas sem resposta para alerta de confirmação | **4 horas** | 02c |
| Dias pós-conversão para migrar para Pós-Venda | **7 dias** | 07g |
| Dias sem agendamento para alerta de abandono | **10 dias** | 07f |
| Dias de protocolo para envio do NPS | **21 dias** | 07c |
| Nurturing — 1ª mensagem lead não convertido | **7 dias** | 07e |
| Nurturing — 2ª mensagem | **30 dias** | 07e |
| Nurturing — 3ª mensagem | **60 dias** | 07e |
| Sessões restantes para oferta de renovação | **2 sessões** | 07a |
| Sessão para disparar upsell | **2ª ou 3ª sessão** | 07b |

---

## Gaps Abertos

| # | Gap | Impacto | Próximo passo |
|---|---|---|---|
| 1 | **77 clientes sem contato no Clint** (`clint_contact_uuid = NULL`) | 01v2 não cria cards para eles na Aquisição | Workflow de importação em lote — decidido adiar |
| 2 | **Template `odara_pos_atendimento` sem texto** | Bloqueia toda a Fase 3 (04a) | Equipe define texto por tipo de serviço Belle |
| 3 | **Nurturing pós-60d sem decisão** | 07e incompleto | Equipe decide: para? repete mensalmente? outra cadência? |
| 4 | **Campo `belle_id` no Clint não criado** | WF-B envia o valor mas campo não existe no painel | Criar manualmente: Configurações → Campos → CONTACT → Texto |
| 5 | **MAP-C — mapeamento de serviços Belle ↔ Clint** | WF-B não cria vendas Belle completas sem essa tabela | Construir workflow que busca catálogo Belle e popula `servicos_mapeamento` |

---

## Próximas Ações Imediatas

1. **Ativar 02b e 02c no n8n** — já prontos, não dependem de template Meta
2. **Ativar 01v2 no agendamento automático** — já funcionando corretamente
3. **Criar campo `belle_id` no Clint** — ação manual de 2 minutos no painel
4. **Aguardar Meta** — assim que `odara_confirmacao_agendamento` for aprovado, ativar 02a e a Fase 2 está completa
5. **Definir textos do `odara_pos_atendimento` por serviço** — para desbloquear a Fase 3

---

## Referências Técnicas

### Credenciais
| Sistema | Detalhe |
|---|---|
| Belle — token | `669ebde7afafcd939eff35cc43a594cb` |
| Belle — codEstab | `1` |
| Clint — token | `U2FsdGVkX18...` (ver workflows) |
| Clint — autenticação | Header `api-token: TOKEN` (não Bearer) |
| n8n — URL | `https://workflows.rotha.co` |
| Supabase — projeto | `rvjzysywjmhkqkpxcqgi` |
| n8n — credencial Postgres | `PostgreSQL Odara` (ID: `6W46gLQ9cENri003`) |

### IDs Clint Críticos
| Recurso | ID |
|---|---|
| WhatsApp conectado (Odara Rio 4916) | `8976ddb6-b5eb-445d-9a3d-1101ed95328a` |
| Funil Comercial (Aquisição) | `0d2ecb7c-7006-4b36-8faf-6b29b3913bbc` |
| Funil Pós Vendas | `0a6983cd-bb08-4eae-9d08-0afec4b90fd6` |
| Origin — ODARA Aquisição TESTE | `58d30a69-0378-4dc5-9a77-72a5c1570671` |
| Origin — ODARA Pós-Venda TESTE | `2ab591ec-01be-4522-8200-be2cd653f219` |

### Regras da Constitution (não negociáveis)
- Belle é a fonte primária de verdade — dados clínicos nunca vêm do Clint
- A única direção Clint → Belle permitida é: deal WON → criar venda na Belle
- Nenhuma fase é ativada sem validar a anterior
- Todo nó Postgres criado via MCP precisa ter a credencial trocada para `PostgreSQL Odara` manualmente
- Em testes, mensagens WhatsApp vão SEMPRE para o contato de teste (João Miguel — `+5511940210984`)

---

*Arquivo gerado automaticamente em 29/05/2026. Para atualizar, solicite um novo relatório de status.*
