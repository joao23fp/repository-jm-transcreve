# Tasks: Módulo 003 — Gerador de Clipes de Vídeo (Provas)

**Feature**: `003-video-clipping-evidence`
**Input**: Design documents from `/specs/003-video-clipping-evidence/`
**Date**: 2026-04-22

---

## Phase 1: Setup

**Propósito**: Instalar dependências e preparar banco para o módulo.

- [x] T001 [P] Instalar dependências de vídeo e export: `npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg @types/fluent-ffmpeg pdfkit docx @types/pdfkit`
- [x] T002 [P] Adicionar enums `StatusClipe` (PENDING, PROCESSING, COMPLETED, FAILED) e `FormatoExport` (VIDEO, PDF, WORD) em `lib/enums.ts`
- [x] T003 Adicionar modelos `VideoClip` e `ExportJob` ao `prisma/schema.prisma` conforme `specs/003-video-clipping-evidence/data-model.md`
- [x] T004 Gerar e aplicar migration: `npx prisma migrate dev --name add-video-clipping-module` em `prisma/migrations/`

**Checkpoint**: Migration aplicada + `prisma generate` sem erros → fases de US podem começar

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Propósito**: Camada de serviço e wrappers de infraestrutura que todas as US dependem.

- [x] T005 [P] Criar `lib/ffmpeg-server.ts`: configurar `@ffmpeg-installer/ffmpeg` como path do binário; exportar função `cutVideoClip(inputPath, outputPath, startMs, endMs)` usando `fluent-ffmpeg` (codec H.264/AAC, sem reencoding de áudio se possível); exportar `extractThumbnail(inputPath, outputPath, seekMs)` para 1 frame JPEG
- [x] T006 [P] Criar `lib/export-generators.ts`: exportar `generatePdf(clipName, timestamps, transcriptText): Buffer` usando `pdfkit`; exportar `generateWord(clipName, timestamps, transcriptText): Buffer` usando `docx`
- [x] T007 [P] Criar `app/clips/clips.service.ts`: funções `createClip(userId, fileId, name, startMs, endMs, transcriptText)` — valida ≥3000ms, cria VideoClip PENDING, emite `clip/render.requested`; `listClips(userId, fileId)`, `getClip(userId, clipId)`, `deleteClip(userId, clipId)` com remoção do Storage; `requestExport(userId, clipId, format)` — cria ExportJob PENDING, emite `clip/export.requested`

**Checkpoint**: `clips.service.ts` compilando + testes unitários passando

---

## Phase 3: User Story 1 — Seleção & Validação de Trecho (Priority: P0) 🎯 MVP

**Goal**: Usuária seleciona texto na transcrição; menu flutuante aparece; validação de ≥3s é aplicada; modal de nomeação abre.

**Teste Independente**: Selecionar texto → menu aparece → seleção curta mostra aviso → seleção válida abre modal.

- [x] T008 [P] [US1] Criar `app/clips/components/ClipSelectionMenu.tsx`: hook `useTextSelection()` que detecta `mouseup` na área de transcrição; cada segmento renderizado DEVE ter atributos `data-segment-id`, `data-start-ms`, `data-end-ms` nas suas spans HTML — o hook lê esses atributos dos nós DOM selecionados para calcular `startMs` (menor `data-start-ms` dos segmentos selecionados) e `endMs` (maior `data-end-ms`); exibe menu flutuante com botão "Gerar Clipe" posicionado na seleção; valida ≥3000ms — se < 3s exibe aviso em vermelho; se ≥3s chama `onValidSelection({ startMs, endMs, transcriptText })`
- [x] T009 [US1] Integrar `ClipSelectionMenu` na página `app/resultados/[jobId]/page.tsx` — passar `transcriptSegments` e `fileExpiresAt` para o componente; desabilitar seleção com aviso se `fileExpiresAt < now`; garantir que spans dos segmentos na `TranscriptPanel` emitem `data-segment-id`, `data-start-ms`, `data-end-ms`

**Checkpoint**: US1 testável via Cenário 1 do quickstart.md

---

## Phase 4: User Story 2 — Nomeação Inteligente & Confirmação (Priority: P1)

**Goal**: Modal abre com campo pré-preenchido com as 5 primeiras palavras. Usuária confirma ou edita e envia.

**Teste Independente**: Seleção válida → modal com prefill → Enter confirma → POST /api/clips chamado.

- [x] T010 [US2] Criar `app/clips/components/ClipNameModal.tsx`: Dialog shadcn/ui; recebe `defaultName` (5 primeiras palavras do trecho) via props; campo input controlado; Enter ou clique "Confirmar" chama `onConfirm(name)`; botão "Cancelar" fecha modal; loading state durante criação do clipe
- [x] T011 [US2] Criar `app/api/clips/route.ts`: `POST` — valida `fileId`, `name`, `startMs`, `endMs`, `transcriptText`; chama `clips.service.createClip()`; retorna 201 com `{ clipId, status }`; `GET` — lista clipes por `fileId` com auth Clerk
- [x] T012 [US2] Criar `app/clips/clips.actions.ts`: Server Action `requestClip(fileId, name, startMs, endMs, transcriptText)` — chama `POST /api/clips` internamente ou diretamente o service; retorna `{ clipId, status, error? }`

**Checkpoint**: US1 + US2 testáveis via Cenários 1–2 do quickstart.md

---

## Phase 5: User Story 3 — Processamento em Background (Priority: P1)

