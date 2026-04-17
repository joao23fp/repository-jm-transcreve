# Research: Módulo de Envio Ágil — Upload & Queue Processing

**Feature**: 001-upload-queue-management
**Date**: 2026-04-17
**Status**: Complete — todos os pontos de decisão resolvidos

---

## 1. Fluxo de Upload via Presigned URL

**Decision**: Upload direto do navegador ao Supabase Storage via presigned URL.

**Rationale**: Arquivos de até 2 GB não podem passar pelo servidor Next.js sem causar
timeouts (limite Vercel: 60s/request). O navegador envia direto ao Supabase; o servidor
apenas gera a URL temporária e recebe a confirmação após upload.

**Fluxo**:
```
1. Usuária seleciona arquivo
2. Navegador lê duração via HTMLMediaElement.duration (client-side)
3. Navegador solicita ao servidor: POST /api/uploads/presigned-url
4. Servidor valida saldo, bloqueia créditos, retorna { uploadUrl, jobId }
5. Navegador envia arquivo direto ao Supabase Storage (acompanha progresso via XHR onprogress)
6. Navegador confirma ao servidor: POST /api/uploads/confirm { jobId }
7. Servidor enfileira job no Inngest
8. Supabase Realtime notifica o navegador de cada mudança de status
```

**Alternatives considered**:
- Multipart via servidor: descartado (timeouts, sem escalabilidade para 2 GB)
- Chunked upload: desnecessário para MVP; Supabase Storage suporta upload direto até 5 GB

---

## 2. Leitura de Duração Client-Side

**Decision**: Usar a API nativa do navegador (`HTMLMediaElement`) para extrair duração antes do upload.

**Rationale**: Permite bloquear créditos *antes* de enviar o arquivo, cumprindo FR-003.
Não exige processamento server-side nem dependência de FFmpeg.

**Implementação**:
```typescript
async function getFileDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const media = document.createElement('audio') // ou 'video'
    media.src = url
    media.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(media.duration) // em segundos
    }
    media.onerror = reject
  })
}
```

**Limitação**: Alguns containers (ex: MKV, AVI) podem não expor duração correta em todos
os navegadores. Fallback: se duração = NaN ou 0, solicitar que a usuária informe a duração
manualmente ou usar estimativa por tamanho (1 MB ≈ 1 min para MP3 128kbps como heurística).

**Alternatives considered**:
- Duração extraída server-side pós-upload: não cumpre o requisito de bloquear créditos
  antes do upload
- Estimativa por tamanho: imprecisa demais para bloqueio de créditos justo

---

## 3. Bloqueio Atômico de Créditos

**Decision**: Database transaction no PostgreSQL para bloquear créditos e criar a reserva atomicamente.

**Rationale**: Garante que duas requisições simultâneas (ex: dois navegadores) não causem
overdraft. Prisma suporta `$transaction()` para operações atômicas.

**Implementação**:
```typescript
await prisma.$transaction(async (tx) => {
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId }, select: { saldoDisponivel: true } })
  if (wallet.saldoDisponivel < estimatedMinutes) throw new InsufficientBalanceError()
  await tx.wallet.update({ where: { userId }, data: { saldoBloqueado: { increment: estimatedMinutes } } })
  return tx.creditReservation.create({ data: { userId, jobId, reservedMinutes: estimatedMinutes, status: 'Active' } })
})
```

**Alternatives considered**:
- Optimistic locking: mais complexo para implementar, não necessário no volume esperado

---

## 4. Orquestração de Jobs com Inngest

**Decision**: Dois Inngest functions em pipeline — `transcription-job` e `ai-analysis-job`.

**Rationale**: Separa responsabilidades, permite retry independente por etapa, e cada step
fica dentro do limite de 60s da Vercel. Se a transcrição passa de 60s, o Inngest lida com
o checkpoint automaticamente (step functions).

**Pipeline**:
```typescript
// process-transcription.ts
inngest.createFunction(
  { id: 'process-transcription', retries: 3 },
  { event: 'upload/confirmed' },
  async ({ event, step }) => {
    const transcript = await step.run('transcribe', async () => {
      return groqWhisper.transcribe(event.data.storageUrl)
    })
    await step.run('save-transcript', async () => {
      await prisma.processingJob.update({ where: { id: event.data.jobId }, data: { status: 'Analyzing', transcriptText: transcript } })
    })
    await inngest.send({ name: 'transcript/completed', data: { jobId: event.data.jobId } })
  }
)

// process-ai-analysis.ts
inngest.createFunction(
  { id: 'process-ai-analysis', retries: 3 },
  { event: 'transcript/completed' },
  async ({ event, step }) => { /* ... análise com prompt de contexto ... */ }
)
```

**Alternatives considered**:
- Job único: dificulta retry granular por etapa; falha na análise de IA causaria re-transcrição desnecessária

---

## 5. Estorno de Créditos em Caso de Falha

**Decision**: Inngest `onFailure` handler executa o estorno quando todas as retentativas se esgotam.

**Rationale**: Garante estorno mesmo que o processo principal falhe em qualquer etapa.
Inngest dispara o `onFailure` após esgotar o número configurado de retries.

**Implementação**:
```typescript
inngest.createFunction(
  {
    id: 'process-transcription',
    retries: 3,
    onFailure: async ({ event }) => {
      await reconcileCreditsRefund(event.data.jobId) // estorno total
      await notifyUserFailure(event.data.userId, event.data.jobId) // email via Resend
    }
  },
  /* ... */
)
```

---

## 6. Atualizações de Status em Tempo Real

**Decision**: Supabase Realtime via `supabase.channel().on('postgres_changes')` para ouvir
mudanças na tabela `ProcessingJob`.

**Rationale**: Já está na stack (zero esforço adicional). Atualiza a UI sem polling,
exibindo as etapas: Enviando → Na fila → Transcrevendo → Analisando → Concluído.

**Implementação no client**:
```typescript
supabase.channel('job-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'ProcessingJob',
    filter: `userId=eq.${userId}`
  }, (payload) => {
    updateJobStatus(payload.new.id, payload.new.status)
  })
  .subscribe()
```

---

## 7. Validação de Formatos no Cliente

**Decision**: Validar extensão e MIME type client-side antes de solicitar a presigned URL;
rejeição secundária server-side como defesa em profundidade.

**Formatos aceitos**: MP4, MKV, MOV, AVI, MP3, WAV, M4A, OGG

**Alternatives considered**:
- Validação apenas server-side: gera round-trip desnecessário para arquivos inválidos

---

## 8. Notificações por Email

**Decision**: Resend para emails de conclusão e falha; disparado pelo Inngest `onSuccess`
e `onFailure` handlers.

**Template de emails**:
- Sucesso: "Sua transcrição está pronta — {filename}"
- Falha: "Erro ao processar {filename} — seus créditos foram estornados"
- Créditos estornados: incluído no email de falha (não email separado)
