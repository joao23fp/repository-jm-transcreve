# Clint — Campos Novos a Enviar

## Deal — Campos a Adicionar

| Campo Clint | Origem | Workflow | Prioridade |
|---|---|---|---|
| `indicacao_belle` | `vendas.indicacao` | WF-B | Alta |
| `tipo_agendamento` | `agendamentos.tipo` | 01v2 | Média |
| `sala_belle` | `agendamentos.sala_nome` | 01v2 | Baixa |

## Contato — Critério de Criação Atualizado

**Antes**: contato criado no Clint apenas se tiver venda aprovada.

**Depois**: contato criado se tiver:
- Venda aprovada (`status_plano = 'Aprovado'`) **OU**
- Agendamento nos últimos 90 dias

## SYNC Contatos — Query Atualizada

```sql
SELECT c.id as cliente_id, c.nome, c.celular, c.belle_id
FROM clientes c
WHERE c.clint_contact_uuid IS NULL
  AND c.celular IS NOT NULL
  AND c.celular != ''
  AND (
    EXISTS (
      SELECT 1 FROM vendas v
      WHERE v.cliente_id = c.id AND v.status_plano = 'Aprovado'
    )
    OR
    EXISTS (
      SELECT 1 FROM agendamentos a
      WHERE a.belle_cliente_cod = c.belle_id::text
        AND a.data_hora >= NOW() - INTERVAL '90 days'
    )
  )
ORDER BY c.criado_em DESC
LIMIT 10
```
