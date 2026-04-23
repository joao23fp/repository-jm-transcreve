# Tasks: Módulo 002 — Inteligência e Visualização

**Input**: Design documents from `specs/002-intelligent-visualization/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Verificar estrutura existente e preparar diretórios para o módulo.

- [x] T001 Criar diretório `app/resultados/[jobId]/` e `app/api/jobs/[jobId]/` conforme estrutura do plan.md
- [x] T002 [P] Verificar variáveis de ambiente necessárias: `GROQ_API_KEY` (já configurada no Módulo 001), `DATABASE_URL`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migração do banco + atualização do pipeline de transcrição para salvar `TranscriptSegment`. Bloqueia todas as user stories.

**⚠️ CRÍTICO**: Nenhuma user story pode começar antes desta fase estar completa.

- [x] T003 Adicionar 4 novos modelos Prisma ao `prisma/schema.prisma`: `TranscriptSegment`, `SpeakerProfile`, `ChatMessage`, `InconsistencyReport` (conforme data-model.md)
- [x] T004 Adicionar relações ao modelo `ProcessingJob` existente em `prisma/schema.prisma`: `segments`, `speakers`, `chatMessages`, `inconsistencyReports`
- [x] T005 Gerar e aplicar migration: `npx prisma migrate dev --name add-module-002-tables`
- [x] T006 [P] Atualizar `inngest/functions/process-transcription.ts`: adicionar `timestamp_granularities: ['word', 'segment']` na chamada do Groq Whisper
- [x] T007 Atualizar `inngest/functions/process-transcription.ts`: adicionar step `save-transcript-segments` que persiste rows em `TranscriptSegment` a partir de `result.segments` + `result.words` (mapeamento: `segment.start * 1000 → startMs`, `segment.end * 1000 → endMs`, words filtrados por range → `wordTimestamps`)
- [x] T008 Atualizar `inngest/functions/process-transcription.ts`: criar `SpeakerProfile` placeholder ("Pessoa A") apenas quando segmentos são salvos (não criar falantes automaticamente — MVP manual)
- [x] T009 [P] Criar `app/api/jobs/[jobId]/transcript/route.ts`: `GET` que retorna segmentos + speakers + videoUrl (contrato: api-contracts.md#GET-transcript)

**Checkpoint**: Após processar um novo upload, verificar via SQL que `TranscriptSegment` rows existem com `startMs`, `endMs`, `wordTimestamps` preenchidos.

---

## Phase 3: User Story 1 — Player Sincronizado com Transcrição (P1) 🎯 MVP

**Goal**: Viewer com vídeo HTML5 + transcrição sincronizada; clicar em segmento salta o vídeo para o timestamp correto; highlight segue reprodução.

**Independent Test**: Acessar `/resultados/[jobId]`; clicar em segmento; vídeo salta (≤300ms); highlight acompanha reprodução.

### Implementação US1

- [x] T010 [P] [US1] Criar `app/resultados/[jobId]/page.tsx`: Server Component que busca job + segmentos via Prisma e passa como props para `ViewerLayout`
- [x] T011 [P] [US1] Criar `app/resultados/[jobId]/ViewerLayout.tsx`: Client Component raiz com estado compartilhado `currentMs` e `seekRef` (conforme contratos UI do api-contracts.md)
- [x] T012 [P] [US1] Criar `app/resultados/[jobId]/VideoPlayer.tsx`: Client Component com `<video>` nativo + `useRef`, `onTimeUpdate` (dispara `onTimeUpdate(currentTime * 1000)`), `seekToMs(ms)` via `seekRef` (ref exposto ao pai)
- [x] T013 [US1] Criar `app/resultados/[jobId]/TranscriptPanel.tsx`: Client Component que renderiza lista de segmentos, highlight dinâmico baseado em `currentMs` (segmento ativo = `startMs ≤ currentMs < endMs`), e `onSegmentClick` que chama `seekRef.current.seekToMs(startMs)`
- [x] T014 [US1] Atualizar `app/resultados/page.tsx`: adicionar link para `/resultados/[jobId]` em cada job com status `COMPLETED`

**Checkpoint**: US1 funcional e testável independentemente via quickstart.md §3–§4.

---

## Phase 4: User Story 2 — Identificação & Renomeação de Falantes (P1)

**Goal**: UI para atribuir/renomear falantes em segmentos; renomeação propaga globalmente; API persiste.

**Independent Test**: Clicar em segmento sem falante → selecionar/criar nome → todos segmentos com mesmo `speakerId` atualizam; nome aparece no `TranscriptPanel`.

### Implementação US2

- [x] T015 [P] [US2] Criar `app/api/jobs/[jobId]/speakers/[speakerId]/route.ts`: `PUT` que atualiza `SpeakerProfile.displayName` + seta `isRenamed: true` + retorna `affectedSegments` (contrato: api-contracts.md#PUT-speakers)
- [x] T016 [P] [US2] Criar `app/api/jobs/[jobId]/segments/[segmentId]/route.ts`: `PUT` para editar `editedText` de um segmento (contrato: api-contracts.md#PUT-segments); incluir campo `lastEditedAt: DateTime` na resposta para o cliente detectar invalidação do chat (FR-005)
- [x] T017 [US2] Criar `app/resultados/[jobId]/SpeakerManager.tsx`: Client Component com dropdown/input para atribuir falante a segmento; invoca `PUT /api/jobs/[jobId]/speakers/[speakerId]`; atualiza state local otimisticamente
- [x] T018 [US2] Integrar `SpeakerManager` no `TranscriptPanel.tsx`: ao clicar em nome de falante de um segmento, abrir `SpeakerManager` inline; `onSpeakerAssign(segmentId, speakerId)` atualiza lista de segmentos no state

**Checkpoint**: US2 funcional e testável via quickstart.md §7.

---

## Phase 5: User Story 3 — Chat com Arquivo & Análise Semântica (P2)

**Goal**: Chat streaming com contexto da transcrição; resposta inclui citações clicáveis; histórico das últimas 10 mensagens.

**Independent Test**: Enviar pergunta no chat; resposta aparece em streaming; clicar citação navega no vídeo.

### Implementação US3

- [x] T019 [P] [US3] Criar `app/api/jobs/[jobId]/chat/route.ts`: `POST` com streaming SSE; carrega segmentos do job; trunca transcrição se >80k chars (com aviso); envia para `groq.chat.completions.create({model: 'llama-3.3-70b-versatile', stream: true})`; retorna `new Response(stream, {'Content-Type': 'text/event-stream'})` (contrato: api-contracts.md#POST-chat)
- [x] T020 [US3] Criar `app/resultados/[jobId]/ChatPanel.tsx`: Client Component com input de mensagem, lista de mensagens, fetch SSE para `/api/jobs/[jobId]/chat`, renderização de tokens em streaming, e `onCitationClick(segmentId, startMs)` que chama `seekRef` (contrato UI: api-contracts.md#ChatPanel)
- [x] T021 [US3] Persistir `ChatMessage` no banco após cada troca (user + assistant) em `app/api/jobs/[jobId]/chat/route.ts`
- [x] T022 [US3] Integrar `ChatPanel` no `ViewerLayout.tsx`: passar `onCitationClick` que chama `seekRef.current.seekToMs(startMs)`
- [x] T023b [US3] Implementar aviso de invalidação de chat em `ChatPanel.tsx`: se `lastEditedAt` (recebido via `ViewerLayout`) for posterior ao `createdAt` da última mensagem, exibir banner "Transcrição editada — o chat pode estar desatualizado. Reanalisar?" com botão para limpar histórico (FR-005)

**Checkpoint**: US3 funcional e testável via quickstart.md §5.

---

## Phase 6: User Story 4 — Detector de Contradições (P2)

**Goal**: Botão "Detectar Contradições" analisa transcrição via LLM e retorna lista com links para segmentos conflitantes.

**Independent Test**: Clicar botão; lista aparece em ≤10s; clicar em contradição navega para segmento no vídeo.

### Implementação US4

- [x] T023 [P] [US4] Criar `app/api/jobs/[jobId]/contradictions/route.ts`: `POST` síncrono; carrega segmentos; envia transcrição ao LLaMA com prompt para detectar inconsistências em JSON estruturado; persiste `InconsistencyReport` rows; retorna lista formatada (contrato: api-contracts.md#POST-contradictions)
- [x] T024 [US4] Criar `app/resultados/[jobId]/ContradictionsPanel.tsx`: Client Component com botão "Detectar Contradições", estado de loading, lista de contradições com dois links clicáveis por item (primarySegmentId + conflictingSegmentId)
- [x] T025 [US4] Integrar `ContradictionsPanel` no `ViewerLayout.tsx`: links de contradição chamam `seekRef.current.seekToMs(startMs)` para cada segmento

**Checkpoint**: US4 funcional e testável via quickstart.md §6.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Fallbacks, edge cases e validação do golden path completo.

- [x] T026 [P] Implementar fallback em `app/resultados/[jobId]/page.tsx`: se job sem `TranscriptSegment` rows (upload pré-migration), exibir `transcriptText` plano
- [x] T027 [P] Suporte a arquivo sem vídeo (OGG/MP3) em `VideoPlayer.tsx`: renderizar `<audio>` em vez de `<video>` baseado em `mimeType`
- [x] T028 [P] Adicionar aviso de truncamento ao chat em `ChatPanel.tsx` quando transcrição >80k chars
- [x] T029 Retornar 404 (não 403) em todos endpoints quando job pertence a outro usuário — revisar `transcript/route.ts`, `chat/route.ts`, `contradictions/route.ts`, `speakers/route.ts`, `segments/route.ts`
- [x] T030 Validar golden path completo seguindo `quickstart.md`: upload → segmentos salvos → viewer → sync → speaker → chat → contradições; para SC-004, validar detector com pelo menos 5 contradições-exemplo conhecidas (ex: depoimento com datas inconsistentes, afirmações opostas sobre o mesmo fato) e confirmar que ≥4 são detectadas (≥80%)
- [x] T031 [P] Aplicar `lgpd-logger` wrapper nas 5 rotas `/api/jobs/[jobId]/`: `transcript/route.ts`, `chat/route.ts`, `contradictions/route.ts`, `speakers/[speakerId]/route.ts`, `segments/[segmentId]/route.ts` — reutilizar o middleware já criado em `lib/lgpd-logger.ts` (Módulo 001), registrando `userId`, `action`, `resourceId (jobId)`, `timestamp` (FR Constitution Princípio II — LGPD 90 dias)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as user stories
- **US1 (Phase 3)**: Depende da Foundational — pode começar após T009
- **US2 (Phase 4)**: Depende da Foundational — pode rodar em paralelo com US1
- **US3 (Phase 5)**: Depende da Foundational — idealmente após US1 (ViewerLayout pronto para integração)
- **US4 (Phase 6)**: Depende da Foundational — pode rodar em paralelo com US3
- **Polish (Phase 7)**: Depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **US1 (P1)**: Sem dependências em outras stories
- **US2 (P1)**: Sem dependências em outras stories — integra com US1 via `TranscriptPanel` apenas no T018
- **US3 (P2)**: Independente; integração com `seekRef` do ViewerLayout (US1)
- **US4 (P2)**: Independente; integração com `seekRef` do ViewerLayout (US1)

### Parallel Opportunities por Story

```bash
# US1 — podem rodar em paralelo:
T010  app/resultados/[jobId]/page.tsx
T011  app/resultados/[jobId]/ViewerLayout.tsx
T012  app/resultados/[jobId]/VideoPlayer.tsx
# T013 depende de T011+T012 (usa seekRef e currentMs)

