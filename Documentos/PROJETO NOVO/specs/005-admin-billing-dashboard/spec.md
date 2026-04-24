# Feature Specification: Painel Administrativo & Financeiro (Dashboard de Créditos & Checkout)

**Feature Branch**: `005-admin-billing-dashboard`
**Created**: 2026-04-17
**Status**: Ready for Clarification
**TranscreveAdv Module**: Admin & Billing Dashboard

## User Scenarios & Testing *(mandatory)*

### User Story 1: Visualização de Saldo & Histórico (Priority: P1)

Usuário acessa dashboard home e visualiza em painel central: saldo atual em minutos, gráfico de uso (últimos 30 dias), e histórico de transações.

**Why this priority**: P1 (Heart of Dashboard)—users must see balance & spending at a glance to understand costs and plan purchases.

**Independent Test**: User sees balance prominently; graph shows usage trend; transaction history is clickable for details.

**Acceptance Scenarios**:

1. **Given** usuário autenticado com 50 minutos de saldo, **When** acessa home do dashboard, **Then** card proeminente exibe "50 minutos disponíveis" em grande fonte com cor verde
2. **Given** dashboard carregado, **When** gráfico de uso é visualizado, **Then** mostra consumo em barras (últimos 30 dias) com datas no eixo X e minutos no Y
3. **Given** usuário scroll down, **When** visualiza "Histórico de Transações", **Then** lista exibe data, tipo (COMPRA/BLOQUEIO/ESTORNO/CONSUMO com ícone por tipo), quantidade com sinal, saldo resultante com ordenação por data decrescente

---

### User Story 2: Fluxo de Compra com Reserva de Intenção (Priority: P1)

Usuário clica "Comprar Créditos", seleciona plano (ex: 100 min), é redirecionado para checkout, retorna ao dashboard, vê status "Pagamento em Processamento".

**Why this priority**: P1—payment workflow is end-to-end critical; incomplete/unclear status causes lost revenue and support tickets.

**Independent Test**: User initiates purchase; gets redirected to external processor; returns to dashboard; sees pending status; receives notification when confirmed.

**Acceptance Scenarios**:

1. **Given** usuário com saldo baixo, **When** clica "Comprar Créditos", **Then** modal exibe 3 planos: "99 min", "199 min", "499 min" com preços
2. **Given** plano selecionado, **When** clica "Pagar", **Then** usuário é redirecionado para página de checkout com retorno apontando para dashboard
3. **Given** usuário retorna após pagamento (sucesso ou pendência), **When** volta ao dashboard, **Then** banner topo exibe "Pagamento em Processamento - Aguardando confirmação" com timestamp
4. **Given** processador confirma pagamento via webhook, **When** sistema recebe confirmação, **Then** dentro de 30s: saldo atualizado, banner removido, email enviado

---

### User Story 3: Reserva de Créditos (Blocking) (Priority: P1)

Quando usuário inicia processamento de arquivo que consome X minutos, sistema bloqueia X minutos do saldo ANTES de iniciar. Após conclusão, reconcilia (estorna se menos foi usado).

**Why this priority**: P1—prevents overdraft; is financial backbone. Without blocking, users could go negative.

**Independent Test**: User initiates 8-minute task with 10-minute balance; sees balance become "2 available (8 blocked)"; after task, if 7 consumed, gets 1 refund.

**Acceptance Scenarios**:

1. **Given** usuário tem 10 minutos, **When** inicia upload de arquivo estimado em 8 minutos, **Then** saldo display muda: "2 disponíveis (8 bloqueados)" em cor de aviso (amarelo)
2. **Given** processamento em andamento, **When** usuário visualiza dashboard, **Then** saldo bloqueado é exibido com ícone de "em andamento"
3. **Given** processamento conclui em 7 minutos, **When** reconciliação ocorre, **Then** saldo atualizado: "+1 estornado" exibido em notificação toast + email; saldo volta a "3 disponíveis"
4. **Given** processamento falha (erro de IA), **When** status muda para Failed, **Then** créditos bloqueados são TOTALMENTE estornados dentro de 30s

