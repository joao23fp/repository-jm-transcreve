<!--
# 🔄 Sync Impact Report (Constitution v1.1.0)

**Version Change**: 1.0.0 → 1.1.0
**Effective Date**: 2026-04-17
**Release Type**: MINOR (nova seção de arquitetura + correções de conflito)

## Changes Summary

- ✅ **Nova Seção**: "Technical Architecture & Standards" adicionada com base no TECH_STACK_v4.md
- ✅ **Princípio V atualizado**: referência a "Stripe" substituída por "Pagar.me" (gateway nacional)
- ✅ **Seção Async Processing**: menciona Inngest explicitamente como sistema de fila
- ✅ **Seção Payment & Billing**: atualizada para Pagar.me + Pix/boleto/cartão
- ✅ **Seção Observability**: expandida com Sentry, Inngest panel e Vercel logs
- ⚠️ **Conflito Flaggeado**: Diarização — TECH_STACK diz "Fora do MVP", mas Módulo 002 exige identificação
  de falantes. Decisão técnica necessária antes de implementar o Módulo 002.
- ⚠️ **Conflito Flaggeado**: Formatos aceitos — TECH_STACK inclui WebM; spec Module 001 clarificou
  MP4, MKV, MOV, AVI, MP3, WAV, M4A, OGG (sem WebM, com MKV/AVI/OGG). Spec clarification é autoritativa.

## Templates — Status

- plan-template.md: ✅ Seção "Technical Context" agora tem valores padrão da stack
- spec-template.md: ⚠️ Sem alteração necessária (template é tech-agnostic por design)
- tasks-template.md: ⚠️ Sem alteração necessária (estrutura de tarefas é genérica)

## Deferred Items

- TODO(DIARIZATION_DECISION): Definir provedor de diarização para Módulo 002 (Groq Whisper
  não suporta nativamente; candidatos: AssemblyAI, Deepgram). Bloqueia implementação do Módulo 002.

---
-->

# TranscreveAdv Constitution

Legal-tech platform providing AI-powered transcription, analysis, and evidence extraction for the judicial workflow.

## Core Principles

### I. Spec-First Development

**Every feature begins as a detailed specification before any code is written.**
- Specifications MUST include: User Scenarios (with priority levels), Edge Cases, Functional
  Requirements (FR), Key Entities, and Success Criteria.
- Specifications are approved by the product team before development begins.
- No deviation from specification without amendment and re-approval.
- Each specification establishes the test contract: tests are written to match the spec before
  implementation.

**Rationale**: Legal professionals require predictable, auditable software. Spec-First ensures
transparency and verifiability of each feature's behavior.

### II. Legal-Grade Reliability & Data Integrity

**The system assumes lawyers depend on it for evidence; failures have legal consequences.**
- MUST: All transactional operations (credits, file processing, payment confirmations) are
  idempotent and logged.
- MUST: Sensitive data (audio/video) is encrypted at rest and in transit.
- MUST: No data loss under any circumstance. Data retention: Transcriptions (permanent);
  Audio/Video media (7 days expiration, with warning).
- MUST: Balance reservations (pre-deductions for tasks) are never double-charged; failed tasks
  refund credits within 30 seconds.
- MUST: Webhook confirmations from payment processors are validated and reconciled. If a webhook
  fails 3 times, escalate to manual review.
- MUST: File access is isolated per user — no user may access another user's files, jobs, or
  credit reservations.
- MUST: Access logs retained for 90 days; user data deletion supported on demand (LGPD compliance).

**Rationale**: Legal cases hinge on accurate evidence. The system is not a best-effort tool; it is
a mission-critical service handling data protected under LGPD.

### III. User-Centric AI Integration

**Every AI-generated output MUST provide verifiable traceability to source material.**
- AI analysis (contradictions, summaries, queries) MUST cite the exact timestamp/transcript
  segment it references.
- AI features are opt-in; the system must never force AI analysis on user-provided content
  without consent.
- Chat responses about a file are scoped to that file only (no cross-file data leakage).
- Personalization (custom prompts, speaker profiles) MUST persist per user and be editable
  at any time.
- Groq API configured with opt-out of training data usage; terms of use disclose third-party
  audio processing.

**Rationale**: Lawyers must know where AI insights come from to trust them in a legal context.
Transparency builds confidence and LGPD compliance.

### IV. Modular Architecture & Independent Deployability

**Each feature module is built as an independent, testable component with clear contracts.**
- Modules: Upload & Queue, Intelligence & Visualization, Evidence Clipping, Prompt Management,
  Admin & Billing.
