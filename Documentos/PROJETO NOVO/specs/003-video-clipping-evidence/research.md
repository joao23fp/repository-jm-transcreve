# Research: Módulo 003 — Gerador de Clipes de Vídeo

**Date**: 2026-04-22

---

## Decisão 1: FFmpeg no Ambiente Vercel/Inngest

**Decision**: Usar `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` no Inngest step (Node.js runtime).

**Rationale**: O `@ffmpeg-installer/ffmpeg` empacota o binário FFmpeg como dependência npm — sem layers manuais. Inngest steps rodam em ambiente Node.js (não Edge), então o binário funciona normalmente. Alternativa WASM (`@ffmpeg/ffmpeg`) é mais lenta e tem limitações de memória em ambiente serverless.

**Alternatives considered**:
- `@ffmpeg/ffmpeg` WASM: mais lento, limitações de 2GB de memória em Lambda
- Serviço externo (Cloudinary, Mux): custo recorrente, dependência externa; evitado para manter controle total

**Installation**: `npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg @types/fluent-ffmpeg`

---

## Decisão 2: Word-Level Timestamps

**Decision**: Groq Whisper com `timestamp_granularities: ["word"]` produz timestamps por palavra. Já implementado no Módulo 001.

**Rationale**: A API Groq retorna `words: [{ word, start, end }]` quando solicitado. O Módulo 001 deve persistir esses dados em `TranscriptSegment` com `start_ms` e `end_ms` por segmento (frase/palavras agrupadas). Para clipping preciso, o mapeamento texto→tempo usa o `start_ms` da primeira palavra selecionada e `end_ms` da última.

**Assumption confirmada**: `TranscriptSegment` tem `start_ms` e `end_ms` (já parte do schema do Módulo 001).

---

## Decisão 3: Custo de Créditos para Clipes

**Decision**: Clipes são **gratuitos** na v1. Nenhum crédito adicional é cobrado pela renderização.

**Rationale**: O crédito já foi consumido na transcrição do arquivo original. Cobrar novamente pelo clipping criaria atrito e confusão de billing. Clipes são uma feature de valor do produto, não um produto separado.

**Alternatives considered**:
- 1 crédito/minuto de clipe: adiciona complexidade de billing sem valor claro para o usuário
- Freemium com limite de X clipes: fora do escopo v1

---

## Decisão 4: Geração de PDF/Word no Servidor

**Decision**: `pdfkit` para PDF + `docx` para Word — ambos Node puro, sem binários externos.

**Rationale**: Compatíveis com Vercel Serverless e Inngest. `pdfkit` é madura, amplamente usada, zero dependências nativas. `docx` gera `.docx` válido via pure JS.

**Installation**: `npm install pdfkit docx @types/pdfkit`

---

## Decisão 5: Thumbnail do Clipe

**Decision**: Screenshot via FFmpeg (seek ao `start_ms + duration/2`, 1 frame JPEG, qualidade 80%). Gerado dentro do step `render-clip`.

**Rationale**: Não requer dependências extras; FFmpeg já está disponível no job. O frame do meio do clipe é mais representativo que o primeiro frame.

**Alternatives considered**:
- Placeholder genérico: mais simples mas UX pior na galeria
- Serviço externo: custo desnecessário