---

### User Story 4: Alertas de Saldo Crítico (Priority: P2)

Sistema envia alertas (email + toast in-app) quando saldo atinge 20% e novamente em 5% do limite mensal.

**Why this priority**: P2—reduces support calls e prompts repurchase. Valuable for retention but not MVP-blocking.

**Independent Test**: User balance drops to 20% threshold; receives email alert; sees in-app notification; can purchase directly from notification.

**Acceptance Scenarios**:

1. **Given** usuária com saldo total de 100 minutos (ex: pacote plan_99 + créditos anteriores), com 20 minutos restantes disponíveis, **When** processamento conclui e saldo muda, **Then** toast notificação exibida: "Aviso: Saldo em 20% (20/100 minutos)" com botão "Comprar"
2. **Given** saldo cai a 5 minutos, **When** novo processamento conclui, **Then** email enviado com assunto "AVISO CRÍTICO: Seu saldo está em 5%" + botão direto para compra
3. **Given** email aviso recebido, **When** usuário clica link, **Then** retorna ao dashboard com modal de checkout pré-aberto

---

### Edge Cases

- **Falha no redirect para checkout**: Usuário perde link; dashboard mantém link "Retomar Pagamento" via status da intenção de pagamento
- **Confirmação de pagamento não recebida em 24h**: Intenção de pagamento expira automaticamente → saldo retorna livre, banner desaparece
- **Saldo insuficiente no início de tarefa**: Antes de iniciar fila, sistema valida saldo; se arquivo > saldo disponível, exibe erro "Saldo insuficiente" e impede início
- **Múltiplos uploads simultâneos (2+ navegadores)**: Bloqueios são atômicos; saldo sempre consistente; ambos navegadores veem saldo atualizado em tempo real
- **Processamento cancelado pelo usuário**: Créditos bloqueados são estornados dentro de 10 segundos

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE exibir dashboard centralizado com: saldo atual, saldo bloqueado, saldo disponível, gráfico de uso últimos 30 dias
- **FR-002**: Sistema DEVE bloquear (reservar) créditos estimados ANTES de qualquer processamento custoso; persistir estado
- **FR-003**: Sistema DEVE reconciliar créditos após conclusão: se consumo real < bloqueado, estornar diferença automaticamente
- **FR-004**: Sistema DEVE validar saldo disponível antes de iniciar processamento; se insuficiente, exibir erro específico e impedir início
- **FR-005**: Sistema DEVE integrar com processador de pagamentos via webhooks para criar intenção de pagamento, confirmar, e atualizar créditos
- **FR-006**: Sistema DEVE enviar alerta email ao atingir 20% e 5% de saldo; inclui link direto para compra
- **FR-007**: Sistema DEVE exibir status da intenção de pagamento (Pendente/Confirmado/Falhou/Expirado) em banner permanente até confirmação
- **FR-008**: Sistema DEVE expirar automaticamente intenções de pagamento não confirmadas após 24h; liberar créditos reservados

### Key Entities

- **Wallet**: ID, user_id, saldo_total, saldo_bloqueado (soma de reservas ativas), saldo_disponível calculado (total - bloqueado), updated_at
- **Transaction**: ID, user_id, type (COMPRA/BLOQUEIO/ESTORNO/CONSUMO), amount_minutes (positivo=crédito; negativo=débito), ref_type (PaymentIntent/ProcessingJob), ref_id, balance_after, created_at
- **PaymentIntent**: ID (do processador de pagamento), user_id, amount_cents, status (Pending/Succeeded/Failed/Expired), minutes_granted, webhook_received_at, created_at, expires_at
- **CreditReservation**: ID, user_id, processing_job_id, reserved_minutes, released_at (quando job conclui), status (Active/Released/Refunded)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Saldo do usuário NUNCA fica negativo; sistema bloqueia qualquer processamento que resultaria em saldo abaixo de zero
- **SC-002**: Tempo entre confirmação de pagamento e atualização de saldo no dashboard ≤30 segundos
- **SC-003**: 99.9% de reservas de créditos são reconciliadas corretamente (nenhum erro de arredondamento)
- **SC-004**: Tempo para usuário completar ciclo compra (seleção → checkout → retorno → crédito visível) ≤5 minutos
- **SC-005**: Redução em 80% de support tickets sobre "Onde está meu crédito" após visibilidade do status de pagamento

