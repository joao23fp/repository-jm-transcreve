# Feature Specification: Módulo de Envio Ágil com Gestão de Saldo e Processamento IA

**Feature Branch**: `001-upload-queue-management`
**Created**: 2026-04-17
**Status**: Clarification Complete
**TranscreveAdv Module**: Upload & Queue Processing

## Clarifications

### Session 2026-04-17 (parte 2)

- Q: Qual é o modelo de isolamento de acesso aos arquivos e jobs? → A: Isolamento por usuária — cada usuária vê somente seus próprios arquivos e jobs (sem compartilhamento entre colegas ou escritórios em v1)
- Q: Quais são os limites máximos de tamanho e duração por arquivo? → A: 2 GB e 4 horas por arquivo
- Q: Como o sistema deve tratar falha do serviço externo de transcrição (speech-to-text)? → A: Mesmo comportamento da falha de IA — até 3 retentativas automáticas; se todas falharem, status "Erro na Transcrição" + estorno total de créditos
- Q: Quais formatos de arquivo são suportados para upload? → A: Vídeo: MP4, MKV, MOV, AVI — Áudio: MP3, WAV, M4A, OGG
- Q: A plataforma está sujeita à LGPD? Qual o nível de conformidade esperado em v1? → A: LGPD aplicável — plataforma atua como operadora; política mínima: retenção de 7 dias, logs de acesso por 90 dias, exclusão sob demanda suportada

### Session 2026-04-17 (parte 2)

- Q: Qual é o método de upload de arquivos — multipart via servidor ou presigned URL direto ao storage? → A: Presigned URL: navegador envia direto ao Supabase Storage; servidor recebe confirmação e enfileira o job no Inngest
- Q: Qual feedback visual a usuária recebe durante o upload e processamento? → A: Barra de progresso por arquivo (% enviado) + etapas visíveis: Enviando → Na fila → Transcrevendo → Concluído
- Q: Como a duração do arquivo é obtida para cálculo de créditos — client-side antes do upload ou server-side após receber o arquivo? → A: Duração lida no navegador (client-side) antes do upload; créditos bloqueados antes de iniciar o envio

### Session 2026-04-17 (parte 3)

- Q: O que acontece quando a conexão cai ou o browser fecha durante o envio do arquivo? → A: Upload interrompido gera erro — crédito bloqueado é estornado quando a presigned URL expira (TTL 15 min); usuária recebe notificação e precisa refazer o upload (resumable uploads fora de escopo v1)
- Q: O que deve acontecer com a reserva de créditos quando a presigned URL expira sem confirmação de upload? → A: Inngest scheduled job (a cada 15 min) verifica reservas com presignedUrlExpiresAt no passado + uploadConfirmedAt nulo → marca job como FAILED, estorna créditos e notifica por email
- Q: Em qual momento exato os créditos são bloqueados? → A: No POST /presigned-url — antes de enviar qualquer byte ao storage; POST /confirm apenas enfileira o job, não bloqueia créditos
- Q: Como deve ser criada a linha Wallet para uma nova usuária? → A: Webhook Clerk user.created → servidor cria Wallet com saldoTotal: 0 atomicamente no cadastro
- Q: O que acontece com as barras de progresso se a usuária navegar para outra rota durante o upload? → A: Reconstituição ao retornar — GET /api/uploads/jobs + reassinar Realtime ao voltar para /uploads; progresso XHR (% enviado) é perdido mas status do job é recuperado; sem estado global

### Session 2026-04-17 (parte 4)

- Q: O email de expiração de upload (FR-013) deve ser template dedicado ou reutilizar o de falha? → A: Novo template dedicado sendExpiredUploadEmail: "Seu upload de {filename} não foi concluído — o tempo expirou. Seus créditos foram estornados. Tente novamente."
- Q: Como tratar erros de arquivo inválido/corrompido no Groq vs. erros de serviço? → A: Falha imediata (sem retry) para erros de arquivo inválido; 3 retentativas normais para erros de serviço/timeout

## User Scenarios & Testing *(mandatory)*

### User Story 1: Upload com Validação de Saldo (Priority: P1)

Usuário inicia upload de múltiplos arquivos de áudio/vídeo para transcrição, com visualização prévia do consumo de créditos estimado.

**Why this priority**: Core feature—lawyers cannot start processing without understanding cost. Blocking this prevents any downstream activity.

**Independent Test**: User selects files, system displays estimated credit consumption, user can confirm or adjust selections before submission.

**Acceptance Scenarios**:

