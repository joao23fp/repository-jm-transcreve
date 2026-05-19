# LinkedIn Prospecting Bot — Constitution

Ferramenta local de automação para prospecção assistida no LinkedIn, operada via N8N + Playwright MCP em ambiente Linux.

## Core Principles

### I. Segurança da Conta em Primeiro Lugar

**Nenhuma ação no LinkedIn pode comprometer a conta do operador.**

- MUST: O bot DEVE interromper toda a execução ao detectar qualquer sinal de captcha, checkpoint ou bloqueio (não tentar contornar).
- MUST: Esperas obrigatórias entre ações (2–4 s em modo teste; 6–10 s em modo normal).
- MUST: Limite fixo de 15 perfis por execução, 1 em modo teste — hardcoded, não configurável além desse teto.
- MUST: O bot opera exclusivamente com sessão já autenticada. Login automático é proibido.
- SHOULD: Ações de clique devem ser confirmadas (verificar resultado antes de prosseguir).

### II. Saída Determinística e Parseável

**O contrato de output é JSON válido, sempre — independente do resultado.**

- MUST: A saída do agente deve ser exclusivamente JSON válido, sem markdown ou texto adicional.
- MUST: Toda execução retorna um array, mesmo que vazio `[]` ou com apenas o objeto de interrupção.
- MUST: Todos os campos do schema de saída devem estar presentes em cada objeto (campos opcionais podem ser `null`).
- MUST: Duplicidades por `perfil_url` são proibidas dentro de uma mesma execução.

### III. Operação Idempotente e Auditável

**Cada execução deve ser rastreável.**

- MUST: Logs de cada execução MCP são gravados em arquivo com data no nome.
- SHOULD: O operador deve conseguir reproduzir o resultado de uma execução a partir dos parâmetros de entrada e dos logs.
- SHOULD: Falhas em perfis individuais são registradas no output (`status: "erro"`) sem abortar a execução.

### IV. Infraestrutura Local Simples

**Zero dependência de serviços externos além do LinkedIn e da API do Claude.**

- MUST: Todos os componentes rodam localmente (N8N Docker, Playwright MCP local, Chromium local).
- MUST: Nenhum dado de perfil é persistido além dos logs de execução.
- SHOULD: Scripts de setup devem ser idempotentes (rodar múltiplas vezes sem efeito colateral).
- SHOULD: O README deve estar sempre sincronizado com os scripts existentes.

## Governance

**Versão**: 1.0.0 | **Criado**: 2026-05-19
