# ODARA RIO — Resumo da Sessão de Desenvolvimento
**Data:** 13/05/2026

---

## O que foi feito

### Documentação lida
- API completa da Belle Software (90 endpoints, todas as seções)
- Briefing de integração Belle × Clint (reunião 04/05/2026)

### Arquivos criados (`/odara-n8n/`)

| Arquivo | Função |
|---|---|
| `database/schema.sql` | 6 tabelas PostgreSQL: clientes, agendamentos, vendas, leads, mensagens_log, tarefas |
| `00a-carga-inicial-clientes` | Importa todos os clientes da Belle (paginado, rodar 1x) |
| `00b-carga-inicial-vendas` | Importa todos os protocolos ativos da Belle (rodar 1x) |
| `00c-sync-sessoes-realizadas` | Atualiza sessões realizadas diariamente via saldoRestante |
| `01-sync-agendamentos` | Polling Belle a cada 5min → sincroniza DB |
| `02a-disparar-confirmacao-24h` | A cada hora → envia confirmação 24h antes |
| `02b-webhook-resposta-confirmacao` | Recebe resposta da paciente (confirmar/cancelar) |
| `02c-verificar-sem-resposta` | A cada 30min → cria tarefa se não respondeu |
| `03-lembrete-dia` | Às 8h → lembrete no dia do atendimento |
| `04a-pos-atendimento` | A cada 5min → mensagem pós-procedimento |
| `04b-followup-24h` | A cada hora → check-in 24h após atendimento |
| `05-cadastro-lead` | Webhook Clint → cria lead no Belle (com dedup por telefone) |
| `06-conversao-venda` | Webhook Clint → lança venda no Belle → move card |
| `07a-automacao-renovacao` | 2 sessões restantes → oferta renovação |
| `07b-automacao-upsell` | 2ª/3ª sessão → tarefa de upsell |
| `07c-automacao-nps` | X dias após início → pesquisa NPS |
| `07d-automacao-aniversario` | Às 8h30 → mensagem de aniversário |
| `07e-automacao-nurturing` | Leads perdidos: 7, 30 e 60 dias |
| `07f-alerta-sem-engajamento` | Protocolo ativo sem agendamento → alerta Especialista |
| `07g-migrar-pos-venda` | X dias após conversão → migra para Funil Pós-Venda |
| `CLINT-ACOES.md` | Especificação dos 20 HTTP Requests para configurar no Clint |
| `VARIAVEIS.md` | 4 variáveis pendentes com contexto e instruções |

---

## Decisões técnicas tomadas

| Decisão | Motivo |
|---|---|
| Polling a cada 5min (não webhook) | Belle não tem webhooks |
| `sessoes_realizadas = sessoes_total − saldoRestante` | Belle controla o saldo internamente; mais confiável que contar agendamentos |
| Clint sem API → HTTP Requests manuais | Clint não expõe API pública; cada ação é configurada individualmente |
| Banco: Supabase + nós nativos Postgres n8n | Mais robusto que SQLite, gratuito para o volume atual |
| Deduplicação por telefone | Leads chegam sem CPF inicialmente |

---

## Em Aberto

### Variáveis (definir com a equipe)
| # | Variável | Contexto |
|---|---|---|
| 1 | `HORAS_SEM_RESPOSTA_CONFIRMACAO` | Sugestão: 4h antes do atendimento |
| 2 | `DIAS_POS_CONVERSAO_MIGRAR_FUNIL` | Quanto tempo vendedora fica com o card |
| 3 | `DIAS_SEM_AGENDAMENTO_ALERTA` | Abandono silencioso de protocolo |
| 4 | `DIAS_INICIO_PROTOCOLO_NPS` | Momento ideal pós início do protocolo |

### Ações da equipe da clínica
- [ ] Textos de preparo pré-procedimento (por tipo de serviço)
- [ ] Textos de cuidados pós-procedimento (por tipo de serviço)
- [ ] Textos de follow-up 24h (por tipo de serviço)

### Técnico / Terceiros
- [ ] Configurar webhooks no Clint (usar `CLINT-ACOES.md`)
- [ ] Alinhar UTMs com gestor de tráfego
- [ ] Higienização inicial dos cadastros duplicados (CPF/telefone)

---

## Primeiros Passos (ordem de execução)

1. **Criar projeto no Supabase** → rodar `schema.sql`
2. **Criar n8n** (cloud ou self-hosted) → criar credential `PostgreSQL Odara`
3. **Importar os 19 JSONs** de workflows no n8n
4. **Rodar 00a** (clientes) → verificar tabela no Supabase
5. **Rodar 00b** (vendas) → verificar tabela no Supabase
6. **Ativar 00c e 01** → base funcionando
7. **Configurar Clint** com `CLINT-ACOES.md`
8. **Ativar 05 e 06** → fluxo de leads e conversão
9. **Preencher textos** → ativar 02a/b/c, 03, 04a/b
10. **Definir variáveis** → ativar 07a–07g

---

## Credenciais Belle
- Token: `669ebde7afafcd939eff35cc43a594cb`
- codEstab: `1`
