# ODARA RIO — O Que Foi Pedido vs. O Que Está Pronto
**Baseado no briefing de 04 de maio de 2026**
**Atualizado em:** 29/05/2026

---

## Como ler este documento

| Símbolo | Significado |
|---|---|
| ✅ | Pronto e funcionando |
| ⏳ | Construído, aguardando aprovação do WhatsApp pelo Meta |
| 🔄 | Em andamento |
| ❌ | Não iniciado ainda |
| ⚠️ | Precisa de ação da equipe da clínica para avançar |

---

## Tópico 1 — Agenda & Confirmações

### Fluxo de confirmação 24h antes

| O que foi pedido | Status | Observação |
|---|---|---|
| Agendamento criado no Belle aparece automaticamente no Clint | ✅ | Funcionando |
| Mensagem automática de confirmação 24h antes com botão Confirmar e Cancelar | ⏳ | Mensagem pronta — aguardando WhatsApp aprovar o modelo |
| Se confirmar → card do Clint atualizado automaticamente | ✅ | Funcionando |
| Se cancelar → card move para "Reagendamento" no funil | ✅ | Funcionando |
| Se cancelar → abre tarefa para vendedora remarcar | ⏳ | Aguardando aprovação do WhatsApp |
| Se não responder em 4h → gera alerta para vendedora | ✅ | Pronto — pode ser ativado hoje |
| Personalização da mensagem por tipo de procedimento | ❌ | Aguarda equipe criar os textos por procedimento |

### Lembrete no dia do atendimento

| O que foi pedido | Status | Observação |
|---|---|---|
| Mensagem automática na manhã do dia com horário e endereço | ⏳ | Mensagem pronta — aguardando WhatsApp aprovar o modelo |

### Reagendamento recorrente para protocolos

| O que foi pedido | Status | Observação |
|---|---|---|
| Sugestão automática de próxima sessão para protocolos semanais | ❌ | Não iniciado — necessário levantar lógica de frequência com a equipe |

### Pós-atendimento

| O que foi pedido | Status | Observação |
|---|---|---|
| Mensagem automática com cuidados pós-procedimento logo após a sessão | ⚠️ | Fluxo construído — aguarda equipe criar os textos por tipo de procedimento |
| Mensagem 24h depois perguntando como a paciente está | ⏳ | Pronta — aguardando WhatsApp aprovar o modelo |
| Resposta negativa → tarefa imediata para a Especialista de Relacionamento | ⏳ | Incluso no fluxo acima |

---

## Tópico 2 — Vendas & Conversão

### Estrutura de funis

| O que foi pedido | Status | Observação |
|---|---|---|
| Funil 1 — Aquisição para leads novos | ✅ | Configurado e funcionando |
| Funil 2 — Pós-Venda para pacientes convertidas | ✅ | Configurado — 10 pacientes já foram colocadas nele |
| Tags por origem (Instagram, WhatsApp, Indicação) dentro do funil | 🔄 | Parcialmente — origens mapeadas, tags ainda não automatizadas |

### Fluxo de conversão

| O que foi pedido | Status | Observação |
|---|---|---|
| Vendedora fecha no Clint → venda lançada automaticamente no Belle | ✅ | Funcionando |
| Card vai para "Convertido" no funil | ✅ | Funcionando |
| Após X dias → card migra automaticamente para Funil Pós-Venda | ✅ | Construído — configurado para 7 dias |

### Informações que chegam no card via Belle

| O que foi pedido | Status | Observação |
|---|---|---|
| Serviço/protocolo contratado | ✅ | Sincronizado |
| Valor da venda e forma de pagamento | ✅ | Sincronizado |
| Número de sessões do pacote | ✅ | Sincronizado |
| Progresso de sessões realizadas | ✅ | Atualizado automaticamente |
| Profissional responsável | ✅ | Sincronizado |
| Objetivo da paciente (emagrecimento, hormonal etc.) | ❌ | Não implementado |
| Observações do prontuário visíveis no card | ❌ | Limitação da API do Belle — não retorna prontuário |

### Automações de vendas

| O que foi pedido | Status | Observação |
|---|---|---|
| 2 sessões antes do fim → oferta automática de renovação | ⏳ | Fluxo construído — aguardando WhatsApp aprovar o modelo |
| 2ª ou 3ª sessão → gatilho de upsell para vendedora | ✅ | Construído — cria tarefa automática no Clint para a vendedora agir |
| Indicação convertida → registra no card de quem indicou | ❌ | Não iniciado |
| Aniversário da paciente → mensagem automática | ⏳ | Construído — aguardando WhatsApp aprovar o modelo |
| Lead não convertido → sequência de mensagens em 7, 30 e 60 dias | ⏳ | Construído — aguardando WhatsApp aprovar os 3 modelos |
| Regra de parada do nurturing: para quando a paciente fechar | ✅ | Configurado — para quando venda for aprovada |
| Protocolo ativo sem agendamento há 10 dias → alerta para Especialista | ✅ | Construído — pode ser ativado |
| Após 21 dias de protocolo → pesquisa de satisfação (NPS) | ⏳ | Construído — aguardando WhatsApp aprovar o modelo |

