# Belle API — Campos Novos a Capturar

## Endpoint: `/agendamentos`

| Campo Belle | Campo DB | Workflow | Status atual |
|---|---|---|---|
| `tipo` | `agendamentos.tipo` | 01v2 | ❌ Não capturado |
| `sala.nome` | `agendamentos.sala_nome` | 01v2 | ❌ Não capturado |
| `cliente.celular` | `agendamentos.celular_cliente` | 01v2 | ✅ Capturado |
| `cliente.nome` | `agendamentos.nome_cliente` | 01v2 | ✅ Capturado |

Exemplo de resposta:
```json
{
  "codConsulta": 68922065,
  "tipo": "Consulta",
  "sala": { "cod": "66985", "nome": "Sala de Procedimento" },
  "status": "Marcado",
  "cliente": { "cod": "16559580", "nome": "João Miguel", "celular": "(11)99602-5026" }
}
```

---

## Endpoint: `/venda_planos`

| Campo Belle | Campo DB | Workflow | Status atual |
|---|---|---|---|
| `indicacao` | `vendas.indicacao` | WF-B | ❌ Não capturado |
| `parcelas[*]` | tabela `parcelas` | WF-B | ❌ Não capturado |
| `dataVenda` | `vendas.data_venda` | WF-B | ✅ Capturado |
| `vendedor` | `vendas.vendedor` | WF-B | ✅ Capturado |
| `servicos[*]` | `vendas.servicos` | WF-B | ✅ Capturado |

Exemplo de campos novos:
```json
{
  "indicacao": "12866-Dra Flavia Dantas",
  "parcelas": [
    {
      "idParcela": 32799841,
      "dataLancamento": "01/04/2026",
      "dataVencimento": "01/05/2026",
      "dataPagamento": null,
      "valor": "400,00",
      "status": "Pendente"
    }
  ]
}
```

---

## Endpoint: `/clientes`

| Campo Belle | Campo DB | Status atual |
|---|---|---|
| `dtCadastro` | `clientes.dt_cadastro_belle` | ❌ Não capturado |
| `celular` | `clientes.celular` | ✅ Capturado |
| `dtNascimento` | `clientes.dt_nascimento` | ✅ Capturado |
