# Feature Specification: Módulo de Inteligência e Visualização (Player Sincronizado + Contradições)

**Feature Branch**: `002-intelligent-visualization`
**Created**: 2026-04-17
**Status**: Ready for Clarification
**TranscreveAdv Module**: Intelligence & Visualization

## User Scenarios & Testing *(mandatory)*

### User Story 1: Player Sincronizado com Transcrição (Priority: P1)

Usuário visualiza transcrição do lado e vídeo do outro; ao clicar em qualquer palavra/trecho no texto, vídeo pula para exatamente aquele timestamp.

**Why this priority**: P1—core differential feature. Defines the entire UI paradigm; without this, viewing experience is degraded.

**Independent Test**: User clicks on a word in transcript; video seeks to exact moment; highlight persists on word during playback.

**Acceptance Scenarios**:

1. **Given** transcrição carregada com 100+ trechos mapeados a timestamps, **When** usuário clica em palavra específica, **Then** vídeo salta para timestamp (latência ≤300ms) e trecho recebe highlight visual
2. **Given** vídeo em reprodução automática, **When** trechos de transcrição aparecem na tela, **Then** destaque visual sincroniza em tempo real com áudio/vídeo
3. **Given** usuário clica em múltiplas palavras rapidamente, **When** vídeo salta entre timestamps, **Then** cada salto é preciso (±100ms tolerance)

---

### User Story 2: Identificação & Renomeação de Falantes (Priority: P1)

Sistema identifica automaticamente falantes distintos (Pessoa A, Pessoa B, etc.); usuário renomeia para nomes reais (Juiz, Testemunha, Réu, etc.).

**Why this priority**: P1—legal context requires speaker identification. Ambiguity causes misinterpretation of evidence.

**Independent Test**: AI identifies speaker; user renames; renaming propagates to all future references in transcript and chat.

**Acceptance Scenarios**:

1. **Given** transcrição processada com 3 falantes identificados como "Pessoa A", "Pessoa B", "Pessoa C", **When** usuário clica em "Pessoa A" para renomear, **Then** campo de input aparece com sugestão "Juiz" (baseado em contexto de primeiras palavras)
2. **Given** novo nome "Juiz" fornecido, **When** usuário pressiona Enter ou clica Confirmar (em 2 cliques ou menos), **Then** nome é salvo e todas referências mudam: "Pessoa A" → "Juiz" em toda transcrição
3. **Given** nome atualizado, **When** usuário interage com Chat (IA), **Then** respostas da IA referem-se a falantes pelo nome novo (não "Pessoa A")

---

### User Story 3: Chat com Arquivo & Análise Semântica (Priority: P2)

Usuário faz perguntas em linguagem natural sobre conteúdo (ex: "Houve alguma confissão?", "O depoimento foi consistente?"). Sistema responde com citações dinâmicas.

**Why this priority**: P2—adds intelligence layer but not required for basic viewing. Viewing + speaker ID are MVP.

**Independent Test**: User asks question; system returns answer with linked citations; clicking citation highlights transcript and seeks video.

**Acceptance Scenarios**:

1. **Given** transcrição carregada, **When** usuário digita pergunta no chat (ex: "Qual é a alegação principal?"), **Then** sistema processa pergunta via IA e retorna resposta em ≤5 segundos
2. **Given** resposta gerada, **When** resposta inclui citações (links em azul), **Then** clicando citação destaca trecho correspondente no texto e posiciona vídeo no início daquele trecho
3. **Given** usuário edita transcrição, **When** edição significativa é salva (alteração em >50 caracteres de um segmento, conforme FR-005), **Then** sistema exibe aviso: "Chat pode estar baseado em versão anterior. Deseja reanalisar?"

---

### User Story 4: Detector de Contradições (Priority: P2)

Usuário clica botão "Detectar Contradições" e IA lista automaticamente trechos onde depoimento foi inconsistente com análise semântica profunda.

**Why this priority**: P2—key differentiator but relies on Story 3 (Chat/IA). Implemented after core viewing works.

**Independent Test**: User clicks "Detect Contradictions"; system lists inconsistencies with linked citations; each citation links to both conflicting segments.

**Acceptance Scenarios**:

1. **Given** transcrição processada com múltiplos falantes, **When** usuário clica "Detectar Contradições", **Then** sistema analisa conteúdo e retorna lista (ex: 3 contradições encontradas) em ≤10 segundos
2. **Given** lista de contradições exibida, **When** cada contradição exibe 2 links (1º trecho + 2º trecho), **Then** clicando 1º link posiciona vídeo e destaca primeiro trecho conflitante
3. **Given** contradição listada, **When** clicando no 2º link, **Then** vídeo salta para segundo trecho e ambos permanecem destacados para comparação visual

