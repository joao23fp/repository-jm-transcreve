# Log de Leads Criados — ODARA RIO
**Integração Clint → Belle via WF-ONBOARD-LEADS**

Sempre que o workflow `ODARA | ONBOARD - Leads Clint com Deal OPEN → Belle` criar um lead na Belle,
o registro fica salvo na tabela `odara_leads_log` do Supabase.

---

## Como consultar os leads criados

```sql
-- Ver todos os leads criados pela integração
SELECT 
  id,
  belle_id,
  clint_contact_uuid,
  clint_deal_uuid,
  nome,
  telefone,
  email,
  acao,
  criado_em
FROM odara_leads_log
ORDER BY criado_em DESC;
```

---

## Como excluir um lead criado por engano

```sql
-- 1. Identificar o lead pelo nome ou belle_id
SELECT belle_id, nome, telefone, email FROM odara_leads_log WHERE nome ILIKE '%nome da pessoa%';

-- 2. Remover do banco de dados local
DELETE FROM clientes WHERE belle_id = NUMERO_AQUI;
DELETE FROM odara_leads_log WHERE belle_id = NUMERO_AQUI;

-- 3. Para remover da Belle também, use o endpoint:
-- PUT /agenda/status com novoStatus = "Cancelado" (para agendamentos)
-- ou contate a Belle para exclusão manual do cadastro
```

---

## Histórico de execuções

| Data | Quantidade criados | Observação |
|---|---|---|
| (preencher após cada execução) | | |

---

## Leads criados — Execução 1 (20/05/2026)

**Workflow:** ODARA | ONBOARD - Leads Clint com Deal OPEN → Belle
**Limite testado:** 5 contatos

| belle_id | Nome | Telefone | Clint UUID | Deal UUID |
|---|---|---|---|---|
| 16484703 | Rithielli Vargas | 21996404243 | 5cf8ee56-ad0a-4b31-bb01-29dbc1bcc295 | ffdfd80c-8f66-403e-a858-ed4477d7e8cc |
| 16484707 | Valeria | 21987296157 | 26bde5e0-48ac-49ca-a91a-b5a88cdbeb60 | ff86f043-677f-41b7-87a6-cd51df191c1b |
| 16484710 | IVANA | 21986695090 | 15665062-cf00-4f14-96bc-8b89c54e8f85 | fec3c109-d540-4052-a96a-099f08088aed |
| 16484704 | PA | 15165812987 | 598b8a93-cd6f-4a0a-9b07-994d88a65f46 | feafea4a-eaf9-45cc-a092-3c1787c37687 |
| 16484706 | May Moura | 61999810748 | 85177ed9-6778-4a7c-9d22-eac0cba38c3d | fea1a726-dfaa-4286-9f56-8e3be0f08c23 |

**Nota:** Ocorreu pairedItem mismatch na primeira execução — belle_ids foram corrigidos manualmente no Supabase em 20/05/2026.