1. **Given** usuário possui 45 minutos de saldo, **When** seleciona 3 arquivos totalizando 60 minutos, **Then** sistema exibe alerta "Déficit de 15 minutos" e solicita desmarcar arquivos até ≤45 minutos
2. **Given** saldo suficiente após remoção de arquivo, **When** usuário clica Confirmar Upload, **Then** upload inicia e créditos são bloqueados (reservados)
3. **Given** upload está em progresso, **When** usuário fecha navegador, **Then** servidor continua processamento em background

---

### User Story 2: Processamento Assíncrono com Resiliência (Priority: P1)

Após upload bem-sucedido, sistema coloca arquivos em fila e processa transcrição + aplicação de prompt de contexto com retry automático.

**Why this priority**: P1—confidence in async processing is critical for user trust. If jobs fail silently, users lose credits and trust.

**Independent Test**: Upload completes; user can close browser; task completes in background; notification is sent on completion.

**Acceptance Scenarios**:

1. **Given** arquivo foi transcrito com sucesso, **When** aplicação de Prompt de Contexto (IA) falha na primeira tentativa, **Then** sistema realiza até 3 retentativas automáticas
2. **Given** todas as 3 retentativas falharam, **When** status muda para "Erro na Análise", **Then** créditos estimados são estornados integralmente para o usuário dentro de 30 segundos
3. **Given** processamento iniciou, **When** usuário desconecta, **Then** servidor mantém estado da tarefa e continua; notificação via email/push é enviada ao finalizar

---

### User Story 3: Seleção de Contexto & Prompts Dinâmicos (Priority: P2)

Usuário escolhe um "Prompt de Contexto" (ex: "Resumo de Audiência", "Focar em Contradições") antes de confirmar upload para guiar análise de IA.

**Why this priority**: P2—adds personalization but not strictly required for MVP. Users can process without prompts if necessary.

**Independent Test**: User selects a prompt from dropdown; it persists through upload; AI analysis reflects the chosen context in output.

**Acceptance Scenarios**:

1. **Given** usuário na tela de upload, **When** abre dropdown de Contexto, **Then** lista exibe prompts do sistema (pré-definidos) + prompts personalizados da biblioteca
2. **Given** prompt selecionado, **When** usuário confirma upload, **Then** prompt escolhido é registrado na fila de processamento e enviado à IA

---

### Edge Cases

