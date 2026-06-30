# TASKS — Cobrança de Pagamento Incompleto (CashBarber → n8n)

> Última atualização: 2026-06-29
> Status geral: **PRONTO PARA TESTE SEGURO** (fluxo reconstruído p/ cobrar o cliente; dados validados no banco; falta teste seguro + ativar)

---

## 🎯 Objetivo (ATUALIZADO 2026-06-29)

Todo dia de manhã (09h), coletar do **CashBarber** os clientes com **pagamento incompleto**, registrar num banco, e:
1. **Mandar mensagem DIRETO PRO CLIENTE** (WhatsApp individual, via uazapi) avisando da pendência — tom amigável.
2. **Mandar um resumo no grupo interno** com a lista de quem foi cobrado (para a equipe acompanhar).

**Regras importantes:**
- Cliente recebe mensagem **a cada 5 dias, no máximo 2 vezes** (`total_notificacoes < 2` E último aviso > 5 dias).
- Se um cliente pagou (virou `resolvido`) e voltou a atrasar, o **contador zera** (volta a poder ser avisado).
- Se 2 clientes têm o **mesmo telefone**, manda **1 mensagem só** (dedup por telefone).
- Salvar o **horário e o texto** de cada mensagem (log em `pagamento_incompleto_notificacoes`).

> Histórico: a versão anterior só mandava alerta interno no grupo (cobrança manual). Trocado em 2026-06-29 para cobrança direta ao cliente.

---

## ✅ O QUE JÁ FOI FEITO

### 1. Descoberta do endpoint (via navegador/DevTools)
A tela "Clientes com pagamento incompleto" fica no **Dashboard Operacional** do painel CashBarber.
- **Endpoint:** `POST https://api.cashbarber.com.br/api/painel/dashboard/getClientesPagamentoIncompleto`
- **Headers:** `Authorization: Bearer <token>` · `x-context: painel` · `Content-Type: application/json;charset=UTF-8`
- **Body:** `{ "page": N }` (5 por página)
- **Resposta:** `{ "clientes": [ { clp_id_cliente, id (clp_id), cliente:{cli_name, cli_telefone}, plano:{pla_nome} } ], "total": N }`
- O token é o **mesmo** do fluxo de agendamentos (login extrai do cookie `access_token_painel`).

### 2. Tabelas criadas no Postgres "O menezinho Post" (id = uuid)
- `pagamento_incompleto` → registro de quem está/esteve atrasado (status: atrasado | resolvido), guarda `ultima_notificacao_em` e `total_notificacoes`.
- `pagamento_incompleto_notificacoes` → log de cada aviso enviado ao grupo.
- SQL final está no PASSO 1 (ver seção "SQL das tabelas" abaixo).

### 3. Workflow montado no n8n (11 nós) — arquivo `workflow_pagamento_incompleto.json`
Fluxo: `Todo dia 09h` → `Login CashBarber` → `Extrair Token` → `Coletar + Formatar` (paginação + telefone E.164) → `Montar SQL lote` → `Gravar lote (leads + atrasados)` → `Selecionar Elegiveis` → `Envia msg (grupo)` (uazapi) → `Montar SQL notificacao` → `Gravar notificacao`. (com saída de erro → `Falha no envio`)

### 4. Correções já aplicadas durante os testes
- **uuid** nas PKs das tabelas novas (em vez de bigserial).
- **Dedup por telefone:** `SELECT DISTINCT ON (telefone_e164)` + UPDATE marca todos com o mesmo telefone → não avisa 2x o mesmo número.
- **LEFT JOIN** (era INNER) para não perder cliente sem lead vinculado.
- **Nome correto:** usa `pi.nome` (nome do CashBarber) em vez de `lead_name` — porque vários leads existentes tinham nome vazio ou trocado (ex: telefone do Emanuel coelho já pertencia ao lead "Joao ricardo kuhl").

### 5. Testes feitos (com a conexão `Selecionar Elegiveis → Envia msg` DESCONECTADA, sem enviar nada)
- Gravou leads e `pagamento_incompleto` corretamente.
- Dedup funcionou (lucca + Rodrigo, mesmo telefone `5548996931758`, viraram 1).
- Nomes agora vêm corretos. ✅

---

## ⏳ O QUE FALTA FAZER (continuar aqui amanhã)

### 🔴 PASSO 3.3 — Investigar o "Joao Vitor" (PENDENTE — parei aqui)
No teste vieram **14** clientes, mas o esperado era **15**. Falta o **Joao Vitor Virícimo Grigoko** (telefone `5548999818599`, plano "Club de entrada corte e barba.").
Como agora é LEFT JOIN, isso indica que ele **não está na tabela como 'atrasado'** — provavelmente **saiu da lista do CashBarber** (pagou) entre o meu teste no navegador e o teste no n8n. **Precisa confirmar** rodando:

