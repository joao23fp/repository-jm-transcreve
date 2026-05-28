<!--
SYNC IMPACT REPORT
==================
Version change: [template] → 1.0.0
New sections: All (primeira ratificação)
Modified principles: N/A (preenchimento inicial)
Removed sections: N/A
Templates atualizados:
  ✅ constitution.md — preenchido a partir do template
  ✅ plan-template.md — Constitution Check gate referencia Princípios I–V
  ✅ spec-template.md — sem alterações estruturais necessárias
  ✅ tasks-template.md — sem alterações estruturais necessárias
Deferred TODOs: nenhum
-->

# ODARA RIO — Automação Belle × Clint Constitution

## Core Principles

### I. Belle como Fonte Primária

Belle Software é o sistema de registro (source of truth) para todos os dados
clínicos, de agendamento e de vendas. Toda informação que precise existir no
Clint DEVE ter origem na Belle — nunca o contrário para dados de pacientes.

**Exceção controlada**: o sinal de deal marcado como WON no Clint dispara a
criação de venda na Belle (fluxo comercial). Esta é a única direção
Clint → Belle permitida.

Regras não negociáveis:
- NUNCA modificar registros de pacientes na Belle a partir de dados do Clint.
- NUNCA criar clientes na Belle via automação sem origem rastreável na Belle.
- `clint_contact_uuid` e `clint_deal_uuid` são ponteiros — a verdade está na Belle.

### II. Sincronização Unidirecional Belle → Clint

O Clint é a camada de engajamento (mensagens, funil comercial, follow-up).
A Belle é a camada de dados clínicos. Os dados fluem Belle → Clint por padrão.

Regras não negociáveis:
- Workflows que leem do Clint para escrever na Belle DEVEM ser rejeitados,
  salvo a exceção do Princípio I.
- O WF-A (Polling Contatos Clint → Belle) está permanentemente descartado.
- Qualquer novo workflow proposto DEVE declarar explicitamente sua direção de
  fluxo antes de ser construído.

### III. Ativação Gradual por Fases

Nenhum workflow é ativado em produção sem validação da fase anterior.
A sequência é: Fase 1 (Infraestrutura) → Fase 2 (Confirmação) →
Fase 3 (Pós-atendimento) → Fase 4 (Protocolo pós-venda).

Regras não negociáveis:
- Nenhuma fase é saltada.
- Templates WhatsApp DEVEM estar aprovados pela Meta antes de ativar
  qualquer workflow de Fase 2 ou superior.
- Variáveis de configuração pendentes DEVEM ser definidas com a equipe antes
  de ativar Fase 4.

### IV. Idempotência nas Sincronizações

Toda operação de sincronização DEVE ser segura para re-execução sem
efeitos colaterais. Duplicatas e re-processamento acidental são falhas críticas.

Regras não negociáveis:
- Usar colunas de controle: `clint_deal_uuid`, `clint_sessoes_realizadas`,
  `clint_fields_synced`, flags `_enviado`/`_enviada_em` para rastrear o
  que já foi sincronizado.
- Filtros `WHERE coluna IS NULL` ou `coluna_clint < coluna_db` DEVEM existir
  em todo nó de busca de pendências.
- LIMIT máximo de 10 itens por execução nos workflows de sync.
- UUIDs em cláusulas WHERE SEMPRE entre aspas simples ou via `$1` parameterizado.

### V. Credenciais Verificadas Manualmente Após Deploy

O n8n auto-atribui `supabase-afiliadotruppel` a todo nó Postgres criado ou
atualizado via MCP. Esta credencial é incorreta para o projeto ODARA RIO.

Regras não negociáveis:
- Após todo deploy ou update via MCP, TODOS os nós Postgres DEVEM ser
  verificados e trocados para `PostgreSQL Odara` antes de ativar o workflow.
- Nunca executar um workflow em produção sem esta verificação.
- Nunca habilitar o agendamento automático sem ao menos uma execução manual
  bem-sucedida.

## Padrões Técnicos de Workflow n8n

Regras operacionais obrigatórias para construção e manutenção dos workflows:

- **Always Output Data**: habilitar em nós Postgres que podem retornar 0 linhas
  quando seguidos de nó IF ou Switch.
- **Query Parameters**: parameterized queries usam `$1, $2…` no SQL e
  `queryReplacement` em modo Expression no campo Options.
- **API Clint**: header de autenticação é `api-token: TOKEN` — nunca
  `Authorization: Bearer`.
- **IF node via MCP**: o MCP frequentemente salva o nó IF com condições vazias.
  Configurar manualmente após qualquer deploy.
- **Nó Code**: retornar sempre `return { json: {...} }` sem array externo
  no modo `runOnceForEachItem`.
- **SDK n8n**: usar `import { ... } from '@n8n/workflow-sdk'` — não usar
  `require()` nem destructuring de `require`.

## Plano de Ativação e Templates WhatsApp

- 10 templates WhatsApp pendentes de criação e aprovação pela Meta (ver CLINT-IDS.md).
- Fase 1 concluída quando WF-B, WF-C e 01 v2 estiverem ativos e validados.
- Cada workflow ativado DEVE ter pelo menos uma execução manual bem-sucedida
  antes de ser habilitado no agendamento automático.
- Variáveis pendentes (`HORAS_SEM_RESPOSTA_CONFIRMACAO`, `DIAS_INICIO_PROTOCOLO_NPS`
  etc.) DEVEM ser formalizadas antes da Fase 4.

## Governance

Esta constituição define os princípios não negociáveis do projeto ODARA RIO.
DEVE ser consultada antes de: criar novos workflows, alterar direção de fluxo
de dados, ativar workflows em produção, ou adicionar colunas de controle ao banco.

Processo de emenda:
1. Proposta justificada por escrito no contexto da conversa.
2. Concordância explícita da equipe.
3. Atualização da constituição com nova versão (SemVer).
4. Commit `docs: amend constitution to vX.Y.Z`.

Versionamento SemVer:
- MAJOR: remoção ou redefinição incompatível de princípio.
- MINOR: adição de princípio ou seção relevante.
- PATCH: clarificações, correções de texto, refinamentos sem impacto semântico.

**Version**: 1.0.0 | **Ratified**: 2026-05-28 | **Last Amended**: 2026-05-28
