# Contrato: Belle API — Agendamentos

**Workflow**: 01 v2 | **Direção**: Belle → leitura | **Date**: 2026-05-28

## Base

```
URL base: https://app.bellesoftware.com.br/api/release/controller/IntegracaoExterna/v1.0/
Auth:     Authorization: 669ebde7afafcd939eff35cc43a594cb
Método:   GET
```

## Endpoints

### GET /agendamentos

Retorna agendamentos com status "Marcado" (abertos).

**Query params**:
| Param      | Tipo   | Formato      | Descrição         |
|------------|--------|--------------|-------------------|
| `codEstab` | string | `"1"`        | Código do estabelecimento |
| `dtInicio` | string | DD/MM/YYYY   | Data início da janela |
| `dtFim`    | string | DD/MM/YYYY   | Data fim da janela |

**Janela v2**: `hoje - 2 dias` até `hoje + 30 dias`

### GET /agendamentos/finalizados

Retorna agendamentos com status "Atendido". Mesmos params.

**Janela v2**: `hoje - 2 dias` até `hoje + 30 dias`

### GET /agendamentos/cancelados

Retorna agendamentos com status "Cancelado". Mesmos params.

**Janela v2**: `hoje - 2 dias` até `hoje + 30 dias`

## Estrutura de Resposta

```json
[
  {
    "codConsulta": 12345,
    "status": "Marcado",
    "dtAgenda": "28/05/2026",
    "hrConsulta": "14:30",
    "observacao": "",
    "cliente": {
      "cod": "C001",
      "nome": "Maria Silva",
      "celular": "21999990000"
    },
    "prof": {
      "cod": "P01",
      "nome": "Dra. Ana Lima"
    },
    "sala": {
      "nome": "Sala 1"
    },
    "servicos": [
      { "cod": "S10", "nome": "Avaliação Corporal" }
    ]
  }
]
```

## Mapeamento de Campos → DB

| Campo Belle       | Campo DB (`agendamentos`)  | Transformação          |
|-------------------|----------------------------|------------------------|
| `codConsulta`     | `belle_id`                 | Nenhuma                |
| `cliente.cod`     | `belle_cliente_cod`        | Nenhuma                |
| `cliente.nome`    | `nome_cliente`             | Escapar aspas simples  |
| `cliente.celular` | `celular_cliente`          | Nenhuma                |
| `prof.cod`        | `cod_profissional`         | Nenhuma                |
| `prof.nome`       | `nome_profissional`        | Escapar aspas simples  |
| `sala.nome`       | `nome_sala`                | Nenhuma                |
| `servicos`        | `servicos`                 | `JSON.stringify()`     |
| `dtAgenda`        | `dt_agenda`                | DD/MM/YYYY → YYYY-MM-DD |
| `hrConsulta`      | `hr_consulta`              | Nenhuma                |
| `dtAgenda` + `hrConsulta` | `data_hora`      | ISO timestamp          |
| `status`          | `status`                   | Nenhuma                |
| `observacao`      | `observacao`               | Escapar aspas simples  |

## Tratamento de Erros

| Código | Comportamento                                      |
|--------|----------------------------------------------------|
| 4xx    | Registrar no sumário como erro, continuar com próximo endpoint |
| 5xx    | Interromper execução atual — tentar na próxima rodada         |
| Timeout| Interromper execução atual — tentar na próxima rodada         |