**Goal**: Inngest job renderiza clipe FFmpeg em background; usuária notificada ao concluir.

**Teste Independente**: Criar clipe → fechar browser → aguardar → clipe pronto na galeria + email recebido.

- [x] T013 [US3] Criar `inngest/functions/render-clip.ts`: função Inngest com trigger `clip/render.requested`; steps: (1) `download-original` — se `IS_LOCAL_STORAGE` ler arquivo direto do filesystem local; caso contrário baixar do Supabase Storage para `/tmp/{clipId}-input.{ext}` via presigned URL; (2) `render-clip` — `cutVideoClip()` de `lib/ffmpeg-server.ts`; (3) `generate-thumbnail` — `extractThumbnail()` ao meio do clipe; (4) `upload-to-storage` — upload `.mp4` + `.jpg` para `clips/{userId}/`; (5) `update-status` — `VideoClip.status = COMPLETED`, `clipStoragePath`, `thumbnailPath`; (6) `notify-user` — Supabase Realtime + `sendClipReadyEmail(userId, clipName)` via Resend; em falha após 3 retries: status=FAILED + email de erro
- [x] T014 [P] [US3] Criar `inngest/functions/export-clip-document.ts`: trigger `clip/export.requested`; para PDF: `generatePdf()` de `lib/export-generators.ts`; para Word: `generateWord()`; para Video: gerar presigned URL do `.mp4` já existente; upload para `exports/{userId}/{exportJobId}.{ext}`; atualizar `ExportJob.status = COMPLETED`
- [x] T015 [P] [US3] Registrar `renderClip` e `exportClipDocument` no `app/api/inngest/route.ts`
- [x] T016 [P] [US3] Adicionar `sendClipReadyEmail(userId, clipName)` em `lib/email/upload-notifications.ts` (reutilizar padrão Resend existente)

**Checkpoint**: US3 testável via Cenários 3–4 do quickstart.md

---

## Phase 6: User Story 4 — Galeria de Clipes & Exportação (Priority: P2)

**Goal**: Galeria lista clipes com thumbnail; exportação em 3 formatos disponível.

**Teste Independente**: Galeria exibe clipes com thumbnail → download Vídeo/PDF/Word funciona.

- [x] T017 [P] [US4] Criar `app/clips/components/ClipGallery.tsx`: grid de clipes com `<img>` da thumbnail (ou placeholder), nome, duração formatada, status badge; botão download com `ExportMenu`; botão deletar clipe; estado vazio quando sem clipes
- [x] T018 [P] [US4] Criar `app/clips/components/ExportMenu.tsx`: DropdownMenu shadcn/ui com 3 opções (Download Vídeo, Baixar PDF, Baixar Word); clique chama `POST /api/clips/[id]/export`; polling de status do ExportJob até COMPLETED; inicia download via `window.open(fileUrl)`
- [x] T019 [P] [US4] Criar `app/api/clips/[id]/route.ts`: `GET` — retorna detalhes do clipe com lista de exports; `DELETE` — deleta clipe + Storage files
- [x] T020 [P] [US4] Criar `app/api/clips/[id]/export/route.ts`: `POST` — valida format, verifica ExportJob existente (409 se pendente), cria ExportJob, emite `clip/export.requested`
- [x] T021 [US4] Integrar `ClipGallery` na página de resultados `app/resultados/[jobId]/page.tsx` como aba ou seção abaixo da transcrição

**Checkpoint**: US4 testável via Cenários 4–5 do quickstart.md

---

## Phase 7: Polish & Preocupações Transversais

- [x] T022 [P] Aplicar `logLgpdAccess` em `app/api/clips/route.ts` e `app/api/clips/[id]/route.ts` — registrar ACCESS e UPDATE para compliance LGPD (Constitution Princípio II)
- [x] T023 [P] Implementar exclusão em cascata de `VideoClip` quando arquivo original é deletado: listener no `ProcessingJob` delete (ou cron de limpeza) que deleta VideoClips do usuário cujo `fileId` não existe mais
- [x] T024 [P] Escrever testes Vitest em `__tests__/clips/clips.service.test.ts`: (1) validação ≥3s rejeita < 3000ms; (2) criação de clip com dados válidos; (3) `listClips` retorna apenas clips do userId autenticado; (4) `deleteClip` falha para userId errado
- [x] T025 Validar Cenários 1–6 do `specs/003-video-clipping-evidence/quickstart.md` em ambiente local com Inngest dev server

---

## Dependências & Ordem de Execução

```
Setup (T001–T004) → Foundational (T005–T007) → US1 → US2 → US3 → US4 → Polish

US1: T008 → T009 (T008 before)
US2: T010, T011 em paralelo → T012
US3: T013, T014 em paralelo → T015, T016
US4: T017, T018, T019, T020 em paralelo → T021
```

---

## Resumo

| Fase | Tarefas | User Story | Prioridade |
|------|---------|------------|------------|
| Phase 1: Setup | T001–T004 | — | Fundação |
| Phase 2: Foundational | T005–T007 | — | Bloqueante |
| Phase 3: US1 | T008–T009 | Seleção & Validação | P0 🎯 MVP |
| Phase 4: US2 | T010–T012 | Nomeação & Confirmação | P1 |
| Phase 5: US3 | T013–T016 | Background Processing | P1 |
| Phase 6: US4 | T017–T021 | Galeria & Exportação | P2 |
| Phase 7: Polish | T022–T025 | — | Qualidade/LGPD |
| **Total** | **25 tarefas** | **4 user stories** | |
