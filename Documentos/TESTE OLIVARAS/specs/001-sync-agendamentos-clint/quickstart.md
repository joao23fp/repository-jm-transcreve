# Quickstart: Workflow 01 v2 — Sync Agendamentos Belle → Clint

**Branch**: `001-sync-agendamentos-clint` | **Date**: 2026-05-28

## Pré-requisitos

- Acesso ao n8n ODARA RIO (instância self-hosted)
- Credencial `PostgreSQL Odara` configurada no n8n
- Token da API Clint configurado nas credenciais n8n
- WF-B (sync contatos Belle → Clint) ativo e com dados (`clint_contact_uuid` populado)
- Column `clint_status_enviado` adicionada à tabela `agendamentos` (ver Migration)

## Migration — Executar Antes do Deploy

Execute no Supabase (SQL Editor ou MCP):

```sql
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS clint_status_enviado VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_agendamentos_clint_sync
  ON agendamentos(clint_card_id, clint_status_enviado, status)
  WHERE clint_card_id IS NOT NULL;
```

## Deploy via MCP

1. Executar `/speckit-implement` para gerar o código SDK do workflow
2. Chamar `create_workflow_from_code` com o código gerado
3. **OBRIGATÓRIO**: Abrir o workflow no n8n e trocar a credencial de TODOS os nós
   Postgres de `supabase-afiliadotruppel` para `PostgreSQL Odara`
4. Verificar que o nó IF está configurado corretamente (o MCP salva IF vazio)
5. Configurar o `api-token` da Clint no nó HTTP correspondente

## Teste Manual (Antes de Ativar o Schedule)

1. Desativar temporariamente o Workflow 01 original (`wwVjH7n0hTLQust5`)
2. Executar o Workflow 01 v2 manualmente
3. Verificar o sumário de saída:
   - `total_encontrados > 0`
   - `criados` ou `atualizados > 0`
   - `erros = 0`
4. Confirmar no Clint que os cards apareceram na etapa correta
5. Confirmar no banco que `clint_card_id` foi preenchido e `clint_status_enviado` bateu com `status`

## Ativação do Schedule

Somente após teste manual bem-sucedido:

1. Habilitar o toggle do Workflow 01 v2 no n8n
2. Desativar definitivamente o Workflow 01 original
3. Verificar na próxima execução agendada que o sumário continua correto

## Schedule Configurado

| Horário  | Fuso         |
|----------|--------------|
| 07:30    | Brasília (BRT -3) |
| 13:00    | Brasília (BRT -3) |
| 16:00    | Brasília (BRT -3) |
| 20:00    | Brasília (BRT -3) |

## Verificação de Saúde

Após cada execução, o sumário ETL aparece na saída do workflow:
```json
{
  "total_encontrados": 15,
  "criados": 3,
  "atualizados": 2,
  "ignorados_sem_contato": 8,
  "erros": 0,
  "executado_em": "2026-05-28T07:30:00.000Z"
}
```

`erros > 0` é sinal de alerta — verificar os logs de execução do n8n.

## Rollback

Se o Workflow 01 v2 apresentar problemas:
1. Desativar o schedule do 01 v2
2. Reativar o Workflow 01 original temporariamente
3. Investigar logs antes de novo deploy