---

### User Story 5: Limitação de Trial (Tier Free / Paywall) (Priority: P1)

Usuários sem plano premium têm acesso restrito: visualização e transcrição sincronizada limitadas aos primeiros 10 minutos de cada arquivo. Após esse ponto, um aviso de upgrade é exibido.

**Why this priority**: P1 — regra de negócio core para monetização. Sem paywall, não há incentivo para compra de créditos.

**Independent Test**: Usuário free acessa arquivo de 25 minutos → player e transcrição funcionam normalmente até 10:00 → após 10:00 player para, overlay de upgrade aparece, botão "Ver planos" abre modal de compra.

**Acceptance Scenarios**:

1. **Given** usuário free (saldo = 0 ou sem transação COMPRA registrada), **When** acessa arquivo de duração > 10 min, **Then** player e transcrição funcionam normalmente até 10:00
2. **Given** usuário free no minuto 9:50, **When** playback atinge 10:00, **Then** player pausa automaticamente e overlay semitransparente cobre a transcrição após o décimo minuto com mensagem: "Limite de Trial atingido. Faça upgrade para acessar a transcrição completa."
3. **Given** overlay ativo, **When** usuário clica "Ver planos", **Then** modal de compra de créditos (PurchaseModal) abre com planos disponíveis
4. **Given** usuário premium (tem saldo > 0 ou transação COMPRA), **When** acessa qualquer arquivo, **Then** sem restrição de tempo — acesso completo sem overlay

---

### User Story 6: Navegação Global Expandida (Priority: P2)

Sidebar inclui acesso direto a "Meu Perfil" (billing/dashboard) e "Biblioteca de Prompts".

**Acceptance Scenarios**:

1. **Given** qualquer página com sidebar, **When** usuário clica "Meu Perfil", **Then** navega para `/dashboard` (módulo 005 — saldo, planos, histórico)
2. **Given** qualquer página com sidebar, **When** usuário clica "Biblioteca de Prompts", **Then** navega para `/biblioteca` (módulo 004 — templates e prompts personalizados)

---

### Functional Requirements (adicionados)

- **FR-009**: Sistema DEVE determinar tier do usuário no carregamento do viewer: usuário é "premium" se possuir ao menos uma transação do tipo `COMPRA` registrada no banco; caso contrário, tier = "free"
- **FR-010**: Sistema DEVE bloquear playback e ocultar transcrição após os primeiros 10 minutos (600.000ms) para usuários tier free; o bloqueio ocorre via overlay no componente `VideoPlayer` e truncamento da lista de segmentos na `TranscriptPanel`
- **FR-011**: Sistema DEVE exibir overlay de upgrade com botão "Ver planos" que abre `PurchaseModal`; o overlay não pode ser dispensado sem upgrade
- **FR-012**: Sidebar DEVE exibir links para "Meu Perfil" (`/dashboard`) e "Biblioteca de Prompts" (`/biblioteca`) em adição aos links existentes

## Assumptions

- Integração com processador de pagamentos já existe no projeto; webhooks são configuráveis
- Alertas de email usam sistema de fila já existente
- Usuários têm acesso a email verificado (validado durante signup)
- Dashboard é por usuário; administradores têm visão separada (não contemplada nesta spec)
- Método de pagamento primário é cartão de crédito (transferência bancária não coberta na v1)
- Conversão de "minutos de processamento" para "minutos de crédito" é 1:1 (sem multiplicador)
- Créditos são adquiridos em pacotes avulsos (99 min, 199 min, 499 min); não há recorrência mensal nem expiração de saldo por período
