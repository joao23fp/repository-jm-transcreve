# Contrato de Saída: Gestora → Anna Follow-up

**Feature**: 002-gestora-followup-generica  
**Date**: 2026-06-02  
**Consumidor**: Prompt Anna Follow-up (via n8n)

---

## Visão Geral

A gestora produz saída em campos rotulados — não JSON. O n8n extrai os campos necessários e os injeta no prompt da Anna Follow-up. A Anna usa `STATUS` e `ETAPA ATUAL` para selecionar o roteiro e gera apenas o texto da mensagem.

---

## Formato dos Quatro Templates de Saída

### Template 1 — EM QUALIFICAÇÃO

```
STATUS: EM QUALIFICAÇÃO
ETAPAS JÁ CONCLUÍDAS: [lista do que foi respondido, ou "Nenhuma (conversa inicial)"]
PRÓXIMAS ETAPAS NECESSÁRIAS: [próxima pergunta ou ação do fluxo]
SINAIS POSITIVOS: [indicadores de interesse observados na conversa]
SINAIS DE ALERTA: [indicadores de risco ou hesitação]
MENSAGEM SUGERIDA PARA ANNA: [texto de referência — Anna adapta e gera o final]
PRAZO: IMEDIATO
```

### Template 2 — LEAD DESQUALIFICADO

```
STATUS: LEAD DESQUALIFICADO
MOTIVO: [explicação objetiva]
CRITÉRIO DESQUALIFICANTE: [Indisponibilidade de datas | Desinteresse declarado | Perfil inadequado | Objeção de valor desqualificante]
AÇÃO RECOMENDADA: [Encerrar educadamente | Manter no radar para próxima edição]
MENSAGEM SUGERIDA PARA ANNA: [texto de encerramento educado]
PRAZO: IMEDIATO
```

### Template 3 — FOLLOW-UP ESTRATÉGICO

```
STATUS: FOLLOW-UP ESTRATÉGICO
CLASSIFICAÇÃO DO LEAD: Qualificado ([etapas concluídas resumidas])
ETAPA ATUAL: [Recebeu investimento | Recebeu link | Escolheu formato]
SITUAÇÃO: [descrição do bloqueio]
ESTRATÉGIA DE FOLLOW-UP: [abordagem para destravar]
MENSAGEM SUGERIDA PARA ANNA: [texto focado em destravar a conversão]
PRAZO: IMEDIATO
```

### Template 4 — ENCAMINHAR PARA ATENDIMENTO HUMANO

```
STATUS: ENCAMINHAR PARA ATENDIMENTO HUMANO
CLASSIFICAÇÃO: [Big Fish | Dúvida Específica | Objeção Estratégica | Urgência de Fechamento]
MOTIVO DO ENCAMINHAMENTO: [máx. 150 caracteres]
CONTEXTO: [resumo da situação e histórico]
OPORTUNIDADE IDENTIFICADA: [por que não perder esse lead]
URGÊNCIA: [Alta | Média]
BRIEFING PARA VENDEDOR: [o que o humano precisa saber antes de assumir]
AÇÃO IMEDIATA: [o que fazer agora — transferir conversa, ligar, etc]
MENSAGEM SUGERIDA PARA ANNA: [mensagem de transição para o lead enquanto o humano assume]
PRAZO: IMEDIATO
```

---

## O que o n8n extrai da saída da gestora

| Campo extraído | Usado por | Para quê |
|---|---|---|
| `STATUS` | Anna Follow-up | Selecionar o roteiro de reativação correto |
| `ETAPAS JÁ CONCLUÍDAS` | Anna Follow-up | Contextualizar onde a conversa parou |
| `PRÓXIMAS ETAPAS NECESSÁRIAS` | Anna Follow-up | Saber qual pergunta fazer |
| `ETAPA ATUAL` | Anna Follow-up | Identificar estágio no fluxo de pagamento |
| `MENSAGEM SUGERIDA PARA ANNA` | Anna Follow-up | Referência de tom e conteúdo |
| `URGÊNCIA` | n8n (routing) | Priorizar fila de atendimento humano |
| `BRIEFING PARA VENDEDOR` | n8n (notificação) | Alertar vendedor humano com contexto |

---

## Regras de Conformidade

- Toda saída contém `STATUS` como primeiro campo.
- Toda saída contém `MENSAGEM SUGERIDA PARA ANNA` e `PRAZO`.
- `PRAZO` é sempre `IMEDIATO` ou tempo específico — nunca vazio.
- Nenhum campo contém variações de "aguardar", "esperar" ou "monitorar".
- A `MENSAGEM SUGERIDA` nunca contém listas numeradas nem linguagem robótica.
- O nome do lead (extraído dos metadados) é usado na `MENSAGEM SUGERIDA` quando disponível.

---

## Contrato de Entrada (Input para a Gestora)

```json
[
  {
    "messages": "<string JSON serializado com array de {type, content}>"
  }
]
```

O n8n entrega este payload via HTTP request ou via AI node configurado com o prompt da gestora como system message.