- Each module has its own service layer (`*.service.ts`), database schema via Prisma migrations,
  and test suite.
- Inter-module communication is asynchronous (Inngest jobs, webhooks) wherever possible.
- Module failures do not cascade; the system degrades gracefully (e.g., if video clipping fails,
  transcription remains available).
- Structure follows feature-based organization: each module has a dedicated folder under `app/`.

**Rationale**: Legal workflows are heterogeneous. Modularity allows selective updates and rollbacks
without affecting the entire system.

### V. Transparent Cost Accounting

**Every credit/minute consumed is tracked, predictable, and reversible.**
- MUST: Saldo (credit balance) is calculated as: `saldo_disponivel = saldo_total - saldo_bloqueado`.
- MUST: Before processing starts, the system reserves (blocks) the estimated cost. Actual
  consumption is reconciled upon task completion (refund if under-consumed).
- MUST: Users are notified when balance reaches 20% and 5% thresholds.
- MUST: Payment attempts (Pagar.me) are tracked as PaymentIntent entities with status
  (Pending/Success/Failed/Expired); unconfirmed intents expire after 24 hours.
- MUST: All transactions are logged and reconcilable via the Admin Dashboard.
- MUST: Cobrança recorrente com período de graça de 3 dias em caso de falha no cartão.

**Rationale**: Legal professionals are cost-conscious and must justify software expenses to clients.
Transparent accounting builds trust and prevents billing disputes.

## Technical Architecture & Standards

> **Fonte autoritativa**: `TECH_STACK_v4.md` — decisões técnicas documentadas para o projeto.
> Esta seção resume as decisões vinculantes. O arquivo completo é a referência canônica.

### Stack Principal

| Camada | Tecnologia | Observação |
|--------|-----------|------------|
| Linguagem | TypeScript | padrão do projeto inteiro |
| Framework | Next.js (App Router) | SSR padrão, front+back unificados |
| Banco de dados | PostgreSQL via Supabase | texto de transcrição armazenado no banco |
| ORM | Prisma + Prisma Migrate | migrações versionadas obrigatórias |
| Fila assíncrona | Inngest | jobs em background com retry automático |
| Transcrição IA | Groq Whisper | opt-out de treinamento configurado |
| Storage | Supabase Storage | upload via presigned URL (não passa pelo servidor) |
| Tempo real | Supabase Realtime | atualização de status sem polling |
| UI | shadcn/ui + Tailwind CSS | componentes reutilizáveis |
| Autenticação | Clerk | middleware centralizado + verificação de cota |
| E-mail | Resend | 5 e-mails críticos definidos |
| Testes | Vitest | foco nas regras críticas de negócio |
| Monitoramento | Sentry + Inngest panel + Vercel logs | três camadas independentes |
| Deploy | Vercel + GitHub | deploy automático, rollback com um clique |
| Pagamentos | Pagar.me | Pix, boleto e cartão; módulo de assinaturas nativo |

### Padrões de Código

- **Nomenclatura**: camelCase para funções/variáveis; PascalCase para componentes React;
  SNAKE_CASE_UPPER para enums/constantes.
- **Enums**: todos os status e constantes centralizados em `lib/enums.ts`
  (ex: `StatusTranscricao`, `TipoArquivo`, `FormatoAceito`).
- **Regras de negócio**: isoladas em camada de serviços (`*.service.ts`) —
  nunca misturadas com rotas ou componentes de UI.
- **Estrutura de pastas**: por feature (`app/uploads/`, `app/transcricoes/`, etc.).

### Formatos de Arquivo Aceitos

Vídeo: `MP4`, `MKV`, `MOV`, `AVI` — Áudio: `MP3`, `WAV`, `M4A`, `OGG`
Limite por arquivo: **2 GB de tamanho / 4 horas de duração**.

> Nota: TECH_STACK_v4.md inclui WebM como formato aceito. A clarificação do Módulo 001
> (spec session 2026-04-17) é autoritativa e substituiu WebM por MKV, AVI e OGG.
> TECH_STACK_v4.md deve ser atualizado para refletir essa decisão.

### Decisão Pendente — Diarização (Módulo 002)

**TODO(DIARIZATION_DECISION)**: O Módulo 002 requer identificação automática de falantes
(Speaker Diarization). O Groq Whisper não suporta diarização nativamente. Antes de implementar
o Módulo 002, DEVE ser definido:
- Provedor de diarização (candidatos: AssemblyAI, Deepgram, pyannote.audio auto-hospedado)
- Integração com o pipeline Inngest existente
- Impacto no custo por minuto processado