```sql
-- (a) quantos por status
SELECT status, count(*) FROM pagamento_incompleto GROUP BY status;

-- (b) o Joao Vitor está lá?
SELECT nome, telefone_e164, status, lead_id, ultima_deteccao
FROM pagamento_incompleto
WHERE telefone_e164 = '5548999818599';
```
E no n8n, clicar no nó `Coletar + Formatar` e ver o campo `total` (quantos coletou).
- Se ele saiu da lista → **14 está correto**, segue pro PASSO 4.
- Se ele está como 'atrasado' mas não apareceu → tem bug a corrigir.

### 🟡 PASSO 3.4 — Limpar quebra de linha cosmética no `motivo`
Ao colar a query, a linha do `ELSE` quebrou e o motivo saiu com `"...favor \n  verificar/cobrar."`. Recolar a query garantindo que o texto do CASE fique **numa linha só** (ou reimportar o `workflow_pagamento_incompleto.json`, que já está certo).

### 🟡 PASSO 4 — Testar o envio com 1 cliente só
- Reconectar `Selecionar Elegiveis → Envia msg (grupo)`.
- Limitar a 1 (ex: adicionar `LIMIT 1` temporário na query, ou um nó Limit) para mandar **1 aviso de teste** no grupo e conferir o formato da mensagem.
- Verificar que gravou em `pagamento_incompleto_notificacoes` e atualizou `ultima_notificacao_em`.

### 🟢 PASSO 5 — Decidir o disparo inicial e ATIVAR
- ⚠️ Na 1ª execução real, **todos os ~14 estão "nunca avisados"** → o grupo recebe ~14 mensagens de uma vez. Decidir:
  - (a) deixar mandar todos, ou
  - (b) limite diário (ex: máx 5/dia), ou
  - (c) consolidar tudo em **1 mensagem só** com a lista.
- Remover qualquer `LIMIT` de teste.
- **Ativar o workflow** (toggle do cron — hoje roda `0 9 * * 1-6`, seg–sáb 09h).

---

## 📌 REFERÊNCIA TÉCNICA

### Credenciais / IDs (no n8n)
- **Postgres:** `O menezinho Post` (id `WB71MPC92MHbieBr`)
- **uazapi (envio):** credencial `Uazapi Manezinho` (id `nVC4fNfNURrrsAYo`), header auth
  - URL: `https://fillipi.uazapi.com/send/text`
  - **Grupo destino:** `120363409761393631@g.us`
- **Login CashBarber:** email `kcardoso339@gmail.com` (no nó Login)
- **id_filial:** 3584 · **id_empresa:** 3576

### SQL das tabelas (PASSO 1 — já rodado)
```sql
CREATE TABLE pagamento_incompleto (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente_cashbarber bigint NOT NULL UNIQUE,
  clp_id                bigint,
  lead_id               uuid REFERENCES lead(id),
  nome                  text,
  telefone_e164         text,
  plano                 text,
  status                text NOT NULL DEFAULT 'atrasado',
  primeira_deteccao     timestamptz NOT NULL DEFAULT now(),
  ultima_deteccao       timestamptz NOT NULL DEFAULT now(),
  ultima_notificacao_em timestamptz,
  total_notificacoes    integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pagamento_incompleto_notificacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id  uuid REFERENCES pagamento_incompleto(id),
  lead_id       uuid REFERENCES lead(id),
  nome          text,
  telefone_e164 text,
  motivo        text,
  enviado_em    timestamptz NOT NULL DEFAULT now()
);
```

### Lógica da regra dos 10 dias
Na query `Selecionar Elegiveis`: só entra quem está `status='atrasado'` E
`(ultima_notificacao_em IS NULL OR ultima_notificacao_em < now() - interval '10 days')`.
Quem paga some da lista do CashBarber → vira 'resolvido' → para de ser avisado.

### Arquivos do projeto
- `workflow_pagamento_incompleto.json` — fluxo atual (versão correta, com todas as correções).
- `TASKS.md` — este arquivo.
- `dashboard-response.json` — resíduo do teste no navegador (pode apagar).

### Observação de dados conhecida
- **lucca de brito goes** e **Rodrigo de Brito goes** dividem o telefone `5548996931758` (a dedup trata isso).
- Vários telefones já existiam na tabela `lead` com nome vazio/diferente → por isso usamos o nome do CashBarber.