---

### Edge Cases

- **Vídeo expirado (7 dias)**: Transcrição permanece visível; aviso exibido "Vídeo removido conforme retenção"; Chat e Player desabilitados mas análise anterior permanece
- **Edição durante processamento de IA**: Aviso exibido ao usuário: "Uma análise está em progresso. Editar pode invalidar resultados." Permite editar mas marca resultados como obsoletos
- **Sobreposição de falantes**: Sistema prioriza locutor dominante mas permite usuário dividir bloco manualmente para correção
- **Arquivo muito longo (>4 horas)**: Transcrição carrega em partes; primeiros 30 minutos imediatos; resto carrega assincronamente
- **Mudança de nome de falante durante reprodução**: Nomes atualizados em tempo real na transcrição; não interrompe vídeo

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE mapear cada palavra/token na transcrição a um intervalo exato de tempo [start_ms, end_ms] no vídeo com precisão ±100ms
- **FR-002**: Sistema DEVE sincronizar vídeo com clique em transcrição com latência ≤300ms
- **FR-003**: Sistema DEVE persistir identificação automática de falantes e permitir renomeação com propagação global a todos blocos de fala correspondentes
- **FR-004**: Sistema DEVE manter chat isolado por arquivo (chat de um arquivo NÃO tem acesso a dados de outro arquivo do usuário)
- **FR-005**: Sistema DEVE recarregar contexto de IA sempre que transcrição é editada significativamente (alteração em >50 caracteres de um segmento)
- **FR-006**: Sistema DEVE gerar relatório de contradições com referências aos identificadores dos segmentos de transcrição e timestamps
- **FR-007**: Sistema DEVE exibir citações dinâmicas com links clicáveis que navegam para fragmentos específicos da transcrição

### Key Entities

- **TranscriptSegment**: ID, jobId (FK → ProcessingJob), start_time_ms, end_time_ms, speaker_id, sequence_index, original_content, edited_content, word_timestamps (JSON array de {word, start_ms, end_ms}); armazenado como tabela Prisma normalizada, um row por segmento
- **SpeakerProfile**: ID, jobId (FK → ProcessingJob), suggested_name, display_name (editado pelo usuário), is_renamed (boolean), created_at
- **ChatMessage**: ID, jobId (FK → ProcessingJob), user_id, role (user/assistant), content, cited_segments (array de IDs de segmentos), created_at
- **InconsistencyReport**: ID, jobId (FK → ProcessingJob), description, primary_segment_id, conflicting_segment_id, confidence_score, created_at

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Latência entre clique no texto e atualização do vídeo ≤300ms (95th percentile)
- **SC-002**: 100% de respostas do Chat referenciam trechos reais existentes na versão atual da transcrição (zero hallucinations)
- **SC-003**: Usuário consegue renomear um falante em menos de 2 cliques
- **SC-004**: Detector de contradições identifica ≥80% de inconsistências reais vs. baseline jurídico (validação manual)
- **SC-005**: 95% das citações dinâmicas levam ao trecho correto quando clicadas (±200ms de precisão)

## Clarifications

### Session 2026-04-18

- Q: Como deve ser armazenada a transcrição estruturada com timestamps por palavra? → A: Tabela `TranscriptSegment` normalizada no banco (um row por segmento com array `word_timestamps`)
- Q: Como tratar identificação de falantes no MVP dado que Groq Whisper não faz diarização? → A: MVP manual — segmentos sem falante por padrão; usuário clica em segmento e atribui nome livremente
- Q: Qual LLM usar para Chat e Detector de Contradições? → A: Groq `llama-3.3-70b-versatile` (gratuito no tier atual, 128k contexto, já integrado via groq-sdk)

## Assumptions

- Transcrição já foi gerada com sucesso pelo módulo anterior (Upload & Queue)
- Word-level timestamps incluídos na transcrição (fornecido pelo provedor de transcrição)
- Chat e Detector de Contradições utilizam Groq `llama-3.3-70b-versatile` (128k tokens, gratuito no tier atual, SDK já integrado)
- Player de vídeo expõe interface de controle de posição (seek) acessível pelo sistema
- Usuário mantém aba aberta durante análise de IA (single-tab session assumption)
- Identificação de falantes no MVP é manual: segmentos não têm falante por padrão; usuário atribui nomes clicando em segmentos. Diarização automática (AssemblyAI, pyannote) é fora de escopo para este módulo.
