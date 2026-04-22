# Data Model: Módulo 004 — Biblioteca de Prompts de IA

**Feature**: 004-prompt-library-management
**Date**: 2026-04-22

---

## Modelos Existentes (sem alteração de schema)

| Modelo | Módulo | Uso neste módulo |
|--------|--------|-----------------|
| `ProcessingJob` | 001 | `fileId` referenciado em `PromptApplication` para audit trail |
| `User` (Clerk) | — | `userId` para isolar prompts pessoais |

---

## Novos Modelos

### Enum: TipoPrompt

```prisma
enum TipoPrompt {
  Sistema  // template imutável; userId = null; não editável por usuários
  Usuario  // criado/editado pelo usuário; vinculado a userId específico
}
```

Adicionar a `lib/enums.ts` (Constitution: todos enums centralizados).

### Model: PromptFolder

```prisma
model PromptFolder {
  id             String         @id @default(cuid())
  userId         String
  name           String         // ≤255 chars
  parentFolderId String?        // null = pasta raiz; suporta até 3 níveis
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  parent         PromptFolder?  @relation("FolderHierarchy", fields: [parentFolderId], references: [id])
  children       PromptFolder[] @relation("FolderHierarchy")
  prompts        PromptTemplate[]

  @@index([userId, parentFolderId])
}
```

### Model: PromptTemplate

```prisma
model PromptTemplate {
  id          String       @id @default(cuid())
  userId      String?      // null = template de sistema
  folderId    String?      // null = sem pasta (raiz da biblioteca)
  name        String       // ≤255 chars; único dentro da mesma pasta por userId
  description String?      // ≤500 chars
  body        String       // ≤2000 chars; instrução de sistema para a IA
  type        TipoPrompt   @default(Usuario)
  isDeleted   Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  folder      PromptFolder? @relation(fields: [folderId], references: [id])
  applications PromptApplication[]

  @@unique([userId, folderId, name])
  @@index([userId, type, isDeleted])
  @@index([folderId])
}
```

### Model: PromptApplication

```prisma
model PromptApplication {
  id        String         @id @default(cuid())
  fileId    String         // ProcessingJob.id (referência lógica, sem FK)
  userId    String
  promptId  String
  appliedAt DateTime       @default(now())
  prompt    PromptTemplate @relation(fields: [promptId], references: [id])

  @@index([userId, fileId])
  @@index([promptId])
}
```

---

## Diagrama de Relacionamentos

```
PromptFolder (hierarquia auto-referencial, 3 níveis máx.)
    │ 1
    │ N
PromptTemplate ──────── PromptApplication ──── ProcessingJob (001)
(userId=null → Sistema)    (audit trail)
(userId=X → Usuario)
```

---

## Notas de Implementação

- Templates de sistema: `userId = null`, `type = 'Sistema'` — bloqueio de edição/deleção enforçado no `prompts.service.ts`
- `@@unique([userId, folderId, name])`: unicidade de nome dentro da mesma pasta por usuário (FR-004)
- Para templates de sistema (userId=null), a unicidade de nome é garantida pela constraint (null, folderId, name)
- `isDeleted` (soft delete): deleção de prompts não remove `PromptApplication` histórico (audit trail preservation — Constitution Princípio II)
- Deleção de pasta: exclusão em cascata de `PromptTemplate` vinculadas (service-level, com confirmação)
- Limite de 1000 prompts/usuário enforçado no service (count antes de insert)
- Seed: templates de sistema com IDs fixos (ex: `"sys_resumo_audiencia"`) para idempotência via `upsert`

---

## Seed Inicial (Templates de Sistema)

```typescript
// prisma/seed-prompts.ts
const SYSTEM_TEMPLATES = [
  { id: 'sys_resumo_audiencia', name: 'Resumo de Audiência', body: 'Analise esta transcrição e produza um resumo estruturado...' },
  { id: 'sys_analise_contradicoes', name: 'Análise de Contradições', body: 'Identifique contradições, inconsistências e mudanças de versão...' },
  { id: 'sys_fatos_chave', name: 'Extração de Fatos-Chave', body: 'Liste cronologicamente os fatos objetivos mencionados...' },
  { id: 'sys_perfil_falante', name: 'Perfil do Falante', body: 'Analise o comportamento comunicativo e credibilidade...' },
  { id: 'sys_cronologia', name: 'Cronologia do Caso', body: 'Extraia e ordene cronologicamente todos os eventos mencionados...' },
]
```

---

## Migration

```bash
npx prisma migrate dev --name add-prompt-library-module
```
