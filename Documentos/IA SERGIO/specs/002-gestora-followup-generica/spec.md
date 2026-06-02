# Feature Specification: Gestora de Qualificação Genérica — Análise de Conversas e Follow-up Imediato

**Feature Branch**: `002-gestora-followup-generica`

**Created**: 2026-06-02

**Status**: Draft

---

## Overview

Um prompt de IA que atua como gestora comercial sênior — primeiro elo de uma cadeia de dois prompts em sequência.

**Cadeia de execução:**
1. **Gestora (este prompt)**: recebe o histórico de conversa, analisa, decide o status e a etapa atual do lead, e retorna saída estruturada.
2. **Anna Follow-up (prompt downstream)**: lê a decisão da gestora e gera apenas o texto da mensagem para enviar ao lead no WhatsApp.

A gestora é o motor de decisão: nunca gera texto final para o lead, nunca recomenda aguardar, sempre retorna uma das quatro opções de saída com ação imediata definida. O que muda entre produtos é o que a Anna já disse na conversa — a gestora infere tudo a partir do histórico.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Gestora analisa conversa e determina próxima mensagem de qualificação (Priority: P1)

Um operador cola o histórico de conversa entre a Anna e um lead. O lead confirmou disponibilidade na etapa 1, mas ainda não respondeu à pergunta de engajamento (etapa 2). A gestora deve identificar onde o fluxo parou e retornar a próxima mensagem pronta para envio imediato.

**Why this priority**: É o uso mais frequente — a maioria dos leads trava entre etapas intermediárias.

**Independent Test**: Com uma conversa de 3 turnos onde etapa 1 está completa e etapa 2 pendente, a gestora deve retornar `STATUS: EM QUALIFICAÇÃO` com mensagem de etapa 2.

**Acceptance Scenarios**:

1. **Given** uma conversa onde etapa 1 foi concluída e etapa 2 está sem resposta, **When** a gestora analisa, **Then** retorna `STATUS: EM QUALIFICAÇÃO`, lista etapas concluídas, e inclui mensagem pronta para a próxima etapa.
2. **Given** um lead que respondeu de forma neutra ("ok", "entendi") sem confirmar interesse, **When** a gestora analisa, **Then** não desqualifica e continua o fluxo de qualificação.
3. **Given** uma conversa com etapa faltando, **When** a resposta é gerada, **Then** nunca contém palavras como "aguardar", "esperar" ou "monitorar".
4. **Given** um histórico vazio ou com apenas a primeira mensagem do lead sem nenhuma pergunta de qualificação feita pela Anna, **When** a gestora analisa, **Then** retorna `STATUS: EM QUALIFICAÇÃO` com a primeira mensagem de abertura do fluxo pronta para envio.

---

### User Story 2 — Gestora desqualifica lead com critério automático (Priority: P2)

O lead deixou claro que não pode comparecer nas datas do evento, ou declarou desinteresse explícito, ou tem perfil inadequado. A gestora deve identificar o critério desqualificante e retornar mensagem de encerramento educado pronta para envio.

**Why this priority**: Evita que o atendente desperdice tempo com leads sem potencial.

**Independent Test**: Com uma conversa onde o lead disse "não posso nessas datas", a gestora deve retornar `STATUS: LEAD DESQUALIFICADO` com mensagem de encerramento.

**Acceptance Scenarios**:

1. **Given** lead que declarou indisponibilidade de datas, **When** a gestora analisa, **Then** retorna `STATUS: LEAD DESQUALIFICADO` com `CRITÉRIO DESQUALIFICANTE: Indisponibilidade de datas`.
2. **Given** lead que disse "não tenho interesse" ou "pode me tirar da lista", **When** a gestora analisa, **Then** retorna `STATUS: LEAD DESQUALIFICADO` com mensagem de encerramento sem pressão.
3. **Given** lead que afirma que o investimento está completamente fora da realidade sem margem de conversa, **When** a gestora analisa, **Then** desqualifica com `CRITÉRIO: Objeção de valor desqualificante`.

---

### User Story 3 — Gestora identifica lead de alta performance e escala para humano (Priority: P2)

