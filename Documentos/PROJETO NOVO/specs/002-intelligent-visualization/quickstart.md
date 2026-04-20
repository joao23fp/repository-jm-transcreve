# Quickstart — Módulo 002: Inteligência e Visualização

## Pré-requisitos

- Módulo 001 validado (upload + transcrição funcionando)
- Job com `currentStage = COMPLETED` e `transcriptText` salvo
- Next.js dev server + Inngest dev server rodando

## Cenário de Teste Manual (Golden Path)

### 1. Subir um arquivo com áudio
```
1. Acessar http://localhost:3000/uploads
2. Enviar arquivo MP4/OGG com fala clara (ex: gravação de audiência)
3. Aguardar badge mudar para "Concluído"
```

### 2. Verificar que segmentos foram salvos
```sql
-- Deve retornar N rows (1 por segmento da transcrição)
SELECT COUNT(*), MIN("startMs"), MAX("endMs")
FROM "TranscriptSegment"
WHERE "jobId" = '<job-id>';
```

### 3. Acessar o viewer
```
http://localhost:3000/resultados/<job-id>
```
Espera-se:
- Vídeo carregado no player
- Transcrição exibida à direita com segmentos clicáveis
- Clicar em segmento → vídeo salta para o timestamp

### 4. Testar player sync
```
1. Clicar em palavra/segmento na transcrição
2. Vídeo deve saltar para o momento correto (tolerância ±300ms)
3. Durante reprodução, highlight deve seguir o vídeo
```

### 5. Testar chat
```
1. Digitar: "Quem fez a alegação principal?"
2. Resposta deve aparecer em streaming
3. Se houver citação, clicar nela deve navegar na transcrição
```

### 6. Testar detector de contradições
```
1. Clicar "Detectar Contradições"
2. Lista de contradições deve aparecer em ≤10s
3. Clicar em contradição → vídeo salta para o segmento
```

### 7. Testar renomeação de falante
```
1. Clicar em segmento sem falante atribuído
2. Selecionar ou criar "Juiz"
3. Todos segmentos daquele falante devem atualizar
```

## Cenários de Edge Case

- **Job sem segments** (upload antes da migration): Viewer mostra `transcriptText` como fallback
- **Arquivo sem vídeo** (OGG/MP3): Player de áudio com `<audio>` tag
- **Transcrição muito longa** (>80k chars): Chat trunca com aviso ao usuário
- **Job de outro usuário**: Retorna 404 (não 403, por segurança)
