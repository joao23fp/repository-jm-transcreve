# Implementation Plan: Gestora de Qualificação Genérica

**Branch**: `002-gestora-followup-generica` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

---

## Summary

Dois prompts em sequência orquestrados pelo n8n. A **Gestora** analisa o histórico de conversa e decide o status do lead (EM QUALIFICAÇÃO / LEAD DESQUALIFICADO / FOLLOW-UP ESTRATÉGICO / ATENDIMENTO HUMANO). A **Anna Follow-up** lê essa decisão e gera o texto da mensagem para o WhatsApp. A gestora é agnóstica ao produto — infere contexto do que a Anna já disse na conversa.

---

## Technical Context

**Tipo de projeto**: Prompt engineering + orquestração n8n

**Prompts a criar/ajustar**:
- `prompts/gestora-qualificacao.md` — prompt da gestora (a ser criado via `/speckit-implement`)
- `prompts/anna-followup-missao.md` — prompt da Anna Follow-up (existente, a ser ajustado)

**Formato de entrada**: JSON `[{"messages": "<stringified array de {type,content}>"}]`

**Formato de saída da gestora**: Campos rotulados (não JSON) — lidos pelo prompt Anna Follow-up e pelo n8n

**Orquestração**: n8n — AI nodes em sequência (Gestora → Anna Follow-up → WhatsApp)

**Storage**: Stateless — sem memória persistente entre chamadas

**Testes**: Manual com conversas de teste documentadas em `quickstart.md`

**Plataforma**: n8n cloud / self-hosted

**Performance**: Qualidade de decisão > latência. Resposta esperada < 10s por chamada.

---

## Constitution Check

A constituição deste projeto ainda é um template sem princípios definidos. Nenhum gate formal a verificar. Princípios aplicados por boas práticas:

- **Separação de responsabilidades**: gestora decide, Anna gera linguagem — nunca misturar.
- **Stateless por padrão**: sem memória entre chamadas salvo o que o n8n injeta explicitamente.
- **Contrato explícito**: campos de saída da gestora documentados em `contracts/gestora-output.md`.
- **Testabilidade**: cada status testável com uma conversa de exemplo em `quickstart.md`.

---

## Project Structure

### Documentação desta feature

```text
specs/002-gestora-followup-generica/
├── plan.md              ← este arquivo
├── spec.md              ← especificação funcional
├── research.md          ← decisões técnicas e rationale
├── data-model.md        ← entidades, campos de input/output
├── quickstart.md        ← conversas de teste + fluxo n8n básico
├── contracts/
│   └── gestora-output.md  ← contrato de saída (campos rotulados)
├── checklists/
│   └── requirements.md
└── tasks.md             ← gerado por /speckit-tasks
```

### Artefatos de entrega (prompts)

```text
prompts/
├── gestora-qualificacao.md     ← CRIAR: prompt da gestora (motor de decisão)
└── anna-followup-missao.md     ← AJUSTAR: prompt existente da Anna Follow-up
```

---

## Fases de Implementação

### Fase 1 — Prompt da Gestora (motor de decisão)

Criar `prompts/gestora-qualificacao.md` com:

1. **Papel e objetivo**: gestora comercial sênior, motor de decisão, output sempre resulta em ação.
2. **Parsing do input**: como ler o JSON serializado e separar metadados da fala do lead.
3. **Lógica de decisão em 5 passos**: sequência fixa, sem pular etapas.
4. **Quatro templates de saída**: campos rotulados conforme `contracts/gestora-output.md`.
5. **Critérios de desqualificação automáticos**: inferidos da conversa.
6. **Identificação de Big Fish**: gatilhos de escalada imediata.
7. **Protocolo anti-espera**: autovalidação obrigatória antes de gerar resposta.
8. **Exemplos de aplicação**: pelo menos um exemplo por status (4 exemplos).

### Fase 2 — Ajuste do Prompt Anna Follow-up

Ajustar `prompts/anna-followup-missao.md` para:

1. Receber `STATUS` e `ETAPA ATUAL` como input adicional (além do histórico).
2. Usar `STATUS` para selecionar o roteiro de reativação (Estágios 1–5).
3. Usar `MENSAGEM SUGERIDA` da gestora apenas como referência de tom — gerar mensagem própria.
4. Manter todas as regras de output atuais (150-280 chars, sem JSON, sem ícones isolados).
5. Preço atualizado: Lote 1 parcelado R$ 5.597,00 / à vista R$ 5.297,00.

### Fase 3 — Validação com Conversas de Teste

Usar os 4 cenários do `quickstart.md` para validar:
- STATUS correto para cada cenário
- Mensagem sugerida no tom certo (consultivo, sem pressão, sem linguagem robótica)
- Nenhuma saída contém "aguardar", "esperar" ou "monitorar"
- Nome do lead extraído dos metadados e usado na mensagem

### Fase 4 — Integração n8n

Configurar o fluxo no n8n:
1. Receber histórico do lead no formato `[{messages: "<stringified>"}]`
2. AI Node com prompt da gestora como system message
3. Extrair campos da saída (regex ou parse de texto)
4. AI Node com prompt da Anna Follow-up + status injetado
5. Enviar mensagem gerada ao WhatsApp

---

## Complexity Tracking

Nenhuma violação de princípios a justificar. Arquitetura intencionalmente simples: dois prompts em sequência, zero estado persistente, zero configuração por produto.