O lead demonstra indicadores de alto volume de negócios, experiência prévia no nicho, ou faz perguntas técnicas e estratégicas que o fluxo automatizado não consegue responder com qualidade. A gestora escala imediatamente para atendimento humano.

**Why this priority**: "Big Fish" perdido por atendimento frio é custo alto de conversão.

**Independent Test**: Com uma conversa onde o lead menciona equipe própria ou participação em imersões similares, a gestora deve retornar `STATUS: ATENDIMENTO HUMANO` com classificação `Big Fish`.

**Acceptance Scenarios**:

1. **Given** lead que menciona alto volume de vendas ou equipe própria, **When** a gestora analisa, **Then** retorna `STATUS: ENCAMINHAR PARA ATENDIMENTO HUMANO` com `CLASSIFICAÇÃO: Big Fish`.
2. **Given** lead que pergunta sobre desconto ou condição especial após qualificação positiva, **When** a gestora analisa, **Then** retorna `STATUS: ENCAMINHAR PARA ATENDIMENTO HUMANO` com `CLASSIFICAÇÃO: Objeção Estratégica`.
3. **Given** lead que pede para ligar ou falar por áudio, **When** a gestora analisa, **Then** escala para humano com urgência alta.

---

### User Story 4 — Gestora detecta lead qualificado travado no pagamento e gera follow-up de conversão (Priority: P3)

O lead passou por todas as etapas de qualificação, recebeu o link de pagamento, mas não completou a compra. A gestora gera mensagem de follow-up estratégico para destravar a conversão.

**Why this priority**: É a etapa de maior valor monetário, mas o lead já qualificado não exige nova qualificação.

**Independent Test**: Com conversa onde todas as etapas foram concluídas e o lead recebeu link há mais de 2h sem resposta, a gestora deve retornar `STATUS: FOLLOW-UP ESTRATÉGICO` com mensagem de cobrança leve.

**Acceptance Scenarios**:

1. **Given** lead qualificado que recebeu link e não pagou, **When** a gestora analisa, **Then** retorna `STATUS: FOLLOW-UP ESTRATÉGICO` com mensagem objetiva para destravar.
2. **Given** lead que escolheu formato de pagamento mas não clicou no link, **When** a gestora analisa, **Then** mensagem de follow-up confirma o formato escolhido e pede ação no link.
3. **Given** lead qualificado que pediu para "pensar", **When** a gestora analisa, **Then** retorna follow-up sem pressão, com gatilho de urgência genuíno se configurado.

---

## Functional Requirements *(mandatory)*

### FR-001 — Motor de decisão sempre resulta em ação

A análise da gestora deve sempre terminar em uma das quatro opções de saída. Nenhuma análise pode terminar sem ação concreta definida.

**Acceptance Criteria**:
- A saída nunca contém variações de "aguardar", "esperar", "monitorar" ou "verificar depois".
- Toda saída inclui `PRAZO: IMEDIATO` ou prazo específico (ex: `2h`, `24h`).
- Toda saída inclui `MENSAGEM SUGERIDA` pronta para copiar e enviar.

---

### FR-002 — Quatro formatos de saída padronizados

O prompt opera com quatro e apenas quatro formatos de saída estruturados:

1. **FOLLOW-UP ESTRATÉGICO** — lead qualificado, destravar pagamento.
2. **LEAD DESQUALIFICADO** — critério automático atingido, encerrar com educação.
3. **EM QUALIFICAÇÃO** — etapa pendente, fazer próxima pergunta agora.
4. **ENCAMINHAR PARA ATENDIMENTO HUMANO** — complexidade ou perfil exige toque humano.

**Acceptance Criteria**:
- Cada formato possui campos obrigatórios definidos (status, mensagem sugerida, prazo, motivo/etapa).
- O formato é selecionado pela lógica de decisão em sequência de passos, não por julgamento livre.

---

### FR-003 — Lógica de decisão em sequência de passos

A gestora segue uma cadeia de decisão fixada:

1. Verificar resposta sobre critério primário (ex: datas, disponibilidade, perfil).
2. Verificar engajamento na proposta de valor.
3. Verificar confirmação de fit ou interesse.
4. Verificar necessidade de escalada para humano.
5. Verificar status de pagamento/conversão.

