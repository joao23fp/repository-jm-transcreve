# Ações Clint — Especificação para Configuração

Cada seção abaixo representa um nó `🔵 CLINT:` nos workflows do n8n.
Para cada ação, o n8n enviará um **HTTP POST** para uma URL do Clint.
Você precisa criar um receptor (webhook/automação) no Clint para cada uma.

O campo `"action"` em cada payload identifica qual ação está sendo executada.

---

## RECEBER (n8n → Clint)

### 1. Criar Card de Agendamento
**Workflow:** `01-sync-agendamentos`
**Quando:** Novo agendamento detectado no Belle
```json
{
  "action": "criar_card_agendamento",
  "belle_id": 14351765,
  "nome_cliente": "Maria Silva",
  "data_hora": "2026-05-15T14:00:00.000Z",
  "servicos": [{ "cod": "2", "nome": "Peeling" }],
  "profissional": "Dra. Ana"
}
```
**O Clint deve:** Criar ou atualizar card no funil de Aquisição com essas informações.

---

### 2. Atualizar Status do Card (agendamento mudou)
**Workflow:** `01-sync-agendamentos`
**Quando:** Status de um agendamento mudou no Belle
```json
{
  "action": "atualizar_status_agendamento",
  "belle_id": 14351765,
  "novo_status": "Atendido"
}
```
**O Clint deve:** Atualizar o campo de status no card correspondente.

---

### 3. Enviar Confirmação 24h com Botões
**Workflow:** `02a-disparar-confirmacao-24h`
**Quando:** 24h antes de um agendamento
```json
{
  "action": "enviar_confirmacao_24h",
  "agendamento_belle_id": 14351765,
  "agendamento_db_id": 42,
  "telefone": "5521999999999",
  "mensagem": "Olá Maria! Você tem atendimento amanhã, Quinta 15/05 às 14h...",
  "botoes": [
    { "id": "confirmar", "texto": "✅ Confirmar" },
    { "id": "cancelar",  "texto": "❌ Cancelar"  }
  ],
  "metadata": {
    "tipo": "confirmacao_24h",
    "agendamento_id": 42,
    "data_hora": "2026-05-15T14:00:00.000Z"
  }
}
```
**O Clint deve:** Enviar mensagem WhatsApp com botões. Quando a paciente clicar, enviar POST para:
`SEU_N8N/webhook/confirmacao-resposta` com:
```json
{
  "agendamento_id": 42,
  "agendamento_belle_id": 14351765,
  "resposta": "confirmar",
  "telefone": "5521999999999"
}
```

---

### 4. Mover Card para "Confirmado"
**Workflow:** `02b-webhook-resposta-confirmacao`
**Quando:** Paciente confirmou via WhatsApp
```json
{
  "action": "mover_etapa",
  "card_id": "CLINT_CARD_ID",
  "nova_etapa": "Confirmado",
  "motivo": "Paciente confirmou via WhatsApp"
}
```
**O Clint deve:** Mover o card para a etapa "Confirmado" no funil.

---

### 5. Mover Card para "Reagendamento"
**Workflow:** `02b-webhook-resposta-confirmacao`
**Quando:** Paciente cancelou via WhatsApp
```json
{
  "action": "mover_etapa",
  "card_id": "CLINT_CARD_ID",
  "nova_etapa": "Reagendamento",
  "motivo": "Paciente cancelou via WhatsApp"
}
```

---

### 6. Criar Tarefa de Reagendamento
**Workflow:** `02b-webhook-resposta-confirmacao`
**Quando:** Paciente cancelou
```json
{
  "action": "criar_tarefa",
  "card_id": "CLINT_CARD_ID",
  "titulo": "Reagendar paciente — cancelou via WhatsApp",
  "descricao": "Maria Silva cancelou o agendamento. Entre em contato para remarcar.",
  "responsavel": "vendedora",
  "prioridade": "alta"
}
```

---

### 7. Enviar MSG de Retorno ao Cancelamento
**Workflow:** `02b-webhook-resposta-confirmacao`
**Quando:** Paciente cancelou
```json
{
  "action": "enviar_mensagem",
  "telefone": "5521999999999",
  "mensagem": "Entendemos que você precisa cancelar, Maria. Uma especialista entrará em contato para remarcar!"
}
```

---

### 8. Criar Tarefa — Confirmar Manualmente
**Workflow:** `02c-verificar-sem-resposta`
**Quando:** Paciente não respondeu a confirmação dentro do prazo
```json
{
  "action": "criar_tarefa",
  "card_id": "CLINT_CARD_ID",
  "titulo": "⚠️ Confirmar presença manualmente — Maria Silva",
  "descricao": "Paciente não respondeu a confirmação automática. Atendimento em 2026-05-15T14:00. Entre em contato agora!",
  "responsavel": "vendedora",
  "prioridade": "urgente"
}
```

---

### 9. Enviar MSG Lembrete do Dia
**Workflow:** `03-lembrete-dia`
**Quando:** Manhã do dia do atendimento
```json
{
  "action": "enviar_lembrete_dia",
  "telefone": "5521999999999",
  "mensagem": "Bom dia, Maria! Lembramos que você tem atendimento hoje às 14h..."
}
```

---

### 10. Enviar MSG Cuidados Pós-Procedimento
**Workflow:** `04a-pos-atendimento`
**Quando:** Logo após atendimento finalizado no Belle
```json
{
  "action": "enviar_pos_atendimento",
  "telefone": "5521999999999",
  "mensagem": "Olá Maria! Foi um prazer te receber para o Peeling...",
  "agendamento_id": 42
}
```

---

