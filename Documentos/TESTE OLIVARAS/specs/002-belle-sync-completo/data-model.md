# Data Model: Belle Sync Completo

## Mudanças em Tabelas Existentes

### `agendamentos` — colunas novas

| Coluna | Tipo | Origem Belle | Exemplo |
|---|---|---|---|
| `tipo` | VARCHAR(50) | `agendamento.tipo` | "Consulta", "Serviço", "Retorno" |
| `sala_nome` | VARCHAR(200) | `agendamento.sala.nome` | "Sala de Procedimento" |

### `vendas` — colunas novas

| Coluna | Tipo | Origem Belle | Exemplo |
|---|---|---|---|
| `indicacao` | VARCHAR(500) | `venda_planos.indicacao` | "12866-Dra Flavia Dantas" |
| `cod_indicacao` | VARCHAR(50) | código extraído de `indicacao` | "12866" |

### `clientes` — colunas novas

| Coluna | Tipo | Origem Belle | Exemplo |
|---|---|---|---|
| `dt_cadastro_belle` | DATE | `clientes.dtCadastro` | "2025-10-20" |

---

## Nova Tabela: `parcelas`

Registra as parcelas de pagamento de cada venda/protocolo aprovado.

```
parcelas
├── id                  UUID PK
├── venda_id            UUID FK → vendas.id
├── belle_parcela_id    BIGINT UNIQUE (idParcela da Belle)
├── data_lancamento     DATE
├── data_vencimento     DATE
├── data_pagamento      DATE (null se não pago)
├── valor               NUMERIC(10,2)
├── status              VARCHAR(50) — ex: "Pendente", "Pago", "Atrasado"
├── criado_em           TIMESTAMP
└── atualizado_em       TIMESTAMP
```

**Índices**:
- `UNIQUE ON belle_parcela_id` — garante idempotência
- `INDEX ON venda_id` — queries por venda
- `INDEX ON data_vencimento` — queries de fluxo de caixa

---

## Tabela `sessoes` — Correção de Populamento

A tabela já existe mas está vazia. Estrutura esperada:

```
sessoes
├── id              UUID PK
├── venda_id        UUID FK → vendas.id
├── agendamento_id  UUID FK → agendamentos.id
├── numero_sessao   INTEGER (1, 2, 3...)
├── data_sessao     DATE
├── servico_nome    VARCHAR(300)
├── criado_em       TIMESTAMP
```

O workflow 00d deve fazer upsert nesta tabela para cada `agendamento` com `status = 'Atendido'` sem registro correspondente em `sessoes`.

---

## Impacto em `vendas.data_inicio`

Após correção do WF-C: quando a primeira sessão de uma venda for registrada na tabela `sessoes`, o WF-C deve atualizar `vendas.data_inicio` com a data dessa sessão. Isso resolve o problema de `data_inicio = NULL` em todas as vendas.
