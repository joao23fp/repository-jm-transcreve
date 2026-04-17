# Feature Specification: Módulo de Gestão de Prompts (Biblioteca de Comandos de IA)

**Feature Branch**: `004-prompt-library-management`
**Created**: 2026-04-17
**Status**: Ready for Clarification
**TranscreveAdv Module**: Prompt Library & Customization

## User Scenarios & Testing *(mandatory)*

### User Story 1: Acesso a Modelos Padrão (Priority: P1)

Usuário acessa "Minha Biblioteca" e visualiza "Modelos do Sistema" (templates pré-definidos). Pode visualizar ou duplicar sem editar originais.

**Why this priority**: P1—templates reduce onboarding friction. Users can start analyzing immediately without creating from scratch.

**Independent Test**: User navigates to Library; sees system templates; can view details and duplicate without modifying originals.

**Acceptance Scenarios**:

1. **Given** usuário acessa "Minha Biblioteca", **When** visualiza seção "Modelos do Sistema", **Then** lista exibe 5-10 templates bloqueados (ex: "Resumo Audiência", "Análise Contradições", "Extração Fatos-Chave")
2. **Given** template listado, **When** usuário clica "Visualizar", **Then** modal exibe nome, descrição, body do prompt sem edição
3. **Given** template visualizado, **When** usuário clica "Duplicar", **Then** sistema cria cópia com prefixo "[Meu] Resumo Audiência" em biblioteca pessoal

---

### User Story 2: Criação & Edição de Prompts Personalizados (Priority: P1)

Usuário duplica template e edita Nome, Descrição, e Corpo do Comando. Salva como novo prompt pessoal.

**Why this priority**: P1—personalization is core value; enables lawyers to tailor analyses to their case types.

**Independent Test**: User duplicates template; edits fields; saves; new prompt appears in personal library; applies to file analysis.

**Acceptance Scenarios**:

1. **Given** template duplicado em modo de edição, **When** usuário altera Nome para "Análise Criminal - Foco em Móvel" e Descrição, **Then** campos aceitam entrada com até 255 caracteres
2. **Given** corpo do comando editado (ex: adiciona instruções ao prompt), **When** usuário clica Salvar, **Then** novo prompt é persistido na biblioteca pessoal (tipo=Usuario, não Sistema)
3. **Given** novo prompt salvo, **When** usuário acessa tela de análise de vídeo/áudio posteriormente, **Then** novo prompt aparece na dropdown de seleção de contexto

---

### User Story 3: Organização por Pastas Temáticas (Priority: P2)

Usuário cria pastas (ex: "Criminal", "Cível", "Administrativo") e move/cria prompts dentro delas para organização.

**Why this priority**: P2—folder organization is quality-of-life; not required for MVP but improves UX para usuários com 10+ prompts.

**Independent Test**: User creates folder; creates prompt inside folder; folder structure persists; dropdown shows nested organization.

**Acceptance Scenarios**:

1. **Given** usuário em "Minha Biblioteca", **When** clica "Criar Nova Pasta" e define nome "Casos Criminais", **Then** pasta criada e exibida na hierarquia
2. **Given** pasta criada, **When** usuário cria novo prompt diretamente nela, **Then** prompt é vinculado à pasta no sistema
3. **Given** múltiplas pastas criadas, **When** usuário acessa seleção de contexto na análise, **Then** dropdown mostra prompts agrupados por pasta (ex: "Casos Criminais → Análise Móvel")

---

### User Story 4: Aplicação de Prompts em Análise (Priority: P1)

Usuário está analisando vídeo/áudio; abre dropdown de "Contexto"; seleciona prompt personalizado; IA processa arquivo com aquele prompt como instrução.

**Why this priority**: P1—core flow. Without this, entire library feature is useless; prompts must be applicable to analysis.

**Independent Test**: User selects custom prompt from dropdown; chat/analysis uses that prompt; output reflects custom instructions.

**Acceptance Scenarios**:

1. **Given** vídeo/áudio carregado para análise, **When** usuário abre dropdown "Selecione Contexto", **Then** lista mostra todos templates sistema + prompts personalizados organizados por pasta
2. **Given** prompt personalizado selecionado, **When** usuário envia pergunta no chat ou clica "Analisar", **Then** IA processa com aquele prompt como instrução de sistema
3. **Given** IA processa, **When** resposta retorna, **Then** contexto do prompt foi aplicado (output reflete instruções customizadas)

---

### Edge Cases

- **Exclusão de pasta com conteúdo**: Modal de confirmação exibe: "Pasta contém X prompts. Ao excluir, todos serão removidos permanentemente. Continuar?" → Exclusão em cascata
- **Tentativa de criar prompt com nome duplicado**: Sistema bloqueia e exibe: "Já existe prompt com este nome nesta pasta. Use outro nome."
- **Prompt vazio (sem body)**: Botão Salvar desabilitado até que body seja preenchido (validação em tempo real)
- **Falha de IA com prompt customizado**: Sistema notifica: "Erro ao processar prompt personalizado." → botão "Editar na Biblioteca"
- **Edição de prompt enquanto é usado**: Se prompt estiver sendo aplicado a análise em outra aba, edição permite mas marca análise como "obsoleta"

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE armazenar prompts de sistema (imutáveis, tipo=Sistema) separados de prompts de usuário (editáveis, tipo=Usuario)
- **FR-002**: Sistema DEVE permitir criação de pastas por usuário com até 3 níveis de aninhamento
- **FR-003**: Sistema DEVE enforçar validações: Nome (obrigatório, ≤255 chars), Descrição (opcional, ≤500 chars), Corpo (obrigatório, ≤2000 chars)
- **FR-004**: Sistema DEVE bloquear criação de 2+ prompts com mesmo nome dentro da mesma pasta (unicidade)
- **FR-005**: Sistema DEVE permitir renomear, editar, ou deletar prompts de usuário; deleção de prompts de sistema bloqueada
- **FR-006**: Sistema DEVE aplicar prompt selecionado como instrução de sistema à IA durante análise/chat de um arquivo específico
- **FR-007**: Sistema DEVE registrar qual prompt foi utilizado em cada análise (audit trail) para rastreabilidade

### Key Entities

- **PromptTemplate**: ID, user_id (nulo para sistema), folder_id, name, description, body (text), type (System/Usuario), is_deleted, created_at, updated_at
- **PromptFolder**: ID, user_id, name, parent_folder_id (suporta aninhamento), created_at
- **PromptApplication**: ID, file_id, analysis_session_id, prompt_id, applied_at (audit trail)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuário cria um prompt personalizado partindo de template em menos de 1 minuto
- **SC-002**: 100% de prompts salvos na biblioteca são recuperáveis e aplicáveis na análise (zero data loss)
- **SC-003**: Nenhum template de sistema é modificado acidentalmente por usuários (imutabilidade enforced)
- **SC-004**: Tempo para selecionar prompt na dropdown menor que 2 segundos mesmo com 50+ prompts
- **SC-005**: Taxa de erro de aplicação de prompt menor que 1% (IA processa com sucesso 99%+ dos prompts customizados)

## Assumptions

- Prompts são aplicáveis tanto para análise de vídeo quanto de áudio
- Prompt body é texto livre; não há validação de sintaxe complexa (sistema confia na expertise do advogado)
- Templates de sistema são atualizados via painel administrativo (fora de escopo desta spec)
- Backup/restore de prompts não é necessário em v1 (exclusões pelo usuário são permanentes)
- Histórico de versões de prompt não implementado (cada edição sobrescreve a anterior)
- Máximo de 1000 prompts customizados por usuário (limite de performance)
