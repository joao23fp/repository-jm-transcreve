# Research: LinkedIn Prospecting Bot

**Date**: 2026-05-19
**Status**: Complete — sem NEEDS CLARIFICATION pendentes

---

## Decisão 1: Modo de conexão Playwright MCP → Browser

**Decision**: Usar modo `--extension` do Playwright MCP conectando ao Chromium via CDP (porta 9222).

**Rationale**: O LinkedIn detecta e bloqueia browsers automáticos sem fingerprint humano. Usar o Chromium real do Playwright com a extensão oficial permite reutilizar um perfil autenticado persistente sem realocar cookies manualmente. O CDP (Chrome DevTools Protocol) é o protocolo padrão para controle de browsers já em execução.

**Alternatives Considered**:
- Headless Chromium: Descartado — LinkedIn detecta user-agent headless e bloqueia.
- Puppeteer direto: Descartado — não integra com N8N via protocolo MCP.
- Modo padrão Playwright MCP sem extensão: Descartado — não reutiliza sessão autenticada entre execuções; requereria login a cada vez.

---

## Decisão 2: Modelo de AI — Claude via Anthropic

**Decision**: Claude (Anthropic) via nó `lmChatAnthropic` do N8N Langchain.

**Rationale**: Claude demonstra melhor raciocínio sobre contexto de UI/DOM e seguimento de instruções complexas de automação. O projeto já estava configurado com este modelo.

**Alternatives Considered**:
- GPT-4o: Compatível, mas Claude tem melhor desempenho em instruções longas e seguimento estrito de regras.
- Modelo local (Ollama): Descartado — latência e qualidade insuficientes para raciocínio de automação.

---

## Decisão 3: Orquestração via N8N

**Decision**: N8N (Docker local) como orquestrador de workflow.

**Rationale**: N8N oferece nó nativo para AI Agent com suporte a ferramentas MCP via `@n8n/n8n-nodes-langchain.mcpClientTool`. O trigger via webhook HTTP permite disparos tanto manuais quanto automatizados. A interface visual facilita inspeção e debug do fluxo.

**Alternatives Considered**:
- Script Node.js puro: Mais difícil de depurar; sem UI de inspeção.
- Zapier/Make.com: Cloud — incompatível com restrição de infraestrutura local.

---

## Decisão 4: Estratégia de navegação no LinkedIn

**Decision**: Navegação direta via URL de busca (`/search/results/people/?keywords=<nicho>`), sem passar pela homepage.

**Rationale**: Reduz o número de páginas visitadas e cliques realizados, diminuindo a superfície de detecção de comportamento automatizado. A URL de busca é pública e estável.

**Alternatives Considered**:
- Navegar pela homepage → barra de busca: Mais cliques, mais exposição, mesmo resultado.
- Usar LinkedIn Sales Navigator: Requer assinatura paga; fora do escopo.

---

## Decisão 5: Extração de resultados — `browser_evaluate` em lote

**Decision**: Usar `browser_evaluate` para extrair todos os anchors `/in/` visíveis em uma única chamada, antes de visitar perfis individuais.

**Rationale**: Minimiza o número de chamadas MCP na fase de coleta. Extrair todos os URLs de uma vez evita recarga de página e garante que a lista de candidatos está fixada antes de qualquer navegação de perfil.

**Alternatives Considered**:
- Clicar em cada resultado e voltar: Mais chamadas, mais lento, maior risco de detecção.
- `browser_snapshot` para parsing: Mais verboso no token count; `browser_evaluate` é mais eficiente para extração estruturada.

---

## Decisão 6: Gestão de perfil persistente

**Decision**: Perfil Chromium em `profiles/linkedin-extension-native/` com login manual uma única vez via `setup-login.sh`.

**Rationale**: O perfil persiste cookies e sessão do LinkedIn entre execuções. A validação do cookie `li_at` via `check-login.sh` confirma que a sessão está ativa antes de usar o bot.

**Alternatives Considered**:
- Relogin a cada execução: Acionaria verificação de segurança do LinkedIn frequentemente.
- Uso do Chrome do sistema (Flatpak): Descartado — Flatpak isola dados entre apps, tornando o perfil inacessível para scripts externos.

---

## Decisão 7: Armazenamento — sem banco de dados

**Decision**: Nenhuma persistência além de logs de arquivo (`logs/mcp-YYYYMMDD.log`). Dados de prospecção retornam apenas na response do webhook.

**Rationale**: A ferramenta é single-user, local e stateless por design. Histórico de prospectados (se necessário) é responsabilidade do operador (ex: copiar o JSON de saída).

**Alternatives Considered**:
- SQLite para histórico de perfis: Adicionaria deduplicação cross-execução, mas fora do escopo da feature atual.

---

## Itens Resolvidos (sem NEEDS CLARIFICATION)

| Tópico | Resolução |
|--------|-----------|
| Modelo de AI | Claude via Anthropic (já configurado) |
| Autenticação LinkedIn | Perfil persistente + cookie `li_at` |
| Anti-detecção | Esperas humanas + Chromium real + extensão |
| Saída | JSON puro, array sempre presente |
| Persistência | Nenhuma (logs de arquivo apenas) |
| Infraestrutura | 100% local (Docker + scripts Bash) |
