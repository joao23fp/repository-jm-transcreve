# Data Model: Workflow 01 v2 — Sync Agendamentos Belle → Clint

**Branch**: `001-sync-agendamentos-clint` | **Date**: 2026-05-28

## Entidades

### Agendamento (tabela: `agendamentos`)

Representa um agendamento Belle sincronizado no banco e (eventualmente) no Clint.

| Campo                 | Tipo           | Descrição                                          |
|-----------------------|----------------|----------------------------------------------------|
| `id`                  | UUID PK        | Identificador interno                              |
| `belle_id`            | INTEGER UNIQUE | Chave de upsert — `codConsulta` da Belle           |
| `clint_card_id`       | UUID           | ID do deal no Clint (NULL = ainda não criado)      |
| `clint_status_enviado`| VARCHAR(50)    | Último status enviado ao Clint (**novo campo**)     |
| `cliente_id`          | UUID FK        | Referência à tabela `clientes`                     |
| `belle_cliente_cod`   | VARCHAR(20)    | Código do cliente na Belle (join com clientes)     |
| `nome_profissional`   | VARCHAR(255)   | Nome da profissional responsável                   |
| `nome_sala`           | VARCHAR(100)   | Sala de atendimento                                |
| `servicos`            | JSONB          | Array `[{cod, nome}]`                              |
| `dt_agenda`           | DATE           | Data do agendamento (DD/MM/YYYY → ISO)             |
| `hr_consulta`         | VARCHAR(10)    | Horário HH:MM                                      |
| `data_hora`           | TIMESTAMP      | `dt_agenda + hr_consulta` combinados               |
| `status`              | VARCHAR(50)    | Status atual Belle: Marcado / Atendido / Cancelado |
| `sinc_em`             | TIMESTAMP      | Última vez que a Belle foi consultada para este    |
| `atualizado_em`       | TIMESTAMP      | Trigger automático de update                       |

**Transições de status e etapa Clint**:
```
Belle status      →  Clint stage_id                           →  Etapa Clint
────────────────────────────────────────────────────────────────────────────
Marcado           →  711be8cc-a0cb-4bcb-ae40-428f1ad47873    →  Avaliação Agendada
Cancelado         →  455aafb0-8fef-45d6-beb4-41888cc7d18a    →  Reagendar
Atendido          →  f09cdbdb-fb8e-4f04-b5f8-4a20a8de3341    →  Consulta Realizada
```

**Regras de lifecycle**:
1. Upsert via `belle_id` (ON CONFLICT belle_id DO UPDATE)
2. Criar card Clint quando `clint_card_id IS NULL` e `clint_contact_uuid IS NOT NULL`
3. Mover etapa quando `clint_card_id IS NOT NULL` e `status != clint_status_enviado`
4. Após criar/mover: atualizar `clint_card_id` e `clint_status_enviado` no banco
5. LIMIT 20 por execução (segurança)

### Cliente (tabela: `clientes` — leitura apenas)

Usado via JOIN para obter `clint_contact_uuid`.

| Campo               | Tipo    | Descrição                              |
|---------------------|---------|----------------------------------------|
| `id`                | UUID PK |                                        |
| `belle_cliente_cod` | INTEGER | Join com `agendamentos.belle_cliente_cod` |
| `clint_contact_uuid`| UUID    | ID do contato no Clint (NULL = ignorar)|

### Card Clint (deal — entidade externa)

Criado via API Clint. Não persiste no banco (apenas o `clint_card_id` é salvo).

| Campo        | Valor                                              |
|--------------|----------------------------------------------------|
| `contact_id` | `clint_contact_uuid` da paciente                   |
| `origin_id`  | UUID do funil "ODARA \| Aquisição TESTE"           |
| `stage_id`   | UUID da etapa conforme status Belle                |
| `name`       | Ex: "Avaliação — [Nome da paciente] — DD/MM"       |

## Migration SQL — Campo Novo

```sql
-- Adicionar coluna de rastreamento do status enviado ao Clint
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS clint_status_enviado VARCHAR(50);

-- Índice para queries de sync pendente
CREATE INDEX IF NOT EXISTS idx_agendamentos_clint_sync
  ON agendamentos(clint_card_id, clint_status_enviado, status)
  WHERE clint_card_id IS NOT NULL;
```

## Queries Principais

### Buscar agendamentos para criar card no Clint

```sql
SELECT
  a.id,
  a.belle_id,
  a.status,
  a.data_hora,
  a.nome_profissional,
  a.nome_sala,
  a.servicos,
  c.clint_contact_uuid
FROM agendamentos a
JOIN clientes c
  ON c.belle_cliente_cod::text = a.belle_cliente_cod
WHERE a.data_hora BETWEEN NOW() - INTERVAL '2 days' AND NOW() + INTERVAL '30 days'
  AND c.clint_contact_uuid IS NOT NULL
  AND a.clint_card_id IS NULL
ORDER BY a.data_hora ASC
LIMIT 20;
```

### Buscar agendamentos para atualizar etapa no Clint

```sql
SELECT
  a.id,
  a.clint_card_id,
  a.status,
  a.clint_status_enviado
FROM agendamentos a
WHERE a.data_hora BETWEEN NOW() - INTERVAL '2 days' AND NOW() + INTERVAL '30 days'
  AND a.clint_card_id IS NOT NULL
  AND (a.clint_status_enviado IS NULL OR a.status != a.clint_status_enviado)
LIMIT 20;
```

### Salvar clint_card_id após criação

```sql
UPDATE agendamentos
SET clint_card_id = $1,
    clint_status_enviado = $2,
    atualizado_em = NOW()
WHERE id = $3;
```

### Atualizar status enviado após mover etapa

```sql
UPDATE agendamentos
SET clint_status_enviado = $1,
    atualizado_em = NOW()
WHERE id = $2;
```

## Contadores do Sumário ETL (FR-011)

Variáveis mantidas no nó Code final:

```
total_encontrados    = total de agendamentos na janela com clint_contact_uuid
criados             = cards novos criados no Clint com sucesso
atualizados         = etapas movidas no Clint com sucesso
ignorados_sem_contato = agendamentos sem clint_contact_uuid
erros               = respostas 4xx da API Clint
```
