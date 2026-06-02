# Quickstart: Como testar a Gestora de Qualificação

**Feature**: 002-gestora-followup-generica  
**Date**: 2026-06-02

---

## O que testar

Antes de integrar ao n8n, valide o comportamento da gestora com conversas de teste representando cada um dos quatro status possíveis.

---

## Conversa de teste — EM QUALIFICAÇÃO (Etapa 1 pendente)

Cole no prompt da gestora como histórico de entrada:

```json
[{"messages": "[{\"type\":\"human\",\"content\":\"-----\\ndata_de_hoje: |\\n- Hoje é segunda-feira, 01/06/2026 - 17:56\\nNome do usuário: João Miguel\\nEmail do usuário: \\nlead_id do usuário: f8d899c7-0001\\n-----\\nmensagem do usuário:Oi, tudo bem!\"},{\"type\":\"ai\",\"content\":\"Oi, João Miguel. Tudo bem?\\n\\nAqui é a Anna, trabalho com o Sergio Langer.\\n\\nRecebemos sua ficha de interesse e já conseguimos entender um pouco melhor o seu momento.\\n\\nVocê tem disponibilidade hoje ou amanhã para essa conversa?\"}]"}]
```

**Saída esperada**: `STATUS: EM QUALIFICAÇÃO` — etapa 1 (disponibilidade) ainda não respondida.

---

## Conversa de teste — LEAD DESQUALIFICADO (datas)

```json
[{"messages": "[{\"type\":\"human\",\"content\":\"-----\\ndata_de_hoje: |\\n- Hoje é segunda-feira, 01/06/2026\\nNome do usuário: Maria\\nlead_id do usuário: f8d899c7-0002\\n-----\\nmensagem do usuário:Oi\"},{\"type\":\"ai\",\"content\":\"Olá, Maria! Os dias 5 e 6 de maio funcionam pra você?\"},{\"type\":\"human\",\"content\":\"-----\\nNome do usuário: Maria\\n-----\\nmensagem do usuário:Não posso nessas datas, tenho um compromisso.\"}]"}]
```

**Saída esperada**: `STATUS: LEAD DESQUALIFICADO`, `CRITÉRIO DESQUALIFICANTE: Indisponibilidade de datas`.

---

## Conversa de teste — FOLLOW-UP ESTRATÉGICO (lead travado no pagamento)

```json
[{"messages": "[{\"type\":\"ai\",\"content\":\"Carlos, os dias 5 e 6 de maio funcionam pra você?\"},{\"type\":\"human\",\"content\":\"-----\\nNome do usuário: Carlos\\n-----\\nmensagem do usuário:Sim, funcionam\"},{\"type\":\"ai\",\"content\":\"Faz sentido pra você estar num ambiente assim?\"},{\"type\":\"human\",\"content\":\"-----\\nNome do usuário: Carlos\\n-----\\nmensagem do usuário:Faz sim\"},{\"type\":\"ai\",\"content\":\"Você gostaria de participar dessa edição?\"},{\"type\":\"human\",\"content\":\"-----\\nNome do usuário: Carlos\\n-----\\nmensagem do usuário:Gostaria sim\"},{\"type\":\"ai\",\"content\":\"O investimento é R$ 5.597,00 em até 6x no cartão ou R$ 5.297,00 à vista. Qual formato fica mais confortável pra você?\"},{\"type\":\"human\",\"content\":\"-----\\nNome do usuário: Carlos\\n-----\\nmensagem do usuário:Parcelado\"}]"}]
```

**Saída esperada**: `STATUS: FOLLOW-UP ESTRATÉGICO` — lead qualificado que escolheu parcelado mas ainda não pagou.

---

## Conversa de teste — ATENDIMENTO HUMANO (Big Fish)

```json
[{"messages": "[{\"type\":\"ai\",\"content\":\"Ana, os dias 5 e 6 de maio funcionam?\"},{\"type\":\"human\",\"content\":\"-----\\nNome do usuário: Ana\\n-----\\nmensagem do usuário:Funcionam. Já participei de imersões similares e trabalho com 3 incorporadoras. Vocês têm desconto para quem já é do mercado?\"}]"}]
```

**Saída esperada**: `STATUS: ENCAMINHAR PARA ATENDIMENTO HUMANO`, `CLASSIFICAÇÃO: Big Fish + Objeção Estratégica`, `URGÊNCIA: Alta`.

---

## Integração n8n (fluxo básico)

```
[Trigger WhatsApp] 
    → [Buscar histórico de mensagens do lead]
    → [Formatar como JSON: [{messages: "<stringified>"}]]
    → [AI Node: Gestora de Qualificação] (system prompt = prompt da gestora)
    → [Extrair STATUS e ETAPA ATUAL da saída]
    → [AI Node: Anna Follow-up] (injeta STATUS + ETAPA + histórico)
    → [Enviar mensagem gerada pela Anna ao WhatsApp]
```

O nó de extração pode usar regex simples:
- `STATUS:\s*(.+)` para capturar o status
- `ETAPA ATUAL:\s*(.+)` para capturar a etapa
- `MENSAGEM SUGERIDA PARA ANNA:\s*([\s\S]+?)(?=\nPRAZO:)` para a mensagem de referência
