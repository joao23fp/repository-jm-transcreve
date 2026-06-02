# Tarefas — Integração Belle × Clint | Odara Rio
*Atualizado em 30/05/2026 | Baseado no briefing de 04 de maio de 2026*

| ✅ | ⏳ | 🔄 | ⚠️ | ❌ |
|---|---|---|---|---|
| Feito e funcionando | Pronto — aguardando WhatsApp aprovar | Em andamento | Aguarda ação da equipe da clínica | Não iniciado |

---

## Tópico 1 — Agendamentos & Confirmações

| Status | O que foi pedido |
|:---:|---|
| ✅ | Agendamento criado no Belle aparece automaticamente no Clint |
| ⏳ | Mensagem automática 24h antes com botão Confirmar e botão Cancelar |
| ✅ | Se confirmar → card atualizado como "confirmado" no Clint |
| ✅ | Se cancelar → card move para etapa "Reagendamento" no funil |
| ⏳ | Se cancelar → mensagem de retorno automática + tarefa aberta para a vendedora remarcar |
| ✅ | Se não responder → tag automática criada após 4 horas sem resposta |
| ⚠️ | Mensagem de confirmação personalizada por tipo de procedimento — aguarda equipe criar os textos |
| ⏳ | Lembrete automático na manhã do atendimento com horário e endereço |
| ⚠️ | Mensagem com cuidados pós-procedimento logo após a sessão — aguarda equipe criar os textos |
| ⏳ | Mensagem 24h depois perguntando como a paciente está |
| ⏳ | Resposta negativa → tarefa imediata para a Especialista de Relacionamento |
| ❌ | Sugestão automática de próxima sessão para protocolos com frequência semanal |

---

## Tópico 2 — Vendas & Conversão

| Status | O que foi pedido |
|:---:|---|
| ✅ | Funil 1 — Aquisição configurado (leads novos) |
| ✅ | Funil 2 — Pós-Venda configurado (10 pacientes já inseridas) |
| 🔄 | Tags por origem automatizadas (Instagram, WhatsApp, Indicação) — origens mapeadas, tags ainda não automatizadas |
| ✅ | Vendedora fecha no Clint → venda lançada automaticamente no Belle |
| ✅ | Card vai para "Convertido" no funil |
| ✅ | Após 7 dias → card migra automaticamente para o Funil Pós-Venda |
| ✅ | Serviço/protocolo contratado sincronizado |
| ✅ | Valor da venda e forma de pagamento sincronizados |
| ✅ | Número de sessões e progresso de sessões realizadas |
| ✅ | Profissional responsável sincronizado |
| ❌ | Data de início e previsão de término do protocolo |
| ❌ | Origem do lead |
| ❌ | Data de nascimento da paciente |
| ❌ | Objetivo da paciente (emagrecimento, hormonal etc.) |
| ❌ | Observações do prontuário — a API do Belle não disponibiliza esse dado |
| ⏳ | 2 sessões antes do fim do pacote → oferta automática de renovação |
| ✅ | 2ª ou 3ª sessão → tarefa automática de upsell para a vendedora |
| ❌ | Indicação convertida → registrar automaticamente no card de quem indicou |
| ⏳ | Aniversário da paciente → mensagem personalizada automática |
| ⏳ | Lead não convertido → sequência de nurturing (7, 30 e 60 dias) |
| ✅ | Regra de parada do nurturing: para quando a venda for aprovada |
| ✅ | Protocolo ativo sem agendamento há 10 dias → alerta para a Especialista |
| ⏳ | Após 21 dias de protocolo → pesquisa de satisfação (NPS) |
| ❌ | NPS positivo → candidata a indicação \| NPS negativo → tarefa imediata para a Especialista |

---

## Tópico 3 — Cadastros & Base de Pacientes

| Status | O que foi pedido |
|:---:|---|
| ✅ | Lead manda mensagem → Clint cria contato automaticamente com nome e número |
| ❌ | Dados atualizados no Clint sincronizam para o Belle — a API do Belle não permite essa direção |
| ✅ | Belle como fonte oficial de dados clínicos |
| 🔄 | Conversão → ficha criada no Belle sem trabalho manual — mapeamento de serviços em construção |
| ✅ | Cruzamento inicial de cadastros por CPF/telefone (carga inicial concluída) |
| ✅ | Número já existente no Belle → vincula ao cadastro existente, não cria novo |
| ❌ | Histórico clínico do Belle visível no card do Clint — a API do Belle não disponibiliza esse dado |
| ❌ | Campos preenchidos pela vendedora no Clint sincronizam como observação no Belle — a API do Belle não permite |
| ❌ | Paciente que converteu mas nunca agendou → alerta automático |
| ✅ | Paciente em protocolo ativo sem agendamento há 10 dias → alerta para a Especialista |

---

## Tópico 4 — Relatórios & Indicadores

> Fase não iniciada. Toda a etapa de automações (Tópicos 1 a 3) precisa estar estável antes de começar os dashboards.

---

## O Que Está Travado Agora

### Aguardando o WhatsApp (Meta)

9 modelos de mensagem foram enviados para aprovação. Assim que aprovados, os seguintes fluxos ativam imediatamente — **sem nenhum trabalho adicional de desenvolvimento:**

- Confirmação 24h antes (com botões Confirmar/Cancelar)
- Lembrete na manhã do dia do atendimento
- Mensagem de follow-up 24h após o atendimento
- Oferta de renovação (2 sessões antes do fim do pacote)
- Pesquisa de satisfação (NPS)
- Mensagem de aniversário
- Sequência de nurturing (7, 30 e 60 dias)

### Pela equipe da clínica

| Ação | Por que trava o projeto |
|---|---|
| Criar textos de cuidados pós-procedimento por tipo de atendimento | Sem isso, o fluxo pós-atendimento não ativa |
| Criar textos de preparo para a mensagem de confirmação 24h por procedimento | Necessário para personalizar a confirmação |
| Criar textos de follow-up de experiência 24h após o atendimento por procedimento | Sem isso, o follow-up fica genérico |
| Decidir o que acontece após o nurturing de 60 dias — para? repete mensalmente? | Sem decisão, o fluxo de nurturing fica incompleto |

---

## Progresso — Tópicos 1, 2 e 3

| Tópico | ✅ Feitos | ⏳ Prontos (ag. WA) | 🔄 Andamento | ⚠️ Eq. clínica | ❌ Não iniciados | Total |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Tópico 1 — Agenda & Confirmações | 4 | 5 | — | 2 | 1 | 12 |
| Tópico 2 — Vendas & Conversão | 12 | 4 | 1 | — | 7 | 24 |
| Tópico 3 — Cadastros & Base | 5 | — | 1 | — | 4 | 10 |
| **Total** | **21** | **9** | **2** | **2** | **12** | **46** |

**21 de 46 itens concluídos — 46% do projeto**

Mais 9 itens já prontos tecnicamente, aguardando apenas aprovação do WhatsApp. Se aprovados, avançamos para **65% do projeto sem nenhuma linha de código adicional.**

*Tópico 4 — Relatórios & Indicadores (fase seguinte): 17 itens a iniciar.*

---

*Documento atualizado em 30/05/2026 para acompanhamento interno da direção ODARA RIO.*
