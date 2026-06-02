# Feature Specification: Workflow de Follow-up Automático (Sergio — Novo Schema)

**Feature Branch**: `001-followup-sergio-novo-schema`

**Created**: 2026-06-01

**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registro de etapa e disparo no Clint para lead novo (Priority: P1)

Um contato entra pela primeira vez em uma etapa do funil (ex: "Base"). O workflow detecta que não há histórico para esse contato nessa etapa, registra a mudança no banco e dispara o webhook do Clint para que a régua de comunicação seja ativada.

**Why this priority**: É o caso de uso principal — sem isso, o follow-up não funciona para nenhum lead novo.

**Independent Test**: Acionar o workflow com um `contact_id` sem histórico e `etapa_funil = "Base"` deve resultar em uma linha nova em `followup_historico`, uma linha nova (ou atualizada) em `followup_status_atual` e uma chamada POST confirmada para o webhook do Clint de Base.

**Acceptance Scenarios**:

1. **Given** um contato sem nenhum registro em `followup_historico`, **When** o workflow é chamado com `etapa_funil = "Base"`, **Then** o contato é inserido em `followup_historico` com `etapa_nova = "Base"` e `etapa_anterior = null`, e `followup_status_atual` é criado com `etapa_nome = "Base"`.
2. **Given** o mesmo contato do cenário anterior, **When** o registro é feito com sucesso, **Then** o webhook do Clint (endpoint Base) recebe um POST com nome, email, telefone e etapa_funil do contato.

---

### User Story 2 — Proteção contra reenvio dentro do threshold (Priority: P1)

Um contato já passou pela etapa "Em Contato" há 5 dias. O workflow é chamado novamente para a mesma etapa. Como ainda estão dentro da janela de 10 dias, nenhuma ação deve ser tomada — sem novo registro no histórico e sem disparo ao Clint.

**Why this priority**: Evitar spam para o lead e duplicação de dados no banco.

**Independent Test**: Chamar o workflow duas vezes consecutivas (com menos de 10 dias de intervalo) para o mesmo contato e etapa deve resultar em apenas um registro em `followup_historico` e apenas um disparo ao Clint.

**Acceptance Scenarios**:

1. **Given** um contato com último registro em `followup_historico` para a etapa "Em Contato" há 5 dias, **When** o workflow é chamado novamente com `etapa_funil = "Em Contato"`, **Then** nenhuma nova linha é inserida em `followup_historico` e nenhum webhook é disparado.
2. **Given** o mesmo contato, mas o último registro foi há 11 dias, **When** o workflow é chamado com `etapa_funil = "Em Contato"`, **Then** um novo registro é inserido e o webhook é disparado.

---

### User Story 3 — Proteção de regressão de etapa (Priority: P2)

Um contato já está em "Negociação Quente" no `followup_status_atual`. O workflow é chamado com `etapa_funil = "Dia 1"`. O `followup_status_atual` não deve ser rebaixado — deve permanecer em "Negociação Quente". O histórico pode ser registrado, mas o status atual não regride.

**Why this priority**: Garantir integridade do funil — leads que chegaram a etapas avançadas não voltam para etapas iniciais por erro de sincronização.

**Independent Test**: Chamar o workflow com uma etapa inferior para um contato que já está em "Negociação Quente" deve manter o `followup_status_atual.etapa_nome = "Negociação Quente"`.

**Acceptance Scenarios**:

1. **Given** um contato com `followup_status_atual.etapa_nome = "Negociação Quente"`, **When** o workflow é chamado com `etapa_funil = "Dia 1"`, **Then** `followup_status_atual` permanece com `etapa_nome = "Negociação Quente"`.
2. **Given** um contato com `followup_status_atual.etapa_nome = "Negociação Fria"`, **When** o workflow é chamado com `etapa_funil = "Base"`, **Then** `followup_status_atual` permanece com `etapa_nome = "Negociação Fria"`.

---

### User Story 4 — Rotamento correto por etapa e webhook correspondente (Priority: P2)

O workflow recebe diferentes valores de `etapa_funil` e dispara o webhook correto do Clint para cada um: o endpoint exclusivo de "Base" para a etapa Base, e o endpoint padrão para todas as demais etapas.

**Why this priority**: Garante que cada etapa aciona a automação correta dentro do Clint.

**Acceptance Scenarios**:

1. **Given** `etapa_funil = "Base"`, **When** o workflow executa o disparo, **Then** o POST é enviado para o endpoint `444d0784-...` (Base).
2. **Given** `etapa_funil = "Negociação Quente"`, **When** o workflow executa o disparo, **Then** o POST é enviado para o endpoint `8d91a27e-...` (padrão).

---

### Edge Cases