Cada passo tem desvio explícito para uma das quatro opções de saída.

**Acceptance Criteria**:
- O passo 1 é sempre o primeiro avaliado.
- Um passo não resolvido retorna `EM QUALIFICAÇÃO` com a pergunta desse passo.
- A sequência não é pulada nem reordenada.

---

### FR-004 — Critérios de desqualificação inferidos da conversa

O prompt identifica critérios desqualificantes a partir do que o lead respondeu no histórico — sem configuração externa. Padrões universais de desqualificação (indisponibilidade de datas, desinteresse declarado, perfil inadequado, objeção de valor sem margem de negociação) são parte do motor de decisão. Critérios específicos do produto (ex: uma data concreta) são inferidos do que a Anna comunicou na conversa.

**Acceptance Criteria**:
- A gestora identifica a data ou condição mencionada pela Anna no histórico e verifica se o lead confirmou ou recusou.
- O lead é desqualificado na primeira etapa em que o critério for identificado, sem exigir configuração externa.
- A mensagem de desqualificação é educada, sem julgamento, e não tenta reverter.

---

### FR-005 — Identificação de "Big Fish" e escalada prioritária

Indicadores de alta performance do lead (volume de vendas declarado, experiência prévia em imersões, equipe própria, menção a incorporadoras parceiras) acionam escalada imediata para humano antes do fim do fluxo de qualificação.

**Acceptance Criteria**:
- O briefing para o vendedor humano inclui contexto completo da conversa, sinal de performance identificado e argumento prioritário para fechamento.
- A urgência é classificada como Alta.
- O atendente automatizado não tenta responder dúvidas técnicas ou estratégicas desse perfil.

---

### FR-006 — Mensagem sugerida sempre pronta para copiar e enviar

Toda saída inclui um campo `MENSAGEM SUGERIDA PARA ANNA` (ou nome do atendente configurado) com texto completo, natural e no tom consultivo do projeto — nunca listas numeradas de opções para o lead escolher.

**Acceptance Criteria**:
- A mensagem sugerida está no campo de saída de todas as quatro opções.
- A mensagem não contém listas numeradas nem formatação robótica.
- A mensagem está no tom definido para o produto (consultivo, elegante, direto).

---

### FR-007 — Autovalidação obrigatória antes de gerar resposta

Antes de finalizar a saída, o prompt executa internamente três perguntas de validação:

1. Minha resposta contém uma ação para fazer agora?
2. Usei alguma variação de "aguardar/esperar/monitorar"?
3. Especifiquei prazo (IMEDIATO ou tempo específico)?

Se qualquer validação falhar, a resposta é reformulada internamente antes de ser exibida.

**Acceptance Criteria**:
- Nenhuma resposta chega ao operador sem passar pelas três validações.
- A validação é implícita (não precisa aparecer na saída, mas garante a qualidade).

---

## Success Criteria *(mandatory)*

- **SC-001**: 100% das análises terminam com uma das quatro opções de saída — zero respostas abertas ou inconclusivas.
- **SC-002**: Nenhuma mensagem sugerida contém variação de "aguardar", "esperar" ou "monitorar".
- **SC-003**: Toda saída inclui mensagem pronta para envio imediato sem edição obrigatória.
- **SC-004**: O operador consegue usar a saída da gestora sem interpretação adicional — copiar e colar é suficiente.
- **SC-005**: O prompt é agnóstico ao produto — funciona para eventos, programas, cursos ou qualquer oferta com fluxo de qualificação em etapas.

---

## Key Entities

| Entidade | Descrição |
|---|---|
| **Lead** | Profissional que preencheu formulário e está em conversa com o atendente |
| **Atendente (Anna)** | IA ou humano que conduz a conversa com o lead no WhatsApp |
| **Gestora** | Este prompt — analisa a conversa e determina a próxima ação |
| **Etapa de Qualificação** | Passo do funil com pergunta e critério de avanço ou desvio |
| **Critério Desqualificante** | Condição que encerra o fluxo imediatamente sem tentar reverter |
| **Big Fish** | Lead de alta performance que requer atendimento humano imediato |
| **Operador** | Quem configura e usa o prompt (time comercial, automação n8n, etc.) |