---

## Tópico 3 — Cadastros & Base de Pacientes

### Fluxo de cadastro

| O que foi pedido | Status | Observação |
|---|---|---|
| Lead manda mensagem → Clint cria contato automaticamente | ✅ | Funciona pelo Clint nativo |
| Dados atualizados no Clint sincronizam para o Belle | ⚠️ | Parcial — a direção definida foi Belle como fonte principal; dados clínicos não fluem do Clint para o Belle (proteção dos dados da paciente) |
| Belle como fonte oficial de dados clínicos | ✅ | Princípio estabelecido e respeitado |
| Conversão → ficha já completa no Belle sem trabalho manual | 🔄 | Em andamento — venda é criada automaticamente, mas mapeamento completo de serviços ainda está em construção |

### Deduplicação e higienização

| O que foi pedido | Status | Observação |
|---|---|---|
| Cruzamento de cadastros existentes por CPF/telefone | ✅ | Feito na carga inicial |
| Se número já existe no Belle → vincular ao cadastro existente | ✅ | Implementado |

### Histórico e contexto no Clint

| O que foi pedido | Status | Observação |
|---|---|---|
| Histórico clínico do Belle visível no card do Clint | ❌ | A API do Belle não disponibiliza prontuário — limitação técnica da plataforma |
| Campos preenchidos pela vendedora sincronizam como observação no Belle | ❌ | Não implementado — dependeria de liberação da API do Belle |

### Alertas de base

| O que foi pedido | Status | Observação |
|---|---|---|
| Paciente que converteu mas nunca agendou → alerta | ❌ | Não iniciado |
| Paciente em protocolo ativo sem agendamento → tarefa para Especialista | ✅ | Construído (configurado para 10 dias sem agendamento) |

---

## Tópico 4 — Relatórios & Indicadores

> Este tópico ainda não foi iniciado. Toda a fase anterior (automações) precisava ser concluída primeiro.

| O que foi pedido | Status |
|---|---|
| Dashboard para a Direção — visão completa de faturamento, ocupação e conversão | ❌ |
| Dashboard para Coordenador Comercial — time, metas e funil | ❌ |
| Dashboard individual para Vendedoras e Especialista | ❌ |
| Faturamento realizado vs meta do mês | ❌ |
| Taxa de ocupação da agenda | ❌ |
| Ticket médio por protocolo e profissional | ❌ |
| Taxa de conversão por origem, vendedora e protocolo | ❌ |
| ROI do tráfego pago — custo por lead vs receita | ❌ |
| Taxa de retenção e churn | ❌ |
| LTV médio por paciente | ❌ |
| Taxa de indicação | ❌ |
| NPS por profissional | ❌ |
| Taxa de cancelamento e reposição no mesmo dia | ❌ |
| Procedimentos mais vendidos e rentáveis | ❌ |
| Tempo médio de resposta ao lead por vendedora | ❌ |
| Ranking do time comercial | ❌ |
| Relatório semanal automático enviado para a direção | ❌ |
| Integração com UTMs do gestor de tráfego | ❌ |

---

## Resumo Geral

| Tópico | Itens pedidos | Prontos | Em andamento / Aguardando | Não iniciados |
|---|---|---|---|---|
| Tópico 1 — Agenda & Confirmações | 12 | 4 | 5 | 3 |
| Tópico 2 — Vendas & Conversão | 17 | 7 | 6 | 4 |
| Tópico 3 — Cadastros & Base | 10 | 5 | 1 | 4 |
| Tópico 4 — Relatórios & Indicadores | 17 | 0 | 0 | 17 |
| **Total** | **56** | **16** | **12** | **28** |

---

## O Que Está Travado — Ações Necessárias Agora

### Pela equipe da clínica (não é desenvolvimento)

| Ação | Por que é urgente |
|---|---|
| Criar os textos de cuidados pós-procedimento para cada tipo de atendimento | Sem isso, o fluxo pós-atendimento não pode ser ativado |
| Criar os textos de preparo enviados na confirmação 24h — por procedimento | Necessário para personalizar a mensagem de confirmação |
| Criar os textos de follow-up de experiência 24h após — por procedimento | Sem isso, o follow-up fica genérico |
| Decidir o que acontece após o nurturing de 60 dias — para? repete mensalmente? | Sem decisão, o fluxo de nurturing está incompleto |

### Aguardando o WhatsApp (Meta)

9 modelos de mensagem foram enviados para aprovação. Assim que aprovados, os seguintes fluxos podem ser ativados imediatamente:
- Confirmação 24h antes (com botões Confirmar/Cancelar)
- Lembrete no dia do atendimento
- Follow-up 24h após atendimento
- Oferta de renovação (2 sessões antes do fim)
- NPS de satisfação
- Mensagem de aniversário
- Sequência de nurturing (7, 30 e 60 dias)

### Próxima grande fase

Assim que todas as automações estiverem ativas e estáveis, iniciar a construção dos **relatórios e dashboards** (Tópico 4) — que representa toda a camada de visibilidade para a direção e o time comercial.

---

*Documento gerado em 29/05/2026 para acompanhamento interno da direção ODARA RIO.*
