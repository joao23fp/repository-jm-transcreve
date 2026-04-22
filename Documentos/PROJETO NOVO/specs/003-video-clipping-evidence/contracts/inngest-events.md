# Inngest Events: Módulo 003 — Clipes de Vídeo

**Date**: 2026-04-22

---

## clip/render.requested

Disparado quando um VideoClip é criado (status PENDING). Aciona o job de renderização FFmpeg.

**Emitido por**: `POST /api/clips` (após insert no banco)

**Payload**:
```json
{
  "name": "clip/render.requested",
  "data": {
    "clipId": "clip_xyz789",
    "userId": "user_abc",
    "fileId": "job_abc123",
    "startMs": 12400,
    "endMs": 45800,
    "clipName": "Confissão do Réu"
  }
}
```

**Handler**: `inngest/functions/render-clip.ts`

**Steps**:
1. `download-original`: baixar arquivo do Supabase Storage para /tmp
2. `render-clip`: FFmpeg corta [startMs, endMs], codifica H.264/AAC
3. `generate-thumbnail`: FFmpeg extrai 1 frame JPEG ao meio do clipe
4. `upload-clip`: upload do .mp4 e .jpg para Supabase Storage
5. `update-status`: atualizar `VideoClip.status = COMPLETED`, `clipStoragePath`, `thumbnailPath`
6. `notify-user`: toast via Supabase Realtime + email via Resend

**Em caso de falha** (após 3 retries):
- Atualizar `VideoClip.status = FAILED`, `errorMessage`
- Notificar usuário via email

---

## clip/export.requested

Disparado quando um ExportJob é criado. Aciona geração de PDF, Word, ou cópia de vídeo.

**Emitido por**: `POST /api/clips/:id/export`

**Payload**:
```json
{
  "name": "clip/export.requested",
  "data": {
    "exportJobId": "exp_abc",
    "clipId": "clip_xyz789",
    "userId": "user_abc",
    "format": "PDF",
    "clipName": "Confissão do Réu",
    "transcriptText": "O réu confessou..."
  }
}
```

**Handler**: `inngest/functions/export-clip-document.ts`

**Steps**:
1. Para `PDF`: gerar com `pdfkit` (título, timestamps, transcrição)
2. Para `WORD`: gerar com `docx` (.docx com formatação básica)
3. Para `VIDEO`: gerar presigned URL de download do `.mp4` já existente (sem novo processamento)
4. `upload-document`: upload para Supabase Storage em `exports/{userId}/{exportJobId}.{ext}`
5. `update-status`: `ExportJob.status = COMPLETED`, `fileStoragePath`