---

## Clarifications

### Session 2026-06-02

- Q: Como o histórico de conversa é entregue à gestora? → A: JSON array com campo `messages` (string serializada) contendo objetos `{"type":"human"|"ai","content":"..."}`. O objeto `human` inclui metadados injetados pelo n8n (data atual, nome, lead_id) prefixados no `content` antes da mensagem real do usuário.
- Q: Como o operador injeta o contexto específico do produto na gestora? → A: Não injeta. O prompt é autocontido — a gestora infere etapas, preços, datas e critérios diretamente do histórico da conversa. O que a Anna já comunicou ao lead (preços, datas, perguntas) está visível nas mensagens e serve como contexto suficiente.
- Q: O que a gestora faz quando o histórico é insuficiente para tomar uma decisão? → A: Assume que o lead está na etapa 1 e retorna `STATUS: EM QUALIFICAÇÃO` com a primeira mensagem de qualificação do fluxo pronta para envio imediato.
- Q: O que a gestora faz quando o lead contradiz uma resposta anterior (ex: confirmou datas mas depois menciona conflito)? → A: Usa a resposta mais recente como válida, reavalia o status do lead e age conforme o novo cenário — pode resultar em desqualificação ou escalada para humano.
- Q: Quem consome a saída da gestora primariamente? → A: Outro prompt (Anna Follow-up). A gestora decide status e etapa; a Anna Follow-up lê essa decisão e gera apenas o texto da mensagem para o WhatsApp. São dois prompts em sequência: gestora = motor de decisão, Anna = motor de linguagem.

---

## Assumptions

- O histórico de conversa é entregue via JSON array no formato `[{"messages": "<stringified JSON array>"}]`, onde cada item do array interno tem `type` ("human" ou "ai") e `content`. Metadados como data atual, nome do usuário e `lead_id` chegam concatenados no `content` das mensagens humanas, prefixados pelo n8n antes da mensagem real.
- O prompt é autocontido: a gestora não recebe contexto externo do produto. Ela infere etapas do funil, critérios de qualificação, preços, datas e sinais de interesse diretamente do que o atendente (Anna) já comunicou na conversa.
- O operador não precisa configurar nem injetar nada além do histórico de conversa — o prompt funciona para qualquer produto cujo atendente siga um fluxo consultivo de qualificação.
- O atendente automatizado (Anna) já conduziu a conversa conforme o fluxo do produto; a gestora só analisa e recomenda.
- A saída da gestora é consumida pelo prompt Anna Follow-up, que lê o `STATUS` e a `ETAPA ATUAL` para selecionar o roteiro e gerar o texto da mensagem. O campo `MENSAGEM SUGERIDA` na saída da gestora é orientativo — quem gera o texto final é a Anna Follow-up.
- O n8n orquestra a sequência: recebe o histórico → envia à gestora → passa a saída para a Anna Follow-up → envia a mensagem gerada ao WhatsApp.

---

## Edge Cases

- **Histórico vazio ou conversa inicial**: A gestora assume etapa 1 pendente e retorna a primeira mensagem do fluxo.
- **Lead contradiz resposta anterior**: A gestora usa sempre a resposta mais recente como válida, reavalia o status e age conforme o novo cenário. A resposta anterior é desconsiderada.
- **Lead neutro após objeção** ("ok", "certo", "entendi"): Não é desqualificação — a gestora continua o fluxo de qualificação.
- **Lead de alta performance (Big Fish)**: Qualquer sinal de volume alto, equipe própria ou experiência prévia em imersões aciona escalada imediata para humano, mesmo que ainda não tenha passado por todas as etapas.

---

## Out of Scope

- Configuração automática das etapas de qualificação (o operador define).
- Integração direta com WhatsApp, CRM ou agenda (isso é responsabilidade da automação que consome a saída).
- Geração do texto final da mensagem para o lead — isso é responsabilidade exclusiva da Anna Follow-up.
- Lógica de linguagem, tom ou adaptação de scripts — a gestora decide o status, a Anna escreve.
- Memória persistente entre conversas (cada análise é stateless).