- **Upload interrompido por timeout ou desconexão**: Upload falha com erro; crédito bloqueado é estornado automaticamente pelo job agendado (FR-013) quando a presigned URL expira (TTL 15 min, máximo 30 min de espera até o próximo ciclo); usuária recebe email de notificação e deve iniciar novo upload. Resumable uploads estão fora de escopo v1.
- **Arquivo vazio ou corrompido**: Sistema valida arquivo antes de iniciar transcrição; notifica usuário com erro específico; créditos não são debitados.
- **Formato não suportado**: Sistema rejeita o arquivo antes do upload com mensagem "Formato não suportado. Formatos aceitos: MP4, MKV, MOV, AVI, MP3, WAV, M4A, OGG"; créditos não são debitados.
- **Arquivo excede limite (>2 GB ou >4 horas)**: Sistema rejeita o arquivo antes do upload com mensagem "Arquivo excede o limite permitido (máx. 2 GB / 4 horas)"; créditos não são debitados.
- **Saldo alterado durante upload (ex: outro navegador aberto)**: Segundo navegador recebe saldo atualizado; primeiro navegador valida antes de processar fila.
- **Múltiplos uploads simultâneos**: Sistema aceita até 5 arquivos simultâneos por usuário; fila é FIFO; notificações disparam por arquivo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE aceitar upload de múltiplos arquivos (até 5 simultâneos) via drag-and-drop ou file picker; limite por arquivo: 2 GB de tamanho e 4 horas de duração; formatos aceitos — vídeo: MP4, MKV, MOV, AVI; áudio: MP3, WAV, M4A, OGG; upload realizado via presigned URL diretamente ao storage (sem staging no servidor)
- **FR-002**: Sistema DEVE calcular consumo de créditos estimado (baseado em duração de arquivo lida no navegador, client-side) e exibir prévia antes que a usuária confirme o envio
- **FR-003**: Sistema DEVE bloquear (reservar) créditos estimados no momento em que a presigned URL é solicitada (POST /api/uploads/presigned-url), antes de enviar qualquer byte ao storage; POST /confirm apenas enfileira o job de processamento
- **FR-004**: Sistema DEVE colocar arquivo em fila de processamento assíncrona com estado persistente (Pending → Processing → Completed/Failed)
- **FR-005**: Sistema DEVE executar até 3 retentativas automáticas em caso de falha de serviço — tanto de transcrição (provedor externo) quanto de análise de IA (prompt de contexto); após 3 falhas consecutivas de serviço, marcar job como `FAILED` e estornar créditos integralmente. Exceção: erros de arquivo inválido ou corrompido retornados pelo Groq (ex: `invalid_file`, `unsupported_format`) devem causar falha imediata sem retentativas — job marcado como `FAILED` diretamente e créditos estornados
- **FR-006**: Sistema DEVE enviar notificação em tempo real (toast + email) quando processamento de cada arquivo conclui
- **FR-007**: Sistema DEVE permitir que usuária continue navegando enquanto processamento ocorre em background; ao retornar para `/uploads`, a página reconstitui o estado via `GET /api/uploads/jobs` + reassinatura do canal Realtime; progresso de upload XHR (% enviado) não é preservado entre navegações, mas o status do job (QUEUED/TRANSCRIBING/COMPLETED/FAILED) é sempre recuperado; sem estado global no cliente
- **FR-012**: Sistema DEVE exibir barra de progresso por arquivo durante o upload (percentual enviado) e atualizar o status em etapas visíveis em tempo real: Enviando → Na fila → Transcrevendo → Concluído
- **FR-009**: Sistema DEVE garantir isolamento completo por usuária: nenhuma usuária pode visualizar, acessar ou listar arquivos, jobs ou reservas de crédito de outra usuária
- **FR-010**: Sistema DEVE registrar logs de acesso a arquivos e jobs por 90 dias (conformidade LGPD — plataforma como operadora)
- **FR-011**: Sistema DEVE suportar exclusão sob demanda de todos os dados de uma usuária (arquivos, jobs, transcrições, logs) em atendimento ao direito de eliminação previsto na LGPD
- **FR-008**: Sistema DEVE reconciliar créditos: se tarefa levou 7 minutos mas 8 foram bloqueados, estornar 1 minuto automaticamente
- **FR-014**: Sistema DEVE criar registro `Wallet` com `saldoTotal: 0` para cada nova usuária via webhook Clerk `user.created` (endpoint `POST /api/webhooks/clerk`); sem Wallet, nenhum upload pode ser iniciado
- **FR-013**: Sistema DEVE executar job agendado a cada 15 minutos para detectar `CreditReservation` com status `ACTIVE` cuja presigned URL expirou (`FileUpload.presignedUrlExpiresAt < now`) e `uploadConfirmedAt` ainda nulo → marcar `ProcessingJob` como `FAILED`, marcar `CreditReservation.status` como `REFUNDED`, estornar créditos e enviar email via template dedicado `sendExpiredUploadEmail`: "Seu upload de {filename} não foi concluído — o tempo expirou. Seus créditos foram estornados. Tente novamente."

### Key Entities

- **ProcessingJob**: ID, user_id, file_name, estimated_minutes, blocked_minutes, actual_minutes_consumed, status (Pending/Processing/Completed/Failed), created_at, completed_at, error_message
- **FileUpload**: ID, user_id, job_id, file_name, file_size_bytes, mime_type, processing_start_time, processing_end_time
- **CreditReservation**: ID, user_id, job_id, reserved_minutes, status (Active/Released/Refunded), created_at, released_at

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuário consegue fazer upload de 3 arquivos e visualizar consumo estimado em menos de 30 segundos
- **SC-002**: 99% dos arquivos completam processamento sem falhas (taxa de sucesso após retentativas)
- **SC-003**: Tempo médio entre confirmação de upload e exibição da primeira barra de progresso ≤ 2 segundos; primeira atualização de status "Na fila" ≤ 60 segundos após conclusão do envio do arquivo
- **SC-004**: 100% das reservas de crédito são reconciliadas (nenhum usuário fica com saldo incorreto após tarefa)
- **SC-005**: Usuário que desconectar durante processamento recebe notificação via email dentro de 2 horas após conclusão

## Assumptions

- Arquivos de áudio/vídeo são enviados via presigned URL diretamente ao Supabase Storage (navegador → storage, sem passar pelo servidor); servidor recebe confirmação de upload e enfileira o job no Inngest
- Estimativa de consumo é baseada em duração de arquivo (duração em minutos = créditos consumidos); não há granularidade por formato/qualidade em v1
- Processamento assíncrono é gerenciado pelo Inngest — jobs persistem estado entre steps no banco do Inngest e sobrevivem a restarts do servidor
- Notificações via email usam sistema de fila de emails existente
- Resumable uploads estão fora de escopo v1; upload interrompido gera erro e exige reenvio
- Arquivo expirado após 7 dias conforme política global (media retention policy da plataforma)
- Plataforma atua como operadora de dados sob a LGPD (Lei 13.709/2018); o escritório de advocacia é o controlador; logs de acesso mantidos por 90 dias; exclusão sob demanda é obrigação legal suportada em v1
