# Feature Specification: Belle como Fonte de Verdade — Sincronização Completa com Clint

**Feature Branch**: `002-belle-sync-completo`

**Created**: 2026-06-03

**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Toda paciente da Belle aparece no Clint (Priority: P1)

Qualquer cliente cadastrado na Belle que tenha ao menos um agendamento recente deve ser automaticamente criado como contato no Clint, para que o time comercial e a especialista possam visualizá-la e agir — sem intervenção manual.

**Why this priority**: Sem esse sync, pacientes reais ficam invisíveis no Clint. É a base de todas as automações de relacionamento.

**Independent Test**: Criar um cliente na Belle e agendar uma consulta → aguardar o sync → verificar contato no Clint com nome e telefone corretos.

**Acceptance Scenarios**:

1. **Given** um cliente existe na Belle com agendamento nos últimos 90 dias e sem `clint_contact_uuid`, **When** o sync roda, **Then** um contato é criado no Clint e o UUID é salvo no banco
2. **Given** um cliente já existe no Clint pelo telefone, **When** o sync roda, **Then** o UUID existente é vinculado sem criar duplicata
3. **Given** um cliente sem agendamento e sem venda aprovada, **When** o sync roda, **Then** nenhum contato é criado no Clint

---

### User Story 2 — Deal no Clint reflete todos os dados da venda Belle (Priority: P1)

Quando uma venda é aprovada na Belle, o deal criado no Clint deve conter todos os campos relevantes: serviço, valor, vendedor, sessões, indicação, forma de pagamento e datas do protocolo — para que a especialista tenha contexto completo ao assumir o relacionamento.

**Why this priority**: Sem dados completos no deal, o time trabalha às cegas no Clint.

**Independent Test**: Aprovar uma venda na Belle com indicação e parcelas → verificar deal no Clint com todos os campos preenchidos.

**Acceptance Scenarios**:

1. **Given** uma venda aprovada na Belle com indicação preenchida, **When** o sync roda, **Then** o deal no Clint mostra quem indicou a paciente
2. **Given** uma venda com múltiplas parcelas, **When** o sync roda, **Then** as datas e valores das parcelas ficam disponíveis para o dashboard financeiro
3. **Given** uma paciente com ao menos uma sessão realizada no protocolo, **When** o workflow de sessões detecta a primeira sessão, **Then** `data_inicio` é registrado automaticamente na venda e fica disponível para os workflows de NPS e dashboards

---

### User Story 3 — Agendamento no Clint reflete tipo e sala da Belle (Priority: P2)

O deal de agendamento criado no Clint deve informar o tipo do atendimento (Consulta, Serviço, Retorno) e a sala utilizada, para que o time saiba o contexto do atendimento e seja possível calcular a taxa de ocupação por sala.

**Why this priority**: Permite personalização das mensagens automáticas por tipo de procedimento e alimenta indicadores operacionais.

**Independent Test**: Criar agendamento do tipo "Consulta" na Belle na Sala de Procedimento → verificar deal no Clint com tipo e sala preenchidos.

**Acceptance Scenarios**:

1. **Given** um agendamento do tipo "Consulta" na Belle, **When** o sync roda, **Then** o deal no Clint mostra tipo = Consulta
2. **Given** um agendamento em sala específica, **When** o sync roda, **Then** o nome da sala aparece no deal

---

### User Story 4 — Tabela de sessões é populada a cada atendimento (Priority: P2)

Cada agendamento marcado como "Atendido" na Belle deve gerar um registro na tabela de sessões no banco de dados, para que indicadores de frequência, churn e LTV possam ser calculados com precisão.

**Why this priority**: Sem histórico de sessões, não é possível calcular os principais indicadores do Tópico 4 (Dashboards).

**Independent Test**: Marcar um agendamento como Atendido na Belle → verificar que um registro aparece na tabela `sessoes` com data e serviço corretos.

**Acceptance Scenarios**:

1. **Given** um agendamento marcado como "Atendido" na Belle, **When** o workflow de sessões roda, **Then** um registro é criado na tabela `sessoes`
2. **Given** o mesmo agendamento já registrado, **When** o workflow roda novamente, **Then** nenhum registro duplicado é criado

