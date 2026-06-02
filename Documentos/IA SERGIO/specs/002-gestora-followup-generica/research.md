# Research: Gestora de Qualificação Genérica

**Feature**: 002-gestora-followup-generica  
**Date**: 2026-06-02

---

## Decisão 1 — Formato de saída para encadeamento de prompts

**Decision**: Campos rotulados (não JSON)

**Rationale**: Comunicação LLM → LLM funciona melhor com campos rotulados (`STATUS: ...`, `ETAPA ATUAL: ...`, `MENSAGEM SUGERIDA: ...`). JSON exige parsing estrito e quebra com qualquer variação de formatação gerada pelo modelo. Campos rotulados são lidos naturalmente pelo prompt downstream (Anna Follow-up) sem risco de erro de schema, e ainda são legíveis por humano.

**Alternatives considered**:
- JSON estruturado: mais preciso para automação, mas frágil para saída de LLM sem function calling
- Markdown com seções: mais verboso e dificulta extração pelo n8n
- Campos rotulados (escolhido): equilíbrio entre legibilidade, robustez e parseabilidade

---

## Decisão 2 — Inferência de contexto sem injeção externa

**Decision**: Prompt autocontido — gestora infere tudo do histórico

**Rationale**: O histórico de conversa da Anna já contém os dados do produto (datas, preços, perguntas de qualificação) porque a Anna os comunicou ao lead. A gestora lê o que a Anna disse e usa isso como contexto. Isso elimina a necessidade de configuração por produto e torna o prompt universal.

**Constraint crítica**: O histórico deve ser completo (todas as mensagens de ambos os lados). Históricos truncados podem levar a decisões incorretas. A gestora deve tratar histórico com menos de 2 turnos como "etapa 1 pendente".

**Alternatives considered**:
- Injeção via bloco de contexto no prompt: mais explícito, mas exige configuração por produto
- Variáveis preenchidas pelo n8n: flexível, mas aumenta complexidade da orquestração
- Inferência do histórico (escolhido): zero configuração, universalmente aplicável

---

## Decisão 3 — Parsing dos metadados no content humano

**Decision**: Tratar conteúdo antes de `mensagem do usuário:` como metadados técnicos

**Rationale**: O n8n injeta metadados (data, nome, lead_id) no `content` das mensagens humanas, prefixados e separados da fala real do lead por um marcador `mensagem do usuário:`. A gestora deve:
1. Extrair nome do lead dos metadados para personalizar a mensagem sugerida
2. Usar a data injetada como referência temporal para cálculos de prazo
3. Ignorar o lead_id para fins de análise (é dado operacional, não comercial)
4. Usar apenas o conteúdo após `mensagem do usuário:` como fala real do lead

**Input format confirmado**:
```json
[
  {
    "messages": "[{\"type\":\"human\",\"content\":\"-----\\ndata_de_hoje: |\\n- Hoje é [DIA], [DATA]\\n...\\nNome do usuário: [NOME]\\nEmail do usuário: [EMAIL]\\nlead_id do usuário: [UUID]\\n-----\\nmensagem do usuário:[MENSAGEM]\"}]"
  }
]
```

---

## Decisão 4 — Cadeia de execução Gestora → Anna Follow-up

**Decision**: Gestora produz STATUS + ETAPA ATUAL; Anna Follow-up gera o texto final

**Rationale**: Separar decisão de linguagem permite evoluir cada prompt de forma independente. A gestora pode ser refinada para melhorar precisão de classificação sem alterar o tom da Anna. A Anna pode ter seu tom e roteiros ajustados sem alterar a lógica de decisão.

**Contrato de comunicação**:
- A gestora produz campos rotulados
- O n8n extrai `STATUS` e `ETAPA ATUAL` (e opcionalmente `MENSAGEM SUGERIDA`)
- A Anna Follow-up recebe esses campos + histórico original e gera o texto final
- O campo `MENSAGEM SUGERIDA` da gestora é referência, não output final