**Esta decisão bloqueia o início da implementação do Módulo 002.**

## Data Retention & Privacy

- **Transcriptions**: Retained permanently (encrypted, user-deletable on demand).
- **Audio/Video Media**: Automatically deleted after 7 days (warning issued at day 6).
- **Access Logs**: Retained for 90 days (LGPD compliance — platform as data operator).
- **Transaction Logs**: Retained for 2 years for compliance and audit purposes.
- **Deleted Files**: Cascade-deleted (associated clipping, analysis, and temporary files removed).
- **User Data**: Full deletion on demand (LGPD Art. 18 — right to elimination).
- **AI Provider**: Groq opt-out of training data; disclosed in terms of use.

## Async Processing & Resilience

- **Fila**: Inngest gerencia todos os jobs de processamento (transcrição, análise de IA,
  renderização de clipes). Cada etapa dentro do limite de execução da plataforma de deploy.
- **Retries**: Falhas de transcrição (provedor externo) e de análise de IA seguem a mesma
  política: até 3 retentativas automáticas; créditos estornados integralmente após falha final.
- **Webhooks**: Payment processor confirmations require ACK; unconfirmed after 24 hours expire
  the PaymentIntent and release blocked credits.
- **Recovery**: All processing jobs logged with state machine
  (Pending → Processing → Completed/Failed) visible in Inngest panel.
- **Notificações**: toast in-app + e-mail via Resend ao completar ou falhar cada job.

## Payment & Billing Integration

- **Gateway**: Pagar.me — suporta Pix, boleto e cartão de crédito; módulo de assinaturas nativo;
  sandbox disponível para testes.
- **Checkout Flow**: Redirect para Pagar.me. Usuária retorna ao Dashboard com PaymentIntent status.
- **Webhook Reconciliation**: Credit addition is atomic (no duplicate charges) and completes
  within 30 seconds of webhook confirmation.
- **Falha de cobrança**: Período de graça de 3 dias; Pagar.me tenta novamente em 1, 2 e 3 dias;
  e-mail de aviso a cada tentativa; acesso suspenso somente após esgotamento da graça.
- **Tiered Pricing**: Pacotes de créditos em minutos (ex: 99 min, 199 min, 499 min); sem freemium.
- **Compliance**: All transactions logged; billing records exportable for accounting.

## Observability & Monitoring

- **Erros em produção**: Sentry — alertas automáticos com linha exata do código.
- **Jobs assíncronos**: Inngest panel — monitoramento de cada job, tentativas, falhas e tempo.
- **Logs da aplicação**: Vercel logs — incluídos gratuitamente no plano.
- **Alertas de negócio**: Dashboard com alertas para: jobs falhados, anomalias de pagamento,
  inconsistências de reconciliação de crédito.

## Development Workflow & Quality Gates

- **Code Review**: All PRs reviewed against specification compliance and this constitution
  before merge.
- **Testing**: Vitest para regras críticas de negócio (cota, status de jobs, validação de
  formatos, reconciliação de créditos). Integração obrigatória para fluxos de pagamento e
  consistência de dados.
- **Deployment**: Vercel com deploy automático via GitHub. Rollback com um clique.
  Preview automático para cada branch.
- **Monitoring**: Sentry + Inngest + Vercel logs cobrindo servidor, fila e IA respectivamente.

## Governance

This constitution is the single source of truth for TranscreveAdv development practices.
It supersedes all other informal guidelines or assumptions.

**Amendment Procedure**:
1. Proposed amendment documents the change (which principle, why, impact on specs/templates).
2. Product team + lead developer approval required.
3. Version bumped (MAJOR = principle removal/redefinition, MINOR = new principle/section,
   PATCH = clarification).
4. All affected templates and specs are updated (see Sync Impact Report).
5. Commit message: `docs(constitution): amend to vX.Y.Z (<summary>)`.

**Compliance Review**: This constitution is reviewed quarterly or when critical bugs suggest
process failures.

**Enforcement**: All PRs on feature branches must verify:
- [ ] Specification exists and is approved
- [ ] Test contract matches spec
- [ ] Data retention/async/payment logic follows principles
- [ ] Tech stack choices align with Section "Technical Architecture & Standards"
- [ ] At least one reviewer confirms compliance

---

**Version**: 1.1.0 | **Ratified**: 2026-04-16 | **Last Amended**: 2026-04-17
