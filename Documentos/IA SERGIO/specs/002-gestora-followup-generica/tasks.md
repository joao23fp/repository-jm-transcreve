# Tasks: Gestora de Qualificação Genérica

**Feature**: 002-gestora-followup-generica | **Date**: 2026-06-02

---

## Fase 1 — Prompt da Gestora (motor de decisão)

- [x] T001 — Criar diretório `prompts/` na raiz do projeto
- [x] T002 — Criar `prompts/gestora-qualificacao.md` com papel, objetivo e parsing do input JSON
- [x] T003 — Adicionar lógica de decisão em 5 passos com protocolo anti-espera
- [x] T004 — Adicionar os 4 templates de saída (campos rotulados conforme contrato)
- [x] T005 — Adicionar critérios de desqualificação automáticos e identificação de Big Fish
- [x] T006 — Adicionar exemplos de aplicação (1 por status = 4 exemplos)

## Fase 2 — Prompt Anna Follow-up ajustado

- [x] T007 — Criar `prompts/anna-followup-missao.md` adaptado para receber STATUS + ETAPA da gestora
- [x] T008 — Atualizar preço (Lote 1: R$ 5.597,00 parcelado / R$ 5.297,00 à vista)

## Fase 3 — Validação

- [x] T009 — Registrar resultado dos 4 cenários de teste do quickstart.md
