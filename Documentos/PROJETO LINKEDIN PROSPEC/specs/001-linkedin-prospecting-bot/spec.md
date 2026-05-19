# Feature Specification: LinkedIn Prospecting Bot

**Feature Branch**: `001-linkedin-prospecting-bot`
**Created**: 2026-05-19
**Status**: Draft
**Input**: Bot de prospecção no LinkedIn usando N8N + Playwright MCP, com busca por nicho, validação de aderência e envio controlado de convites de conexão.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Busca e coleta de perfis por nicho (Priority: P1)

O operador dispara o bot informando um nicho (ex: "infoprodutores") e uma quantidade máxima de perfis. O bot navega pelo LinkedIn, localiza perfis relevantes, valida a aderência de cada um ao nicho e retorna um JSON com os dados coletados.

**Why this priority**: É o comportamento central do sistema. Sem coleta e validação, nenhuma outra funcionalidade faz sentido.

**Independent Test**: Pode ser testado isoladamente chamando o webhook com `enviar_convites: false` e verificando se o JSON de saída contém os campos esperados e apenas perfis aderentes ao nicho.

**Acceptance Scenarios**:

1. **Dado** que o bot recebe `nicho: "infoprodutores"` e `quantidade: 5`, **quando** executa a busca, **então** retorna até 5 perfis com `nome`, `cargo`, `empresa`, `perfil_url`, `status`, `criterio` e `evidencia_aderencia` preenchidos.
2. **Dado** que o bot encontra um perfil sem evidência de aderência ao nicho, **quando** valida o perfil, **então** descarta-o e continua para o próximo candidato.
3. **Dado** que o perfil já é conexão de 1º grau, **quando** o bot processa esse perfil, **então** retorna `status: "ja_conectado"` sem tentar enviar convite.
4. **Dado** que ocorre erro em um perfil individual (timeout, página inválida), **quando** o bot encontra o erro, **então** registra `status: "erro"` nesse perfil e continua processando os demais.

---

### User Story 2 — Envio controlado de convites de conexão (Priority: P2)

Quando autorizado pelo parâmetro `enviar_convites: true`, o bot envia convites de conexão aos perfis validados, sem adicionar mensagem personalizada no convite, e confirma o sucesso do envio.

**Why this priority**: Automação de envio é o principal ganho operacional, mas depende inteiramente da coleta (P1) funcionar corretamente.

**Independent Test**: Pode ser testado com `modo_teste: true` e `enviar_convites: true`, verificando se exatamente 1 convite é enviado e o status retornado é `"convite_enviado"`.

**Acceptance Scenarios**:

1. **Dado** que `enviar_convites: true` e o perfil não é conexão existente, **quando** o bot tenta conectar, **então** clica em "Conectar", fecha modal com "Enviar sem nota" e retorna `status: "convite_enviado"`.
2. **Dado** que `enviar_convites: false`, **quando** o bot processa o perfil, **então** não clica em nenhum botão de ação (Conectar, Enviar, Adicionar nota) e retorna `status: "pendente_aprovacao"`.
3. **Dado** que `modo_teste: true` e `enviar_convites: true`, **quando** o bot executa, **então** envia no máximo 1 convite, independente da quantidade solicitada.
4. **Dado** que o envio do convite é confirmado, **quando** o bot verifica o resultado, **então** detecta toast "Convite enviado" ou botão "Pendente" antes de registrar sucesso.

---

### User Story 3 — Controle de segurança e anti-bloqueio (Priority: P3)

O bot detecta obstáculos de segurança do LinkedIn (captcha, checkpoint, bloqueio temporário) e interrompe a execução imediatamente, retornando o resultado parcial coletado até aquele momento.

**Why this priority**: Protege a conta do usuário. Sem esse controle, execuções falhas podem resultar em suspensão da conta.

**Independent Test**: Pode ser testado simulando uma resposta de captcha e verificando se o bot retorna o array parcial com o objeto de interrupção no final.

**Acceptance Scenarios**:

1. **Dado** que o bot detecta tela de captcha, checkpoint ou bloqueio temporário do LinkedIn, **quando** isso ocorre, **então** para imediatamente e retorna o array parcial com último elemento contendo `"interrupcao": "captcha_detectado"`.
2. **Dado** que o bot está em `modo_teste: false`, **quando** executa ações, **então** aguarda entre 6 e 10 segundos entre cada ação para simular comportamento humano.
3. **Dado** que o bot está em `modo_teste: true`, **quando** executa ações, **então** aguarda entre 2 e 4 segundos entre cada ação.
4. **Dado** que o bot já processou um perfil com determinada URL, **quando** encontra a mesma URL novamente na mesma execução, **então** ignora o perfil duplicado.

---

### User Story 4 — Execução via webhook N8N (Priority: P4)

O operador dispara o bot via chamada HTTP ao webhook do N8N, com um payload JSON de parâmetros. O workflow orquestra a execução e retorna o resultado final.

**Why this priority**: Interface de operação. Necessária para uso prático mas não bloqueia o desenvolvimento do bot em si.

**Independent Test**: Pode ser testado com `curl` direto ao endpoint do webhook e verificando a resposta HTTP com o JSON de resultados.

**Acceptance Scenarios**:

1. **Dado** que o webhook recebe payload válido com `nicho`, `quantidade`, `modo_teste` e `enviar_convites`, **quando** processado, **então** executa o bot e retorna o JSON de resultados com status HTTP 200.
2. **Dado** que `modo_teste: true`, **quando** o workflow executa, **então** processa no máximo 1 perfil, independente do valor de `quantidade`.
3. **Dado** que o workflow conclui (com sucesso ou interrupção), **quando** retorna a resposta, **então** o JSON contém apenas o array de perfis, sem texto adicional ou marcação Markdown.

