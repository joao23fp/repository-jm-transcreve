# API Contracts: Módulo 004 — Biblioteca de Prompts

**Date**: 2026-04-22

---

## GET /api/prompts

Lista prompts acessíveis ao usuário: templates de sistema + prompts pessoais.

**Auth**: Clerk

**Query Params**:
- `type`: `"Sistema"` | `"Usuario"` | omitido (ambos)
- `folderId`: filtra por pasta (null = raiz)

**Response 200**:
```json
{
  "prompts": [
    {
      "id": "sys_resumo_audiencia",
      "name": "Resumo de Audiência",
      "description": "Extrai pontos principais da audiência",
      "type": "Sistema",
      "folderId": null,
      "updatedAt": "2026-04-22T00:00:00.000Z"
    },
    {
      "id": "usr_abc123",
      "name": "Análise Criminal - Foco em Móvel",
      "type": "Usuario",
      "folderId": "folder_xyz",
      "updatedAt": "2026-04-22T17:00:00.000Z"
    }
  ]
}
```

---

## POST /api/prompts

Cria novo prompt pessoal.

**Auth**: Clerk

**Request Body**:
```json
{
  "name": "Análise Criminal - Foco em Móvel",
  "description": "Focado em identificar motivação e oportunidade",
  "body": "Analise esta transcrição focando em...",
  "folderId": "folder_xyz"
}
```

**Validações**:
- `name`: obrigatório, ≤255 chars; único dentro da pasta para o userId (FR-004)
- `body`: obrigatório, ≤2000 chars (FR-003)
- `description`: opcional, ≤500 chars
- Limite de 1000 prompts por usuário (FR-003 implícito)

**Response 201**: `{ "id": "usr_abc123", "name": "...", "type": "Usuario" }`
**Response 409**: `{ "error": "DUPLICATE_NAME", "message": "Já existe prompt com este nome nesta pasta" }`
**Response 429**: `{ "error": "LIMIT_REACHED", "message": "Limite de 1000 prompts atingido" }`

---

## GET /api/prompts/:id

Retorna detalhes completos de um prompt (inclui `body`).

**Auth**: Clerk (valida acesso: próprio userId ou tipo Sistema)

**Response 200**:
```json
{
  "id": "sys_resumo_audiencia",
  "name": "Resumo de Audiência",
  "description": "...",
  "body": "Analise esta transcrição e produza...",
  "type": "Sistema",
  "folderId": null
}
```

---

## PUT /api/prompts/:id

Edita um prompt pessoal (tipo=Usuario). Bloqueado para tipo=Sistema.

**Auth**: Clerk (valida userId === prompt.userId)

**Request Body**: campos editáveis (`name`, `description`, `body`, `folderId`)

**Response 200**: prompt atualizado
**Response 403**: `{ "error": "FORBIDDEN", "message": "Templates de sistema não podem ser editados" }`

---

## DELETE /api/prompts/:id

Soft-delete de prompt pessoal. Bloqueado para tipo=Sistema.

**Auth**: Clerk (valida userId)

**Response 200**: `{ "ok": true }`
**Response 403**: `{ "error": "FORBIDDEN" }`

---

## POST /api/prompts/:id/duplicate

Duplica um template (Sistema ou pessoal) para a biblioteca pessoal do usuário.

**Auth**: Clerk

**Request Body**: `{ "folderId": "folder_xyz" }` (opcional)

**Comportamento**: cria novo `PromptTemplate` com `type=Usuario`, `userId=autenticado`, `name="[Meu] {nome original}"`.

**Response 201**: `{ "id": "usr_new123", "name": "[Meu] Resumo de Audiência" }`

---

## GET /api/folders

Lista pastas do usuário (hierarquia completa até 3 níveis).

**Auth**: Clerk

**Response 200**:
```json
{
  "folders": [
    {
      "id": "folder_1",
      "name": "Casos Criminais",
      "parentFolderId": null,
      "children": [
        { "id": "folder_2", "name": "Réus Primários", "parentFolderId": "folder_1", "children": [] }
      ]
    }
  ]
}
```

---

## POST /api/folders

Cria nova pasta.

**Auth**: Clerk

**Request Body**: `{ "name": "Casos Criminais", "parentFolderId": null }`

**Validação**: máximo 3 níveis de aninhamento (verificado no service)

**Response 201**: `{ "id": "folder_1", "name": "Casos Criminais" }`

---

## DELETE /api/folders/:id

Deleta pasta e todos os prompts dentro dela (com modal de confirmação no cliente).

**Auth**: Clerk (valida userId)

**Response 200**: `{ "ok": true, "deletedPrompts": 5 }`

---

## POST /api/prompt-applications

Registra aplicação de prompt em análise (audit trail).

**Auth**: Clerk

**Request Body**:
```json
{
  "fileId": "job_abc123",
  "promptId": "usr_abc123"
}
```

**Response 201**: `{ "id": "pa_xyz", "appliedAt": "2026-04-22T17:00:00.000Z" }`
