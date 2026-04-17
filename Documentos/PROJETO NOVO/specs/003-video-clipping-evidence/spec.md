# Feature Specification: Módulo de Edição de Provas (Gerador de Clipes de Vídeo)

**Feature Branch**: `003-video-clipping-evidence`
**Created**: 2026-04-17
**Status**: Ready for Clarification
**TranscreveAdv Module**: Evidence Clipping & Export

## User Scenarios & Testing *(mandatory)*

### User Story 1: Seleção & Validação de Trecho (Priority: P0)

Usuário seleciona trecho de texto na transcrição (drag-and-select estilo Kindle) e sistema oferece menu flutuante com opção "Gerar Clipe".

**Why this priority**: P0 (Critical)—core value proposition. Ability to extract evidence clips is the primary differentiator vs. simple transcription tools.

**Independent Test**: User selects text; context menu appears; system validates selection duration; user confirms (or cancels).

**Acceptance Scenarios**:

1. **Given** transcrição exibida com vídeo sincronizado, **When** usuário seleciona 5-10 palavras contíguas no texto, **Then** menu flutuante exibe botão "Gerar Clipe"
2. **Given** seleção feita, **When** seleção corresponde a <3 segundos de vídeo, **Then** menu exibe aviso em vermelho: "Seleção muito curta para gerar clipe (mínimo 3s)"
3. **Given** seleção válida (≥3 segundos), **When** usuário clica "Gerar Clipe", **Then** modal de nomeação de clipe abre com campo de input pré-preenchido

---

### User Story 2: Nomeação Inteligente & Confirmação (Priority: P1)

Modal exibe campo de input pré-preenchido com as primeiras 5 palavras do trecho selecionado. Usuário confirma nome sugerido ou edita e salva.

**Why this priority**: P1—UX critical. Intelligent defaults reduce friction; users can confirm in 1 keystroke (Enter).

**Independent Test**: Selection generates modal; default name is auto-populated; user presses Enter without editing to confirm; processing starts.

**Acceptance Scenarios**:

1. **Given** trecho selecionado "O réu confessou o crime no tribunal", **When** modal abre, **Then** campo input pré-preenchido com "O réu confessou o crime"
2. **Given** usuário não edita campo, **When** pressiona Enter ou clica Confirmar, **Then** processamento inicia com nome sugerido
3. **Given** usuário edita nome (ex: "Confissão do Réu - Momento Crítico"), **When** clica Confirmar, **Then** novo nome é registrado e processamento inicia com nome editado

---

### User Story 3: Processamento de Vídeo em Background (Priority: P1)

Após confirmação, sistema coloca rendering de clipe em fila assíncrona. Processamento é independente de navegação do usuário.

**Why this priority**: P1—users expect background processing (standard behavior para ferramentas modernas).

**Independent Test**: Clipe confirmado; user closes browser; rendering continues; notification sent on completion; clipe appears in gallery on return.

**Acceptance Scenarios**:

1. **Given** nome do clipe confirmado, **When** processamento inicia, **Then** status "Gerando clipe..." é exibido por ≤5 segundos antes de desaparecer
2. **Given** renderização em progresso, **When** usuário navega para outra página ou fecha aba, **Then** servidor continua renderizando em background
3. **Given** renderização conclui, **When** status muda para "Pronto", **Then** notificação toast + email enviado ao usuário em ≤2 minutos

---

### User Story 4: Galeria de Clipes & Exportação (Priority: P2)

Usuário acessa aba "Galeria de Recortes" onde vê lista de clipes gerados. Pode fazer download em vídeo, PDF (com transcrição), ou Word.

**Why this priority**: P2—export is nice-to-have; clipping itself is core. Can be implemented iteratively.

**Independent Test**: User navigates to clips gallery; sees list of generated clips; downloads in multiple formats; file integrity validated.

**Acceptance Scenarios**:

