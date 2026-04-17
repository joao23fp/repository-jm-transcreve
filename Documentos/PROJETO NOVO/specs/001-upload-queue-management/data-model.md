# Data Model: Módulo de Envio Ágil

**Feature**: 001-upload-queue-management
**Date**: 2026-04-17

---

## Entidades

### ProcessingJob

Representa um job de processamento de arquivo (transcrição + análise de IA).

```prisma
model ProcessingJob {
  id                    String              @id @default(cuid())
  userId                String
  fileName              String
  storagePath           String              // path no Supabase Storage
  fileSizeBytes         Int
  mimeType              String
  estimatedMinutes      Float               // duração lida client-side
  blockedMinutes        Float               // créditos reservados antes do upload
  actualMinutesConsumed Float?              // preenchido após conclusão
  status                StatusProcessamento @default(PENDING)
  currentStage          EtapaProcessamento  @default(UPLOADING)
  retryCount            Int                 @default(0)
  promptId              String?             // nullable — prompt de contexto (P2)
  errorMessage          String?
  createdAt             DateTime            @default(now())
  completedAt           DateTime?

  fileUpload            FileUpload?
  creditReservation     CreditReservation?
  user                  User                @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@index([userId, createdAt])
}
```

**Estados válidos** (`StatusProcessamento`):
```
PENDING → PROCESSING → COMPLETED
                     ↘ FAILED
```

**Etapas visíveis na UI** (`EtapaProcessamento`):
```
UPLOADING → QUEUED → TRANSCRIBING → ANALYZING → COMPLETED | FAILED
```

---

### FileUpload

Metadados do arquivo enviado ao Supabase Storage.

```prisma
model FileUpload {
  id                  String       @id @default(cuid())
  userId              String
  jobId               String       @unique
  fileName            String
  fileSizeBytes       Int
  mimeType            String
  storagePath         String
  presignedUrlExpiresAt DateTime   // TTL da presigned URL gerada
  uploadConfirmedAt   DateTime?    // quando o servidor recebeu confirmação do upload
  processingStartTime DateTime?
  processingEndTime   DateTime?
  createdAt           DateTime     @default(now())

  job                 ProcessingJob @relation(fields: [jobId], references: [id])
  user                User          @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

---

### CreditReservation

Reserva de créditos pré-upload. Liberada ou estornada após conclusão do job.

```prisma
model CreditReservation {
  id              String              @id @default(cuid())
  userId          String
  jobId           String              @unique
  reservedMinutes Float
  status          StatusReserva       @default(ACTIVE)
  createdAt       DateTime            @default(now())
  releasedAt      DateTime?           // quando liberada/estornada

  job             ProcessingJob       @relation(fields: [jobId], references: [id])
  user            User                @relation(fields: [userId], references: [id])

  @@index([userId, status])
}
```

**Estados** (`StatusReserva`): `ACTIVE | RELEASED | REFUNDED`

---

### Wallet (complemento — referenciado por este módulo)

Gerenciado pelo Módulo 005, mas consultado/atualizado aqui para bloqueio e reconciliação.

```prisma
model Wallet {
  id              String   @id @default(cuid())
  userId          String   @unique
  saldoTotal      Float    @default(0)
  saldoBloqueado  Float    @default(0)     // soma das CreditReservations ACTIVE
  // saldoDisponivel = saldoTotal - saldoBloqueado (calculado em runtime)
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id])
}
```

---

## Enums

```typescript
// lib/enums.ts — adições para este módulo

export enum StatusProcessamento {
  PENDING     = 'PENDING',
  PROCESSING  = 'PROCESSING',
  COMPLETED   = 'COMPLETED',
  FAILED      = 'FAILED',
}

export enum EtapaProcessamento {
  UPLOADING    = 'UPLOADING',
  QUEUED       = 'QUEUED',
  TRANSCRIBING = 'TRANSCRIBING',
  ANALYZING    = 'ANALYZING',
  COMPLETED    = 'COMPLETED',
  FAILED       = 'FAILED',
}

export enum StatusReserva {
  ACTIVE   = 'ACTIVE',
  RELEASED = 'RELEASED',   // créditos exatos consumidos liberados
  REFUNDED = 'REFUNDED',   // estorno total por falha
}

export enum FormatoAceito {
  MP4 = 'mp4',
  MKV = 'mkv',
  MOV = 'mov',
  AVI = 'avi',
  MP3 = 'mp3',
  WAV = 'wav',
  M4A = 'm4a',
  OGG = 'ogg',
}
```

---

## Regras de Integridade

- `ProcessingJob.userId` DEVE corresponder a `CreditReservation.userId` (validado em transaction)
- `CreditReservation.reservedMinutes` DEVE ser igual a `ProcessingJob.estimatedMinutes` no momento da criação
- `Wallet.saldoBloqueado` DEVE ser sempre ≥ 0 e ≤ `Wallet.saldoTotal`
- Somente uma `CreditReservation` ACTIVE por `jobId` (garantido pelo `@unique`)
- `ProcessingJob` com status `COMPLETED` DEVE ter `actualMinutesConsumed` preenchido
- Nenhum job de um `userId` pode acessar dados de outro `userId` (RLS no Supabase + middleware)

---

## Diagrama de Relacionamentos

```
User
 ├── Wallet (1:1)
 ├── ProcessingJob (1:N)
 │    ├── FileUpload (1:1)
 │    └── CreditReservation (1:1)
 └── FileUpload (1:N)
```
