# API Contracts: Módulo 003 — Clipes de Vídeo

**Date**: 2026-04-22

---

## POST /api/clips

Cria um novo VideoClip a partir de uma seleção de texto.

**Auth**: Clerk (userId extraído do token)

**Request Body**:
```json
{
  "fileId": "job_abc123",
  "name": "Confissão do Réu - Momento Crítico",
  "startMs": 12400,
  "endMs": 45800,
  "transcriptText": "O réu confessou o crime no tribunal perante todos os presentes"
}
```

**Validações**:
- `fileId`: obrigatório; ProcessingJob deve pertencer ao userId autenticado
- `name`: obrigatório, ≤255 chars
- `startMs` e `endMs`: obrigatórios; `endMs - startMs >= 3000` (≥3 segundos — FR-003)
- `transcriptText`: obrigatório, ≤5000 chars

**Response 201**:
```json
{
  "clipId": "clip_xyz789",
  "status": "PENDING",
  "estimatedReadyAt": "2026-04-22T17:30:00.000Z"
}
```

**Response 400**: `{ "error": "VALIDATION_ERROR", "message": "Seleção muito curta (mínimo 3s)" }`
**Response 403**: `{ "error": "FORBIDDEN", "message": "Arquivo não pertence ao usuário" }`

---

## GET /api/clips?fileId=:fileId

Lista todos os clipes de um arquivo.

**Auth**: Clerk

**Query Params**: `fileId` (obrigatório)

**Response 200**:
```json
{
  "clips": [
    {
      "id": "clip_xyz789",
      "name": "Confissão do Réu",
      "startMs": 12400,
      "endMs": 45800,
      "durationSeconds": 33.4,
      "status": "COMPLETED",
      "thumbnailUrl": "https://...",
      "createdAt": "2026-04-22T17:28:00.000Z"
    }
  ]
}
```

---

## GET /api/clips/:id

Retorna detalhes e status de um clipe específico.

**Auth**: Clerk (valida userId)

**Response 200**:
```json
{
  "id": "clip_xyz789",
  "name": "Confissão do Réu",
  "status": "COMPLETED",
  "clipUrl": "https://...",
  "thumbnailUrl": "https://...",
  "transcriptText": "...",
  "durationSeconds": 33.4,
  "exports": [
    { "id": "exp_1", "format": "PDF", "status": "COMPLETED", "fileUrl": "https://..." }
  ]
}
```

**Response 404**: `{ "error": "NOT_FOUND" }`

---

## DELETE /api/clips/:id

Deleta um clipe e seus ExportJobs. Remove arquivos do Storage.

**Auth**: Clerk (valida userId)

**Response 200**: `{ "ok": true }`

---

## POST /api/clips/:id/export

Solicita exportação em formato específico.

**Auth**: Clerk

**Request Body**:
```json
{ "format": "PDF" }
```

**Valores válidos de `format`**: `"VIDEO"`, `"PDF"`, `"WORD"`

**Response 201**:
```json
{ "exportJobId": "exp_abc", "status": "PENDING" }
```

**Response 409**: `{ "error": "EXPORT_IN_PROGRESS", "exportJobId": "exp_abc" }` (já existe export pendente do mesmo formato)