1. **Given** usuário acessa Galeria de Recortes, **When** clipes foram gerados, **Then** lista exibe clipes com thumbnail, nome, duração, data criação
2. **Given** clipe na galeria, **When** usuário clica ícone de download, **Then** 3 opções exibidas: Download Vídeo | Baixar PDF | Baixar Word
3. **Given** usuário clica "Download Vídeo", **When** arquivo é gerado, **Then** download inicia com nome do clipe (ex: "Confissão do Réu - Momento Crítico.mp4")
4. **Given** usuário clica "Baixar PDF", **Then** documento inclui: título do clipe, timestamps, transcrição do trecho em texto

---

### Edge Cases

- **Seleção entre múltiplos falantes**: Clipe é gerado contendo ambos falantes; sincronismo de áudio/vídeo/legenda respeitado
- **Falha no encoder de vídeo**: Status muda para "Erro ao gerar"; usuário vê botão "Tentar Novamente"; créditos são estornados
- **Fechamento de aba durante renderização**: Renderização continua; retorno à aba mostra clipe pronto na galeria
- **Exclusão de arquivo original**: Todos clipes vinculados marcados para exclusão em cascata (ou arquivados)
- **Arquivo de vídeo expirado (7 dias)**: Clipes existentes permanecem; novo clipping não é possível; aviso exibido

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE permitir seleção de texto contíguo em transcrição (drag-and-select via interface de usuário)
- **FR-002**: Sistema DEVE calcular intervalo de tempo [start_ms, end_ms] correspondente ao texto selecionado com precisão ±100ms
- **FR-003**: Sistema DEVE validar que seleção corresponde a ≥3.0 segundos de vídeo antes de permitir clipping
- **FR-004**: Sistema DEVE aceitar nomeação de clipe com até 255 caracteres; sugerir primeiras 5 palavras automaticamente
- **FR-005**: Sistema DEVE persistir metadados de clipe (nome, timestamps, informações de falante, transcrição do trecho, status)
- **FR-006**: Sistema DEVE renderizar clipe em formato de vídeo com áudio sincronizado e legenda (opcional) integradas
- **FR-007**: Sistema DEVE suportar exportação em 3 formatos: Vídeo, PDF (com transcrição), Word (com transcrição)
- **FR-008**: Sistema DEVE recuperar elegantemente de falhas de encoding (retry + notificação ao usuário + estorno de créditos)

### Key Entities

- **VideoClip**: ID, file_id, user_id, name, description, start_time_ms, end_time_ms, duration_seconds, status (Pending/Processing/Completed/Failed), file_url, created_at, completed_at
- **EvidenceSource**: ID, user_id, file_name, file_type, duration_minutes, processed_at, expires_at
- **TranscriptSegment**: ID (reutilizado do Módulo 2), file_id, start_time_ms, end_time_ms, speaker_id, content
- **ExportJob**: ID, video_clip_id, export_format (Video/PDF/Word), status (Queued/Processing/Completed/Failed), file_url, created_at

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tempo médio entre confirmação de clipe e notificação "Pronto" ≤2x a duração do clipe gerado (ex: clipe de 30s completa em ≤60s)
- **SC-002**: 100% de clipes gerados mantêm sincronismo entre áudio e legenda (zero audio/video drift)
- **SC-003**: 99.5% de renderizações de vídeo completam com sucesso (falha rate <0.5%)
- **SC-004**: Usuário consegue selecionar trecho, confirmar nome, e receber clipe em ≤5 minutos (end-to-end)
- **SC-005**: Downloads de arquivo completam em menos de 30 segundos para clipes ≤5 minutos de duração

## Assumptions

- Seleção de texto é sempre contígua em um único trecho (não abrange múltiplas edições de falante)
- Word-level timestamps já estão mapeados (fornecidos pelo módulo de transcrição anterior)
- Rendering de vídeo usa fila de processamento backend (não real-time); latência de 30-120s é aceitável
- Vídeo exportado usa codecs de compatibilidade padrão (H.264/AAC equivalente)
- Arquivo de vídeo original permanece no storage enquanto não expirar (política de retenção 7 dias)
- Legendas em PDF/Word são texto simples (não integradas ao vídeo; arquivo de vídeo não contém legendas incorporadas)