# US2 — podem rodar em paralelo:
T015  app/api/jobs/[jobId]/speakers/[speakerId]/route.ts
T016  app/api/jobs/[jobId]/segments/[segmentId]/route.ts

# US3 — podem rodar em paralelo:
T019  app/api/jobs/[jobId]/chat/route.ts

# US4 — podem rodar em paralelo com US3:
T023  app/api/jobs/[jobId]/contradictions/route.ts
T024  app/resultados/[jobId]/ContradictionsPanel.tsx
```

---

## Implementation Strategy

### MVP (US1 + US2 primeiro)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloqueia tudo)
3. Completar Phase 3: US1 — Player + Transcrição sincronizada
4. Completar Phase 4: US2 — Speaker management
5. **PARAR e VALIDAR**: testar US1+US2 via quickstart.md §3–§4 e §7
6. Deploy/demo se pronto

### Incremento 2 (US3 + US4)

7. Completar Phase 5: US3 — Chat streaming
8. Completar Phase 6: US4 — Detector de contradições
9. Completar Phase 7: Polish
10. Validar golden path completo via quickstart.md

---

## Notes

- Testes são OPCIONAIS — não incluídos pois a spec não os requer para MVP
- `[P]` = arquivos diferentes, sem dependências entre si
- `[Story]` mapeia tarefa à user story para rastreabilidade
- Cada user story pode ser entregue e testada independentemente
- Prioridade: US1+US2 primeiro (P1), depois US3+US4 (P2)
- Referência de contratos: `specs/002-intelligent-visualization/contracts/api-contracts.md`
- Referência de modelo: `specs/002-intelligent-visualization/data-model.md`
- Cenários de teste: `specs/002-intelligent-visualization/quickstart.md`