---

### Edge Cases

- E se o cliente tiver o mesmo telefone de outro contato no Clint? → O UUID existente deve ser vinculado sem criar duplicata
- E se a venda tiver `valor_final = 0` (cortesia)? → O deal é criado normalmente com R$0, sem erro
- E se o campo `indicacao` estiver vazio na Belle? → O campo fica em branco no Clint, sem bloquear o sync
- E se o agendamento for cancelado antes do sync? → O deal de agendamento deve refletir o status Cancelado
- E se a Belle retornar `data_inicio` como null? → O campo fica vazio, outros campos são sincronizados normalmente

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE criar contatos no Clint para qualquer cliente da Belle que tenha agendamento nos últimos 90 dias, independente de ter venda aprovada
- **FR-002**: O sistema DEVE vincular UUIDs de contatos existentes no Clint por correspondência de telefone, sem criar duplicatas
- **FR-003**: O sistema DEVE capturar e armazenar o campo `indicacao` da venda Belle e exibi-lo no deal do Clint
- **FR-004**: O sistema DEVE capturar e armazenar o campo `parcelas` da venda Belle para uso nos dashboards financeiros
- **FR-005**: O sistema DEVE capturar o campo `tipo` do agendamento Belle (Consulta / Serviço / Retorno) e salvar no banco e no deal do Clint
- **FR-006**: O sistema DEVE capturar o campo `sala.nome` do agendamento Belle e salvar no banco e no deal do Clint
- **FR-007**: O sistema DEVE derivar e salvar `data_inicio` do protocolo a partir da data da primeira sessão realizada — campo não existe diretamente na Belle API
- **FR-008**: O sistema DEVE registrar cada atendimento finalizado na tabela `sessoes` com data, serviço e número sequencial da sessão
- **FR-009**: O sistema NÃO DEVE criar duplicatas de sessões para o mesmo atendimento
- **FR-010**: O sistema NÃO DEVE criar contatos no Clint para clientes sem agendamentos e sem vendas aprovadas
- **FR-011**: O sistema DEVE capturar e salvar a data de cadastro original do cliente na Belle (`dtCadastro`) para rastreabilidade histórica

### Key Entities

- **Cliente**: Pessoa cadastrada na Belle com nome, telefone, CPF, belle_id; vinculada ao Clint via `clint_contact_uuid`
- **Agendamento**: Consulta ou serviço marcado na Belle com data, hora, tipo, sala, profissional e status
- **Venda (Protocolo)**: Pacote de serviços aprovado na Belle com valor, vendedor, sessões, indicação e parcelas de pagamento
- **Sessão**: Registro individual de cada atendimento realizado, vinculado à venda/protocolo
- **Parcela**: Registro de pagamento parcelado com data de vencimento e valor

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos clientes da Belle com agendamentos nos últimos 90 dias aparecem como contatos no Clint em até 1 hora após o cadastro
- **SC-002**: 100% dos deals no funil Pós-Venda contêm serviço, vendedor e sessões total preenchidos
- **SC-003**: O campo `indicacao` está preenchido em todos os deals onde a Belle registrou uma indicação
- **SC-004**: A tabela `sessoes` contém um registro para cada atendimento marcado como "Atendido" na Belle nos últimos 3 meses
- **SC-005**: Nenhum contato duplicado é criado no Clint para o mesmo telefone
- **SC-006**: O tipo do agendamento (Consulta/Serviço/Retorno) está visível no deal do Clint para 100% dos agendamentos futuros

---

## Assumptions

- Belle é a fonte primária de verdade — dados clínicos nunca vêm do Clint para sobrescrever a Belle
- A única direção Clint → Belle permitida é: vendedora fecha deal WON → cria venda na Belle
- Clientes da Belle chegam ao Clint via sync automático; leads do Clint chegam ao banco via MAP-A
- O campo `data_inicio` do protocolo existe na Belle API com nome diferente do assumido — precisa de investigação
- Sincronização ocorre via polling periódico (não webhook em tempo real)
- Clientes sem telefone válido não são sincronizados (sem WhatsApp = sem ação possível)
