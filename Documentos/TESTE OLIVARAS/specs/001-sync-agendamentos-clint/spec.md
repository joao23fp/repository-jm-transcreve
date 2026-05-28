# Feature Specification: Workflow 01 v2 — Sync Agendamentos Belle → Clint

**Feature Branch**: `001-sync-agendamentos-clint`

**Created**: 2026-05-28

**Status**: Draft

**Input**: Workflow de sincronização de agendamentos da Belle Software com
cards/deals no funil Clint, substituindo o workflow 01 original.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agendamento Belle aparece como card no Clint (Priority: P1)

Quando uma paciente tem um agendamento criado ou atualizado na Belle, a equipe
consegue visualizá-lo no Clint sem precisar acessar o sistema Belle. O card no
Clint reflete o status atual do agendamento (Marcado / Confirmado / Cancelado /
Atendido) e contém os dados essenciais: data, horário, profissional e serviço.

**Why this priority**: A visibilidade dos agendamentos no Clint é a base de
todas as automações de comunicação (confirmação 24h, lembrete do dia,
pós-atendimento). Sem isso, as Fases 2 e 3 não podem ser ativadas.

**Independent Test**: Criar um agendamento novo na Belle e verificar que dentro
de 5 minutos um card correspondente aparece no funil correto do Clint, com
status e dados preenchidos.

**Acceptance Scenarios**:

1. **Given** um agendamento com status "Marcado" existe na Belle,
   **When** o workflow roda (a cada 5 minutos),
   **Then** um card é criado no Clint na etapa correta do funil com data, horário, profissional e serviço visíveis.

2. **Given** um agendamento existente muda de status na Belle (ex: "Marcado" → "Cancelado"),
   **When** o workflow roda na próxima execução,
   **Then** o card correspondente no Clint é movido para a etapa que representa o novo status.

3. **Given** uma paciente ainda não tem `clint_contact_uuid` no banco,
   **When** o workflow encontra o agendamento dela,
   **Then** o agendamento é ignorado nesta execução (não tenta criar card sem contato vinculado).

4. **Given** um agendamento já foi sincronizado anteriormente (tem `clint_card_id`),
   **When** o workflow roda novamente sem alterações no agendamento,
   **Then** nenhuma atualização desnecessária é feita no Clint.

---

### User Story 2 — Status do agendamento refletido na etapa do funil (Priority: P2)

Cada status do agendamento na Belle corresponde a uma etapa específica no funil
do Clint. A equipe não precisa mover cards manualmente — o workflow faz isso
automaticamente conforme a Belle é atualizada.

**Why this priority**: A automação de notificações (Fase 2) depende de saber
em qual etapa o card está para disparar as mensagens corretas no momento certo.

**Independent Test**: Alterar o status de um agendamento na Belle e verificar
que o card no Clint é movido para a etapa correspondente na próxima execução.

**Acceptance Scenarios**:

1. **Given** um card no Clint está na etapa "Avaliação Agendada",
   **When** a paciente confirma e o status na Belle muda para "Marcado" (confirmado),
   **Then** o card é movido para "Confirmado" no Clint.

2. **Given** um card está em qualquer etapa ativa,
   **When** o agendamento é cancelado na Belle,
   **Then** o card é movido para "Reagendar" no Clint.

3. **Given** um agendamento foi realizado (status "Atendido" na Belle),
   **When** o workflow roda,
   **Then** o card é movido para "Consulta Realizada" no Clint.

---

### User Story 3 — Dados do agendamento visíveis no card Clint (Priority: P3)

Além do status, o card no Clint exibe os campos relevantes do agendamento:
data, horário, nome do profissional, serviço e observação. A equipe consegue
consultar esses dados diretamente no Clint sem abrir a Belle.

**Why this priority**: Melhora a experiência operacional e reduz alternância
entre sistemas. Menos crítico que criar/mover o card, mas importante para a
completude da informação.

**Independent Test**: Abrir um card no Clint e verificar que data, horário e
profissional correspondem ao agendamento na Belle.

**Acceptance Scenarios**:

1. **Given** um card é criado no Clint a partir de um agendamento,
   **When** a equipe abre o card,
   **Then** vê data da consulta, horário, nome do profissional e serviço preenchidos.

2. **Given** os dados de um agendamento mudam na Belle (ex: horário reagendado),
   **When** o workflow sincroniza,
   **Then** o card no Clint reflete os dados atualizados.

---

### Edge Cases

- O que acontece se a paciente tem múltiplos agendamentos ativos ao mesmo tempo?
  → Cada agendamento gera um card separado no Clint (identificado pelo `belle_id`).
- O que acontece se o Clint retorna erro 4xx ao criar o card?
  → O workflow registra o erro e tenta novamente na próxima execução (não marca como sincronizado).
- O que acontece se o Clint retorna erro 5xx ou timeout?
  → A execução atual é interrompida. Os agendamentos ainda não processados nessa rodada serão capturados na próxima execução agendada (máximo 6h depois). Sem retry imediato.
- O que acontece com agendamentos muito antigos (ex: de 2024)?
  → Filtro de data limita a sincronização a agendamentos recentes (últimos 90 dias ou data configurável).
- O que acontece se `clint_contact_uuid` é `NULL` para a paciente?
  → O agendamento é ignorado até que o vínculo Clint seja estabelecido.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O workflow DEVE rodar automaticamente 4 vezes ao dia nos horários: 07:30, 13:00, 16:00 e 20:00.