### 11. Enviar MSG Check-in 24h
**Workflow:** `04b-followup-24h`
**Quando:** 24h após o atendimento
```json
{
  "action": "enviar_followup_24h",
  "telefone": "5521999999999",
  "mensagem": "Oi Maria! Como você está se sentindo após o Peeling de ontem?",
  "aguardar_resposta": true,
  "metadata": { "agendamento_id": 42, "tipo": "followup_24h" }
}
```
**O Clint deve:** Se a resposta for negativa, criar tarefa para a Especialista.

---

### 12. Atualizar Contato com Belle ID
**Workflow:** `05-cadastro-lead`
**Quando:** Lead criado no Belle → vincula IDs
```json
{
  "action": "atualizar_contato",
  "clint_id": "CLINT_CONTACT_ID",
  "belle_id": 4448985,
  "campo_personalizado": "belle_id"
}
```

---

### 13. Mover Card para "Convertido"
**Workflow:** `06-conversao-venda`
**Quando:** Venda lançada no Belle com sucesso
```json
{
  "action": "mover_etapa",
  "card_id": "CLINT_CARD_ID",
  "nova_etapa": "Convertido",
  "dados_extras": {
    "protocolo": "Protocolo Corporal Completo",
    "valor": 1500.00,
    "forma_pagamento": "Cartão Crédito",
    "belle_venda_id": 9999,
    "data_conversao": "2026-05-13"
  }
}
```

---

### 14. Enviar MSG Oferta de Renovação
**Workflow:** `07a-automacao-renovacao`
**Quando:** 2 sessões restantes no protocolo
```json
{
  "action": "enviar_oferta_renovacao",
  "telefone": "5521999999999",
  "mensagem": "Maria, você está chegando ao final do seu protocolo...",
  "card_id": "CLINT_CARD_ID",
  "criar_tarefa": true,
  "titulo_tarefa": "Renovação de protocolo — Maria Silva"
}
```

---

### 15. Criar Tarefa de Upsell
**Workflow:** `07b-automacao-upsell`
**Quando:** Paciente na 2ª ou 3ª sessão
```json
{
  "action": "criar_tarefa",
  "card_id": "CLINT_CARD_ID",
  "titulo": "💡 Oportunidade de Upsell — Maria Silva",
  "descricao": "Maria está na 2ª sessão do protocolo Peeling. Momento ideal para oferecer tratamento complementar.",
  "responsavel": "especialista",
  "prioridade": "normal"
}
```

---

### 16. Enviar Pesquisa NPS
**Workflow:** `07c-automacao-nps`
**Quando:** X dias após início do protocolo
```json
{
  "action": "enviar_nps",
  "telefone": "5521999999999",
  "mensagem": "Oi Maria! De 0 a 10, qual nota você daria para a Odara Rio?",
  "card_id": "CLINT_CARD_ID",
  "tipo": "nps",
  "aguardar_resposta": true
}
```

---

### 17. Enviar MSG Aniversário
**Workflow:** `07d-automacao-aniversario`
**Quando:** Dia do aniversário da paciente
```json
{
  "action": "enviar_aniversario",
  "belle_id": 4448985,
  "mensagem": "🎂 Feliz Aniversário, Maria! Que esse novo ano seja repleto de conquistas..."
}
```

---

### 18. Enviar MSG Nurturing
**Workflow:** `07e-automacao-nurturing`
**Quando:** 7, 30 ou 60 dias após lead perdido
```json
{
  "action": "enviar_nurturing",
  "clint_id": "CLINT_CONTACT_ID",
  "telefone": "5521999999999",
  "mensagem": "Oi Maria! Passou uma semana desde que conversamos...",
  "sequencia": "7d"
}
```

---

### 19. Criar Tarefa — Paciente Sem Engajamento
**Workflow:** `07f-alerta-sem-engajamento`
**Quando:** Protocolo ativo + X dias sem agendamento
```json
{
  "action": "criar_tarefa",
  "card_id": "CLINT_CARD_ID",
  "titulo": "⚠️ Paciente sem engajamento — Maria Silva",
  "descricao": "Maria tem protocolo Peeling ativo (8 sessões restantes) mas não tem agendamento há 14 dias.",
  "responsavel": "especialista",
  "prioridade": "alta"
}
```

---

### 20. Mover Card para Funil Pós-Venda
**Workflow:** `07g-migrar-pos-venda`
**Quando:** X dias após conversão
```json
{
  "action": "migrar_pos_venda",
  "card_id": "CLINT_CARD_ID",
  "funil_destino": "Pós-Venda",
  "etapa_destino": "Paciente Ativa",
  "responsavel_destino": "especialista",
  "dados": {
    "protocolo": "Peeling 10 Sessões",
    "nome_cliente": "Maria Silva"
  }
}
```

---

## ENVIAR (Clint → n8n)

O Clint também precisa disparar webhooks **para o n8n** nestes momentos:

| Evento no Clint | URL destino (n8n) | Payload mínimo |
|---|---|---|
| Novo contato criado | `SEU_N8N/webhook/novo-lead` | `{ clint_id, nome, telefone, origem }` |
| Deal fechado (venda) | `SEU_N8N/webhook/venda-convertida` | `{ clint_id, clint_card_id, belle_id, protocolo, servicos, valor, forma_pagamento, vendedor }` |
| Paciente clicou em Confirmar | `SEU_N8N/webhook/confirmacao-resposta` | `{ agendamento_id, resposta: "confirmar", telefone }` |
| Paciente clicou em Cancelar | `SEU_N8N/webhook/confirmacao-resposta` | `{ agendamento_id, resposta: "cancelar", telefone }` |
