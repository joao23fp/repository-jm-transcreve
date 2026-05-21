# Clint — IDs Reais ODARA RIO
**Descoberto em:** 20/05/2026
**Token:** U2FsdGVkX18o3kwB1pZCF/BjjfgN8GgFjmt5Fkzf06JXZIbAkVToB6ZLKPIljW7mSS0ESoxnErXsL9DXE+ZGVg==

---

## WhatsApp (Channel Accounts)

| Nome | ID | Status | Número |
|---|---|---|---|
| Odara Rio 4916 | `8976ddb6-b5eb-445d-9a3d-1101ed95328a` | ✅ CONNECTED | 5521973034916 |
| Odara Rio | `13f8f4a1-971a-446d-9ab2-d2a323f74710` | ❌ DISCONNECTED | 5521992727184 |

**→ Usar sempre:** `8976ddb6-b5eb-445d-9a3d-1101ed95328a`

---

## Funis (Groups)

| Nome | ID |
|---|---|
| Comercial (Funil 1 — Aquisição) | `0d2ecb7c-7006-4b36-8faf-6b29b3913bbc` |
| Pós Vendas (Funil 2) | `0a6983cd-bb08-4eae-9d08-0afec4b90fd6` |

---

## Origens e Etapas — Funil Comercial (Aquisição)

### "teste vitoria - modelo" — ⭐ USAR PARA NOVOS LEADS
**Origin ID:** `ea983fa2-1cb7-4c99-b77a-e44a04d9b524`

| Etapa | ID | Tipo |
|---|---|---|
| Base Lead | `cf586e7b-acc8-43b5-a96e-e01672450102` | BASE |
| Atendimento inicial | `bf012160-5222-40ad-aaeb-ddd948c521cb` | CUSTOM |
| Oferta de Tratamento | `a1d34ede-812e-4030-b35e-dad3c10b40aa` | CUSTOM |
| Agendamento | `258dc4b7-ad68-495b-99b0-5c6b04ee97a7` | CUSTOM |
| Conf. de Agenda | `d0c8578a-a396-474a-84c3-573d645dc7c7` | CUSTOM |
| Reagendamento | `f3630167-63c5-4300-b141-46f05f2f8a38` | CUSTOM |
| Consulta | `a12edb9f-282f-4ec2-b35d-aa788254ce92` | CUSTOM |
| Paciente Convertido | `54adbaf6-124d-45ac-834b-6c85c0f4abc5` | CLOSING |

### "Cortesia"
**Origin ID:** `fffea67b-a43e-423a-9cc5-3cbfbb894768`

| Etapa | ID | Tipo |
|---|---|---|
| Base | `13a36556-7cb2-438f-aa9f-a17138ced2aa` | BASE |
| Agendamento | `0dcea74e-c6bc-4a17-820c-b266b735ee83` | CUSTOM |
| Fechado | `8791c41b-24c8-4ec5-9a3e-649bfd19d35e` | CLOSING |

---

## Origens e Etapas — Funil Pós Vendas

### "Soroterapia" (modelo de pós-venda com sessões)
**Origin ID:** `f7dc8380-969d-4a61-8bfb-ae72b5541909`

| Etapa | ID | Tipo |
|---|---|---|
| Boas Vindas | `6d2db4f4-0880-4050-bda8-b8bd95184989` | BASE |
| 1ª Sessão | `399159ca-dce8-4537-a89a-c9cb26d274fd` | CUSTOM |
| 2ª Sessão | `2a092aad-d34c-4edf-a336-e530cb15a6d2` | CUSTOM |
| 3ª Sessão | `d73645ca-cd82-41ec-be05-50ffbf908dc6` | CUSTOM |
| Fechado | `3dfcdc24-bc28-41bc-afe4-10cb0eb9de61` | CLOSING |

---

## Usuários

| Nome | ID | Email |
|---|---|---|
| Stefane Soares | `8a009d27-ceb4-47e9-bf8c-20a605bd58c0` | stefaneteka25@gmail.com |
| Simone Barbosa Pinheiro | `87a5f706-d0a9-497f-a3dd-b543d3e9b89e` | simonne_barbosa@hotmail.com |
| Thiago Gulias | `2f1d3f57-e9a9-44de-bb0b-0704b16d7953` | thiago.faro.gulias@hotmail.com |
| fillipi Truppel (dev) | `38b2e4bf-0223-4a85-b187-a153d3ce4ec0` | fillipi+andre@rotha.co |

---

## Campos Customizados — DEAL