---

### Edge Cases

- O que acontece quando a busca por nicho retorna zero resultados?
- Como o bot se comporta quando a página de busca carrega parcialmente (timeout de rede)?
- O que ocorre quando o limite de convites diários do LinkedIn é atingido durante a execução?
- Como lidar com perfis sem headline ou cargo definido (campos nulos)?
- O que fazer quando o modal "Adicionar nota" não abre após clicar em "Conectar"?
- Como garantir que o perfil persistente do browser está autenticado antes de iniciar a busca?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE aceitar parâmetros de entrada: `nicho` (string), `quantidade` (inteiro, máx 15), `enviar_convites` (booleano), `modo_teste` (booleano).
- **FR-002**: O sistema DEVE construir e navegar para a URL de busca de pessoas do LinkedIn usando o nicho fornecido, sem passar pela página inicial.
- **FR-003**: O sistema DEVE extrair perfis candidatos da página de busca usando avaliação do DOM, priorizando links que apontem para `/in/`.
- **FR-004**: O sistema DEVE abrir cada perfil candidato e validar aderência ao nicho com base em headline, cargo, sobre e atividades visíveis.
- **FR-005**: O sistema DEVE identificar e registrar para cada perfil: nome, cargo/headline, empresa (quando disponível) e URL canônica do perfil.
- **FR-006**: O sistema DEVE verificar se o perfil já é conexão de 1º grau e, se for, registrar `status: "ja_conectado"` sem executar ação de convite.
- **FR-007**: O sistema DEVE enviar convite de conexão sem mensagem somente quando `enviar_convites: true`, usando o fluxo: clicar em "Conectar" → fechar modal com "Enviar sem nota".
- **FR-008**: O sistema DEVE confirmar o envio do convite detectando o toast "Convite enviado" ou o botão "Pendente" antes de registrar `status: "convite_enviado"`.
- **FR-009**: O sistema DEVE interromper toda a execução imediatamente ao detectar captcha, checkpoint ou qualquer bloqueio de segurança do LinkedIn.
- **FR-010**: O sistema DEVE retornar o array de resultados parcial coletado até o momento da interrupção, com um objeto final contendo `"interrupcao": "captcha_detectado"`.
- **FR-011**: O sistema DEVE aplicar esperas entre ações: 2–4 s em `modo_teste: true`, 6–10 s em `modo_teste: false`.
- **FR-012**: O sistema DEVE evitar perfis duplicados por URL dentro da mesma execução.
- **FR-013**: O sistema DEVE limitar a execução a no máximo 15 perfis em modo normal e 1 perfil em `modo_teste: true`.
- **FR-014**: O sistema DEVE retornar somente JSON válido como saída, sem Markdown ou texto adicional.
- **FR-015**: O sistema DEVE registrar `status: "erro"` para falhas em perfis individuais (não relacionadas a bloqueio) e continuar processando os demais.
- **FR-016**: O sistema DEVE operar exclusivamente com a sessão autenticada do perfil persistente do browser, sem realizar login durante a execução.

### Key Entities

- **Perfil Prospectado**: Representa um candidato encontrado e processado. Atributos: `nome`, `cargo`, `empresa`, `perfil_url`, `status`, `mensagem_enviada`, `criterio`, `evidencia_aderencia`.
- **Parâmetros de Execução**: Representa o conjunto de inputs do operador para uma execução. Atributos: `nicho`, `quantidade`, `enviar_convites`, `modo_teste`.
- **Resultado de Execução**: Array de Perfis Prospectados, podendo conter um objeto de interrupção ao final.
- **Sessão de Browser**: Perfil persistente do Chrome/Chromium com autenticação LinkedIn ativa. Gerenciado externamente, antes da execução do bot.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O bot localiza e valida pelo menos 80% dos perfis candidatos encontrados na primeira página de resultados de busca, sem intervenção manual.
- **SC-002**: Em `modo_teste: true`, o bot conclui o processamento de 1 perfil em menos de 30 segundos.
- **SC-003**: Em modo normal (`modo_teste: false`), o bot processa até 15 perfis em menos de 5 minutos.
- **SC-004**: O bot detecta e interrompe a execução dentro de 5 segundos após a aparição de qualquer tela de captcha ou checkpoint do LinkedIn.
- **SC-005**: O retorno do bot é JSON válido e parseável em 100% das execuções concluídas (com ou sem interrupção).
- **SC-006**: A taxa de duplicidade de perfis por URL dentro de uma execução é 0%.
- **SC-007**: Quando `enviar_convites: false`, o bot realiza 0 ações de clique em botões de conexão em 100% das execuções.

---

## Assumptions

- O operador realiza o login manual no LinkedIn antes de iniciar o bot, usando o perfil persistente do browser.
- O browser com a sessão autenticada permanece aberto durante toda a execução do bot.
- O servidor MCP do Playwright está rodando e acessível antes do disparo do workflow.
- O N8N está rodando localmente e o workflow está publicado (em modo produção) ou aberto no editor (em modo teste).
- Limites de convites diários do LinkedIn são gerenciados pelo operador externamente; o bot não rastreia nem controla esse limite.
- A extensão Playwright está instalada no Chromium e conectada via CDP antes da execução.
- O bot opera em ambiente Linux local (não em nuvem ou serverless).
- Mensagens de convite personalizadas estão fora do escopo desta feature (convites sem nota apenas).
- O nicho é sempre uma string em português ou inglês, sem caracteres especiais além de espaços.
