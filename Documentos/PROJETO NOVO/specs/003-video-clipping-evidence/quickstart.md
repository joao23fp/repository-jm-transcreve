# Quickstart & Test Scenarios: Módulo 003 — Clipes de Vídeo

**Date**: 2026-04-22

---

## Setup Local

```bash
# 1. Instalar dependências de vídeo/export
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg @types/fluent-ffmpeg pdfkit docx @types/pdfkit

# 2. Rodar migration
npx prisma migrate dev --name add-video-clipping-module

# 3. Subir dev server + Inngest dev server
npm run dev
npx inngest-cli@latest dev
```

**Pré-requisito**: arquivo de vídeo processado pelo Módulo 001 com `TranscriptSegment` contendo `start_ms` e `end_ms`.

---

## Cenário 1: Seleção de Texto → Menu Flutuante

1. Acessar `http://localhost:3000/resultados/{jobId}` (transcrição com player de vídeo)
2. Selecionar 5–10 palavras contíguas no texto da transcrição (drag-and-select)
3. **Esperado**: menu flutuante exibe botão "Gerar Clipe"
4. Selecionar apenas 2 palavras (trecho < 3 segundos)
5. **Esperado**: menu exibe aviso em vermelho "Seleção muito curta para gerar clipe (mínimo 3s)"

---

## Cenário 2: Nomeação com Prefill Automático

1. Selecionar trecho "O réu confessou o crime no tribunal" (≥3s)
2. Clicar "Gerar Clipe"
3. **Esperado**: modal abre com campo pré-preenchido "O réu confessou o crime"
4. Pressionar Enter sem editar
5. **Esperado**: processamento inicia, status "Gerando clipe..." exibido por ≤5s

---

## Cenário 3: Renderização em Background

1. Confirmar clipe no Cenário 2
2. Fechar a aba do browser
3. Aguardar ~30–60s (renderização FFmpeg)
4. Reabrir a aba
5. **Esperado**: clipe aparece na galeria com status "Pronto"
6. **Esperado**: toast de notificação + email recebido em ≤2 minutos

---

## Cenário 4: Galeria de Clipes

1. Acessar aba "Galeria de Recortes" (ou seção na página de resultados)
2. **Esperado**: lista exibe clipes com thumbnail, nome, duração, data
3. Clicar em um clipe
4. **Esperado**: player exibe o clipe gerado corretamente

---

## Cenário 5: Exportação em Formatos

1. Na galeria, clicar no ícone de download de um clipe com status "Pronto"
2. **Esperado**: 3 opções exibidas: "Download Vídeo", "Baixar PDF", "Baixar Word"
3. Clicar "Baixar PDF"
4. **Esperado**: arquivo PDF baixado com título, timestamps e transcrição do trecho
5. Clicar "Baixar Word"
6. **Esperado**: arquivo .docx baixado com mesma estrutura

---

## Cenário 6: Falha de Renderização

1. Via Inngest dev server, simular falha do step `render-clip` (configurar `throw new Error()` temporariamente)
2. Criar um clipe
3. **Esperado**: após 3 retries, `VideoClip.status = FAILED`
4. **Esperado**: galeria exibe "Erro ao gerar" com botão "Tentar Novamente"
5. **Esperado**: email de notificação de falha enviado
6. Clicar "Tentar Novamente"
7. **Esperado**: novo job de renderização iniciado

---

## Validação de Critérios de Aceite

| Critério | Como validar |
|----------|-------------|
| SC-001: Renderização ≤2x duração | Clipe de 30s → completar em ≤60s |
| SC-002: Sync áudio/legenda | Reproduzir clipe e comparar com original |
| SC-003: 99.5% sucesso | Não testável unitariamente; monitorar em produção |
| SC-004: End-to-end ≤5min | Cronometrar do Cenário 1 ao email de conclusão |
| SC-005: Download ≤30s | Medir tempo do Cenário 5 |