| ID do campo | Label | Tipo | Grupo |
|---|---|---|---|
| `desmarcacao` | Resp. pela desmarcação | SELECT | consulta |
| `status_do_agendament` | Status do agendamento | SELECT | tratamento_servico |
| `status_da_negociacao` | Status da negociação | SELECT | tratamento_servico |
| `forma_de_pagamento` | Forma de Pagamento | SELECT | financeiro |
| `investimento_total` | Investimento Total | CURRENCY | consulta |
| `tratamento_servico` | Tratamentos & Serviços | MULTIPLE_SELECT | tratamento_servico |
| `plano_de_tratamento` | Plano de Tratamento/Serviço | MULTIPLE_SELECT | tratamento_servico |
| `pacote_de_tratamento` | Pacote de tratamento | MULTIPLE_SELECT | tratamento_servico |
| `dor_principal_motiva` | Dor principal & Motivação | MULTIPLE_SELECT | tratamento_servico |
| `profissionais_odara` | Profissionais Odara RJ | SELECT | profissionais_odar |
| `data_da_consulta_ser` | Data da Consulta / Serviço | NUMBER | consulta |
| `horario_da_consulta` | Horário da Consulta (30min) | MULTIPLE_SELECT | consulta |
| `horario_da_consulta_1` | Horário da Consulta (1hr) | SELECT | consulta |
| `anotacoes_clinicas_r` | Anotações clínicas resumidas | TEXT | consulta |
| `motiva_de_desmarcaca` | Motiva de Desmarcação | TEXT | consulta |
| `nova_data_consultase` | Nova data consulta/serviço | NUMBER | consulta |
| `tipo_de_atendimento` | Tipo de atendimento | SELECT | preavaliacao_triagem |
| `historico_de_saude_r` | Histórico de saúde resumido | RICH_TEXT | preavaliacao_triagem |
| `contra_indicacoes_co` | Contra indicações conhecidas | RICH_TEXT | preavaliacao_triagem |
| `cirurgia_recente` | Cirurgia recente | RICH_TEXT | preavaliacao_triagem |
| `uso_de_medicamentos` | Uso de medicamentos | RICH_TEXT | preavaliacao_triagem |
| `procedimentos_anteri` | Procedimentos anteriores | RICH_TEXT | preavaliacao_triagem |
| `fotos_quando_aplicav` | Fotos (quando aplicável) | RICH_TEXT | consulta |

---

## Campos Customizados — CONTACT

| ID do campo | Label | Tipo |
|---|---|---|
| `sexo` | Sexo | SELECT |
| `bairro` | Bairro | SELECT |
| `cidade` | Cidade | SELECT |
| `nacionalidade` | Nacionalidade | SELECT |
| `origem_do_lead` | Origem do Lead | MULTIPLE_SELECT |
| `tipo_de_contato` | Tipo de Contato | TEXT |
| `endereco_completo` | Endereço Completo | TEXT |
| `data_de_nascimento` | Data de nascimento | NUMBER |
| `canal_preferido_de_c` | Canal preferido de comunicação | SELECT |
| `interesse_confirmado` | Interesse confirmado | SELECT |
| `observacoes_gerais_s` | Observações gerais sobre o cliente | RICH_TEXT |
| `profissao_do_cliente` | Profissão do Cliente | TEXT |
| `historico_de_atendim` | Histórico de atendimentos anteriores | RICH_TEXT |
| `notes` | Notas do contato | RICH_TEXT |

---

## Templates WhatsApp Existentes (16)

**⚠️ Nenhum template existe para os workflows ODARA (confirmação, lembrete, pós-atendimento, NPS, aniversário).**
Todos os templates atuais são para o fluxo de aquisição (boas-vindas, qualificação de leads).