- O que acontece se o `contact_id` não existir na tabela `contacts`? → O workflow deve terminar sem erros (NoOp), sem registros no banco e sem disparos ao Clint.
- O que acontece se `followup_status_atual` não tiver registro para o contato? → O UPSERT cria a linha; `etapa_anterior` no histórico é inserido como `null`.
- O que acontece se o banco estiver indisponível durante o registro? → O n8n retorna erro na execução; nenhuma ação parcial persiste.
- O que acontece se o Clint retornar erro no webhook? → O workflow registra o erro na execução do n8n; o registro no banco já foi feito.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O workflow DEVE aceitar `contact_id`, `etapa_funil` e `organization_id` como inputs obrigatórios via trigger.
- **FR-002**: O workflow DEVE buscar os dados do contato (nome, email, phone) na tabela `contacts` usando `contact_id` e `organization_id`.
- **FR-003**: O workflow DEVE verificar o `followup_status_atual` do contato antes de qualquer ação, para uso na lógica de proteção de regressão e para registrar `etapa_anterior` no histórico.
- **FR-004**: O workflow DEVE direcionar o fluxo por um Switch com 7 saídas, uma para cada valor possível de `etapa_funil`: Base, Em Contato, Dia 1, Dia 2, Dia 3, Negociação Fria, Negociação Quente.
- **FR-005**: Para cada etapa, o workflow DEVE consultar `followup_historico` para determinar quantos dias se passaram desde o último registro daquele contato naquela etapa.
- **FR-006**: O workflow DEVE prosseguir com o registro apenas se `dias_desde_criacao >= 10` ou se não houver nenhum registro anterior (null).
- **FR-007**: O workflow DEVE inserir uma linha em `followup_historico` com: `organization_id`, `contact_id`, `etapa_anterior` (etapa atual do `followup_status_atual`, pode ser null), `etapa_nova` (etapa recebida), `motivo = 'followup_automatico'`.
- **FR-008**: O workflow DEVE executar UPSERT em `followup_status_atual` atualizando `etapa_nome`, `ultima_acao_em` e `updated_at`, COM proteção de regressão: a atualização não deve ocorrer se `etapa_nome` atual for `'Negociação Fria'` ou `'Negociação Quente'`.
- **FR-009**: O workflow DEVE disparar um POST ao webhook do Clint com payload: `nome`, `email`, `telefone`, `etapa_funil`.
- **FR-010**: A etapa "Base" DEVE usar o endpoint exclusivo do Clint. Todas as demais etapas DEVEM usar o endpoint padrão.
- **FR-011**: Se o contato não for encontrado em `contacts`, o workflow DEVE encerrar sem erros e sem ações colaterais.

### Key Entities

- **Contact**: Indivíduo com `id`, `organization_id`, `name`, `email`, `phone`. Fonte de verdade para dados de contato.
- **followup_status_atual**: Registro único por contato (`UNIQUE contact_id`). Armazena `etapa_nome`, `ultima_acao_em`, `updated_at`. Representa o estágio atual no funil.
- **followup_historico**: Log append-only. Cada linha representa uma transição de etapa com `etapa_anterior`, `etapa_nova`, `motivo` e `created_at`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos contatos que passam pelo workflow pela primeira vez em uma etapa têm seu registro criado em `followup_historico` e `followup_status_atual`.
- **SC-002**: Zero disparos duplicados ao Clint para o mesmo contato na mesma etapa dentro da janela de 10 dias.
- **SC-003**: Zero regressões de etapa em `followup_status_atual` para contatos já em "Negociação Fria" ou "Negociação Quente".
- **SC-004**: 100% das chamadas ao Clint usam o endpoint correto para a etapa correspondente (Base vs. padrão).
- **SC-005**: O workflow completa a execução em menos de 5 segundos em condições normais de rede e banco.

---

## Assumptions

- O `contact_id` recebido sempre pertence à `organization_id` recebida; não há validação cruzada de segurança além do filtro na query SQL.
- O campo `phone` da tabela `contacts` já está formatado corretamente para envio ao Clint (sem necessidade de transformação).
- O Clint não exige autenticação adicional nos endpoints de webhook além da URL.
- As credenciais do Supabase (`ibm5ISOqJ9w5zJrI`) e do Postgres (`OU8cyzGlL8UbRk7p`) já estão configuradas no n8n e permanecem válidas.
- O campo `ultima_acao_em` em `followup_status_atual` é preenchido com `NOW() - INTERVAL '3 hours'` (ajuste de fuso horário, padrão do projeto antigo).
- A tabela `followup_respostas` é gerenciada por outro workflow e não é tocada por este fluxo.
- A tabela `followup_etapas` não é necessária neste fluxo — os nomes das etapas são usados diretamente como strings (sem lookup de UUID).