- **FR-002**: O workflow DEVE buscar agendamentos da Belle com `data_hora >= HOJE - 2 dias` e `data_hora <= HOJE + 30 dias` para pacientes que já têm `clint_contact_uuid`.
- **FR-003**: Para cada agendamento sem `clint_card_id`, o workflow DEVE criar um card no Clint no funil "ODARA | Aquisição TESTE" na etapa correspondente ao status do agendamento.
- **FR-004**: Para cada agendamento com `clint_card_id` existente, o workflow DEVE atualizar a etapa do card se o status do agendamento na Belle for diferente do status registrado no banco.
- **FR-005**: O workflow DEVE salvar o `clint_card_id` retornado pelo Clint na tabela `agendamentos` após criar o card.
- **FR-006**: O workflow DEVE atualizar o campo `status` na tabela `agendamentos` ao processar cada registro.
- **FR-007**: O mapeamento de status DEVE seguir a tabela definida em Key Entities abaixo.
- **FR-008**: O workflow DEVE processar no máximo 20 agendamentos por execução (LIMIT de segurança).
- **FR-009**: Agendamentos de pacientes sem `clint_contact_uuid` DEVEM ser ignorados.
- **FR-010**: O workflow DEVE substituir o workflow 01 original — ao ser ativado, o 01 original DEVE ser desativado.
- **FR-011**: Ao final de cada execução, o workflow DEVE retornar um sumário com: total de agendamentos encontrados, total criados no Clint, total atualizados, total ignorados (sem `clint_contact_uuid`) e total de erros.

### Key Entities

- **Agendamento (Belle → banco)**: `belle_id`, `cliente_id`, `clint_card_id`,
  `data_hora`, `status`, `nome_profissional`, `nome_sala`, `servicos` (JSONB),
  `hr_consulta`, `dt_agenda`.
- **Card Clint (deal)**: criado com `contact_id` (clint_contact_uuid da paciente),
  `origin_id` (ODARA Aquisição TESTE), `stage_id` (etapa conforme status),
  campos customizados de data e profissional.
- **Mapeamento de status**:

  | Status Belle   | Etapa Clint                  | stage_id                               |
  |----------------|------------------------------|----------------------------------------|
  | Marcado        | Avaliação Agendada           | `711be8cc-a0cb-4bcb-ae40-428f1ad47873` |
  | Cancelado      | Reagendar                    | `455aafb0-8fef-45d6-beb4-41888cc7d18a` |
  | Atendido       | Consulta Realizada           | `f09cdbdb-fb8e-4f04-b5f8-4a20a8de3341` |

  *Nota: "Aguardando Confirmação" é gerenciada pelo workflow 02a (Fase 2) ao
  enviar a notificação — não por este workflow.*

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um agendamento criado na Belle aparece como card no Clint dentro
  de 5 minutos após a próxima execução do workflow.
- **SC-002**: 100% dos agendamentos com `clint_contact_uuid` preenchido e
  dentro da janela de datas são sincronizados sem intervenção manual.
- **SC-003**: Mudanças de status na Belle são refletidas no Clint na execução
  seguinte (máximo 5 minutos de defasagem).
- **SC-004**: O workflow não gera cards duplicados — cada `belle_id` de
  agendamento corresponde a exatamente um card no Clint.
- **SC-005**: A equipe consegue ver agendamentos do dia diretamente no Clint
  sem precisar abrir a Belle.

---

## Clarifications

### Session 2026-05-28

- Q: Qual etapa Clint usar para agendamentos com status "Marcado"? → A: Sempre "Avaliação Agendada". A etapa "Aguardando Confirmação" é responsabilidade do workflow 02a (Fase 2), não deste workflow.
- Q: Com que frequência o workflow deve rodar? → A: 4 vezes ao dia — 07:30, 13:00, 16:00 e 20:00. A Belle é fonte de verdade e o importante é tudo estar atualizado ao longo do dia sem estressar a API.
- Q: Qual a janela de datas para buscar agendamentos na Belle? → A: 2 dias para trás + 30 dias para frente. Padrão profissional de polling com margem de recuperação para falhas.
- Q: Comportamento quando o Clint retorna 5xx ou timeout? → A: Interromper a execução atual e tentar na próxima rodada. Sem retry imediato — a janela de 2 dias garante que nenhum agendamento se perde.
- Q: Registrar agendamentos ignorados (sem clint_contact_uuid)? → A: Sumário no final da execução (contagem de processados / criados / atualizados / ignorados / erros). Padrão ETL profissional, sem escrita extra no banco.

---

## Assumptions

- Pacientes que não têm `clint_contact_uuid` já passaram pelo WF-B ou foram
  cadastradas manualmente no Clint — estão fora do escopo deste workflow.
- O funil a usar é "ODARA | Aquisição TESTE" (`origin_id: 58d30a69-...`) com
  as etapas mapeadas em FR-007.
- O workflow 01 original continua rodando em paralelo durante o desenvolvimento
  e é desativado somente após o 01 v2 ser validado em produção.
- A janela de datas é: agendamentos com `data_hora` entre 2 dias atrás e
  30 dias à frente — padrão profissional com margem de recuperação para falhas.
- O campo `clint_card_id` na tabela `agendamentos` já existe no schema (UUID).