| Nome | Status | ID | Uso atual |
|---|---|---|---|
| `_msg_boas_vindasetapa_1_...` | ✅ APPROVED | `6dc9a4ee-ccdf-4236-a7f6-72d804fccf50` | Boas-vindas com nome da vendedora |
| `_msg_cn_estetica` | ✅ APPROVED | `778050d5-d0d9-42c6-be56-372aced350c3` | Qualificação estética |
| `_msg_tipo_cliente` | ✅ APPROVED | `ea7829fd-bb6e-4438-83f6-1acf126eaa31` | Já é cliente? (botões QR) |
| `msg_cliente_novo` | ✅ APPROVED | `05f250dc-4d7d-4996-81b0-51f7e6c43794` | Boas-vindas + interesse |
| `msg_cn_mdica` | ✅ APPROVED | `aab2c8c1-9b83-4557-b396-a5304b886f9b` | Qualificação médica |
| `msg_cn_outros` | ✅ APPROVED | `639bfbe5-b222-4d79-ba4b-58b41e832f4d` | Outros interesses |
| `msg_cn_sem_resp_tentativa1` | ✅ APPROVED | `977f305a-5726-4fcd-a0bf-38853e23ec0d` | Sem resposta 1 |
| `msg_cn_sem_resp_tentativa2` | ✅ APPROVED | `98b5c7bd-9fa5-40ae-8fc0-14809ff02287` | Sem resposta 2 |
| `msg_cn_sem_resp_tentativa3` | ✅ APPROVED | `a56b768a-9185-4476-80b1-0d440328ab4a` | Sem resposta 3 (encerra) |
| `msg_cn_terapia_massagem` | ✅ APPROVED | `f7e8d885-a713-43a7-9424-3f080168499d` | Spa/terapia |
| `msg_tipo_cliente` | ✅ APPROVED | `acbb0d41-22f5-45a7-9634-8ff376028501` | Já é cliente? |

---

## O que precisa ser criado antes da Fase 4 (Mensagens)

Templates a criar no WhatsApp Business Manager:

| Template necessário | Quando usar | Tem botões? |
|---|---|---|
| `odara_confirmacao_agendamento` | 24h antes do atendimento | Sim: Confirmar / Cancelar |
| `odara_lembrete_dia` | Manhã do dia do atendimento | Não |
| `odara_pos_atendimento` | Logo após atendimento finalizado | Não |
| `odara_followup_24h` | 24h após atendimento | Não |
| `odara_oferta_renovacao` | 2 sessões restantes no protocolo | Não |
| `odara_nps` | X dias após início do protocolo | Não |
| `odara_aniversario` | Aniversário da paciente | Não |
| `odara_nurturing_7d` | Lead não convertido — 7 dias | Não |
| `odara_nurturing_30d` | Lead não convertido — 30 dias | Não |
| `odara_nurturing_60d` | Lead não convertido — 60 dias | Não |

---

## Origens de TESTE (criadas em 20/05/2026)

### ODARA | Aquisição - TESTE → Funil: Comercial
**Origin ID:** `58d30a69-0378-4dc5-9a77-72a5c1570671`

| Etapa | ID | Tipo |
|---|---|---|
| Lead Novo | `8a4e7237-a3e0-421d-8d8a-26e5a957cfd5` | BASE |
| Em Atendimento | `c2fb7908-61d5-4500-bdd4-e3b8c2fb1d8c` | CUSTOM |
| Avaliação Agendada | `711be8cc-a0cb-4bcb-ae40-428f1ad47873` | CUSTOM |
| Aguardando Confirmação | `49d26cc2-60a5-44dc-b122-90db486db14d` | CUSTOM |
| Confirmado | `cae200fb-6aad-4e63-8586-4f52f76e06f8` | CUSTOM |
| Reagendar | `455aafb0-8fef-45d6-beb4-41888cc7d18a` | CUSTOM |
| Consulta Realizada | `f09cdbdb-fb8e-4f04-b5f8-4a20a8de3341` | CUSTOM |
| Fechado | `f2c337a7-74b6-4821-a088-da22e192b9a9` | CLOSING |

### ODARA | Pós-Venda - TESTE → Funil: Pós Vendas
**Origin ID:** `2ab591ec-01be-4522-8200-be2cd653f219`

| Etapa | ID | Tipo |
|---|---|---|
| Paciente Ativa (Base) | `01da0db5-3177-456f-8c96-bad5e6a9243e` | BASE |
| Protocolo em Andamento | `38b8d973-08f2-4955-aaf1-890e242d2ed0` | CUSTOM |
| Renovação Pendente | `62b3ab77-b2a3-4350-891f-7b7355bf7627` | CUSTOM |
| Fechado | `3d73442b-b24c-4aa3-9c0a-b6c9e34e4020` | CLOSING |

> ⚠️ Existe um segundo Pós-Venda TESTE incompleto (ID: `9d94a499-7992-4525-bb5a-dbde1eec67f3`) — pode deletar no painel do Clint.

---

## Campo belle_id — Criar no Clint

Para vincular contatos e deals ao Belle, precisamos criar um campo customizado no Clint:

**Em Configurações → Campos → Novo campo:**
- Entidade: CONTACT
- Nome: `belle_id`
- Label: "Belle ID"
- Tipo: TEXT

Isso permitirá armazenar o código do cliente da Belle em cada contato do Clint.
