# Data Model: LinkedIn Prospecting Bot

**Date**: 2026-05-19
**Note**: Sem banco de dados. Todas as entidades são in-memory durante a execução e transmitidas via webhook response.

---

## Entidades

### 1. ExecutionInput (Entrada do Webhook)

Parâmetros recebidos no corpo do POST ao webhook.

| Campo | Tipo | Obrigatório | Validação | Descrição |
|-------|------|-------------|-----------|-----------|
| `nicho` | string | Sim | len > 0 | Critério de busca (ex: "infoprodutores") |
| `quantidade` | integer | Sim | 1 ≤ x ≤ 15 | Máximo de perfis a processar |
| `enviar_convites` | boolean | Não | — | Se `false` ou ausente: dry-run |
| `modo_teste` | boolean | Não | — | Se `true`: máx 1 perfil, esperas menores |

**Defaults**:
- `enviar_convites`: `false` quando ausente
- `modo_teste`: `false` quando ausente

**Constraint de segurança**: Se `quantidade` > 15, o agente aplica teto de 15. Se `modo_teste: true`, aplica teto de 1 independente do valor de `quantidade`.

---

### 2. PerfilProspectado (Objeto de Saída por Perfil)

Representa um candidato encontrado, validado e processado.

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `nome` | string | Não | Nome completo conforme LinkedIn |
| `cargo` | string | Não | Headline ou cargo atual |
| `empresa` | string | Sim | Empresa atual (quando visível) |
| `perfil_url` | string | Não | URL canônica (`/in/slug/`). Chave de deduplicação. |
| `status` | StatusEnum | Não | Estado do processamento (ver enum abaixo) |
| `mensagem_enviada` | string | Sim | Mensagem preparada (null se não enviada) |
| `criterio` | string | Não | Nicho usado na busca (echo do input) |
| `evidencia_aderencia` | string | Não | Trecho do perfil que justifica a aderência |

**StatusEnum**:
```
pendente_aprovacao  — perfil coletado, convite não enviado (enviar_convites: false)
convite_enviado     — convite enviado com sucesso
ja_conectado        — perfil é conexão de 1º grau
erro                — falha individual (não bloqueio)
```

---

### 3. ObjetoInterrupcao (Objeto de Encerramento por Segurança)

Inserido como último elemento do array quando a execução é interrompida.

| Campo | Tipo | Valor | Descrição |
|-------|------|-------|-----------|
| `interrupcao` | string | `"captcha_detectado"` | Motivo da interrupção |

---

### 4. ExecutionOutput (Resposta do Webhook)

O contrato de saída é sempre um array JSON.

```json
[
  {
    "nome": "string",
    "cargo": "string",
    "empresa": "string | null",
    "perfil_url": "string",
    "status": "pendente_aprovacao | convite_enviado | ja_conectado | erro",
    "mensagem_enviada": "string | null",
    "criterio": "string",
    "evidencia_aderencia": "string"
  }
]
```

**Casos especiais**:
- Array vazio `[]` — busca não retornou candidatos aderentes
- Array com objeto de interrupção no final — execução abortada por segurança
- Array misto — perfis processados até a interrupção + objeto de interrupção

---

## Regras de Negócio

| ID | Regra |
|----|-------|
| RN-001 | `perfil_url` é chave de deduplicação. Mesma URL dentro de uma execução → segundo objeto descartado. |
| RN-002 | Se `modo_teste: true`, teto de 1 perfil sobreescreve `quantidade`. |
| RN-003 | Se `modo_teste: true` e `enviar_convites: true`, máx 1 convite enviado. |
| RN-004 | Perfis sem evidência de aderência ao nicho são descartados (não aparecem no output). |
| RN-005 | Perfil com `status: "ja_conectado"` não recebe ação de conexão, mesmo que `enviar_convites: true`. |
| RN-006 | Captcha/checkpoint → append do ObjetoInterrupcao + retorno imediato do array parcial. |
| RN-007 | Saída do agente deve ser JSON puro, sem markdown, sem texto extra. |

---

## Transitions de Estado (status do perfil)

```
[candidato encontrado]
        │
        ▼
[validar aderência]
     /       \
 aderente   não aderente → descartado (não aparece no output)
     │
     ▼
[verificar grau de conexão]
     │
     ├─ 1º grau → status: "ja_conectado"
     │
     └─ não conectado
           │
           ├─ enviar_convites: false → status: "pendente_aprovacao"
           │
           └─ enviar_convites: true
                   │
                   ├─ sucesso → status: "convite_enviado"
                   └─ erro individual → status: "erro"
```
