# Variáveis a Definir — ODARA RIO

Abaixo estão todas as variáveis com "X" que precisam de valor antes de ativar os workflows.
Após definirmos, basta atualizar os valores nos nós `Code` de cada workflow.

---

## ⏱️ Variável 1 — HORAS_SEM_RESPOSTA_CONFIRMACAO

**Workflow:** `02c-verificar-sem-resposta.json`

**O que faz:** Após o envio da mensagem de confirmação 24h antes, se a paciente não responder em X horas, cria uma tarefa automática para a vendedora entrar em contato manualmente.

**Sugestão no briefing:** 4 horas antes do atendimento
> Exemplo: Atendimento às 14h → Confirmação enviada às 14h do dia anterior → Se sem resposta às **10h do dia do atendimento**, cria tarefa.

**Valor a definir:** `___` horas

---

## 📅 Variável 2 — DIAS_POS_CONVERSAO_MIGRAR_FUNIL

**Workflow:** `07g-migrar-pos-venda.json`

**O que faz:** Após a venda ser lançada no Belle e o card ir para "Convertido" no Funil 1 (Aquisição), após X dias ele migra automaticamente para o Funil 2 (Pós-Venda), onde a Especialista de Relacionamento assume.

**Pergunta:** Quanto tempo a vendedora mantém o contato com a paciente após a conversão antes de passar para a Especialista?

**Valor definido:** `7` dias ✅ (definido em 29/05/2026)

---

## 🔕 Variável 3 — DIAS_SEM_AGENDAMENTO_ALERTA

**Workflow:** `07f-alerta-engajamento.json`

**O que faz:** Se uma paciente tem protocolo ativo (venda aprovada, sessões ainda disponíveis) e não tem nenhum agendamento futuro há X dias, cria uma tarefa para a Especialista de Relacionamento.

**Pergunta:** Quantos dias sem novo agendamento é considerado abandono silencioso?

**Valor definido:** `10` dias ✅ (definido em 29/05/2026)

---

## 📊 Variável 4 — DIAS_INICIO_PROTOCOLO_NPS

**Workflow:** `07c-automacao-nps.json`

**O que faz:** Após X dias do início do protocolo (data da primeira sessão), envia pesquisa NPS automática via Clint.

**Pergunta:** Quando é o momento ideal para pedir avaliação? Geralmente após a 3ª ou 4ª sessão ou após X semanas.

**Valor definido:** `21` dias ✅ (definido em 29/05/2026)

---

## ✅ Já definidas no briefing

| Variável | Valor | Workflow |
|---|---|---|
| Nurturing lead não convertido — 1ª mensagem | 7 dias | `07e-automacao-nurturing.json` |
| Nurturing lead não convertido — 2ª mensagem | 30 dias | `07e-automacao-nurturing.json` |
| Nurturing lead não convertido — 3ª mensagem | 60 dias | `07e-automacao-nurturing.json` |
| Sessões antes do fim para oferta renovação | 2 sessões | `07a-automacao-renovacao.json` |
| Sessão para disparo de upsell | 2ª ou 3ª sessão | `07b-automacao-upsell.json` |

---

## 📌 Como usar

Após definirmos os valores, localize o nó `Code: Configurações` no início de cada workflow citado acima e atualize a constante correspondente:

```javascript
const HORAS_SEM_RESPOSTA_CONFIRMACAO = 4;  // ← altere aqui
const DIAS_POS_CONVERSAO_MIGRAR_FUNIL = 7;
const DIAS_SEM_AGENDAMENTO_ALERTA = 10;
const HORAS_SEM_RESPOSTA_CONFIRMACAO = 4;   // ✅ definido
const DIAS_POS_CONVERSAO_MIGRAR_FUNIL = 7;  // ✅ definido
const DIAS_SEM_AGENDAMENTO_ALERTA = 10;     // ✅ definido
const DIAS_INICIO_PROTOCOLO_NPS = 21;       // ✅ definido
```
