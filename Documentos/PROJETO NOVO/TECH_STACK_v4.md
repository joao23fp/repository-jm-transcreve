# 🎙️ SpecKit — Constituição do Projeto
> Plataforma de Transcrição de Áudio e Vídeo de Reuniões

---

## 1. A Planta da Casa (Arquitetura e Organização)

### Qual linguagem, framework e bibliotecas o time vai usar?

Stack padronizada — todo mundo fala a mesma língua. A IA entende o projeto. Pull requests são mais previsíveis.

**Stack definida:**
- Linguagem: `TypeScript`
- Framework principal: `Next.js`
- Banco de dados: `PostgreSQL` (hospedado no Supabase)
- ORM: `Prisma`
- Fila de processamento: `Inngest`
- IA de transcrição: `Groq Whisper`
- Storage: `Supabase Storage`
- Tempo real: `Supabase Realtime`
- Principais bibliotecas: `shadcn/ui`, `Tailwind CSS`, `Clerk`, `Resend`, `Vitest`, `Sentry`

> 💡 Motivo: Stack ideal para dev solo — ecossistema unificado (front + back no mesmo projeto), maior suporte de IA, comunidade enorme e hospedagem gratuita via Vercel + Supabase. Inngest e Groq são adições obrigatórias nesse produto, onde processamento assíncrono e IA são o core.

---

### Onde escrevemos as regras pesadas do app?

Na "gaveta" de Serviços (Service Layer): arquivos separados só para regra de negócio.

```
app/
  uploads/
    uploads.service.ts        → recebe, valida e armazena arquivos
  transcricoes/
    transcricoes.service.ts   → orquestra o fluxo completo de transcrição
  usuarios/
    usuarios.service.ts       → planos, cotas, limites de uso
  dashboard/
    dashboard.service.ts      → métricas e histórico do usuário
lib/
  enums.ts                    → todos os status e constantes
  utils.ts                    → funções utilitárias compartilhadas
```

> 💡 Motivo: O fluxo principal (upload → fila → IA → resultado) é lógica pesada demais para ficar nas rotas. Cada etapa em seu próprio serviço facilita manutenção, testes e troca de provedor de IA no futuro.

---

### Como agrupamos nossos arquivos e pastas?

Por Assunto/Feature: cada módulo tem sua própria pasta com tudo que precisa.

```
app/
  uploads/          → receber e validar arquivos de áudio/vídeo
  transcricoes/     → orquestrar processamento e exibir resultados
  usuarios/         → planos, cotas, histórico
  dashboard/        → visão geral das transcrições
lib/
  enums.ts          → StatusTranscricao, TipoArquivo, TipoPlano
  utils.ts          → funções compartilhadas
```

> 💡 Motivo: Tudo relacionado a um tema fica em um só lugar. Facilita encontrar, alterar e deletar funcionalidades sem impactar o resto do sistema.

---

### Textos e Status "Mágicos"

Usamos Enums/Constantes — arquivo central com todos os valores definidos.

```typescript
// lib/enums.ts
export enum StatusTranscricao {
  AGUARDANDO  = "AGUARDANDO",   // upload recebido, na fila
  PROCESSANDO = "PROCESSANDO",  // IA trabalhando
  CONCLUIDA   = "CONCLUIDA",    // pronta para o usuário
  ERRO        = "ERRO",         // algo deu errado
}

export enum TipoArquivo {
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
}

export enum TipoPlano {
  BASICO = "BASICO",
  PRO    = "PRO",
}

export enum FormatoAceito {
  MP3  = "mp3",
  MP4  = "mp4",
  WAV  = "wav",
  M4A  = "m4a",
  WEBM = "webm",
  MOV  = "mov",
}
```

> 💡 Motivo: Previne erros de digitação ("Concluida" vs "CONCLUIDA") que quebram o sistema silenciosamente. TypeScript sublinha o erro antes de rodar o código.

---

### Como nomeamos as coisas no código?

camelCase — padrão do TypeScript/JavaScript.

- Funções e variáveis: `buscarTranscricao`, `processarAudio`, `verificarCota`
- Arquivos: `transcricoes.service.ts`, `uploads.model.ts`
- Componentes React: `CardTranscricao`, `ProgressoUpload`
- Constantes globais: `ENUM` (caixa alta, como definido acima)

> 💡 Motivo: camelCase é o padrão nativo do TypeScript e do ecossistema Next.js. Toda IA e toda documentação segue esse padrão — sem atrito.

---

## 2. Segurança e Autenticação

### Como fazemos o login/autenticação?

Serviço dedicado: **Clerk**

- Login, cadastro e recuperação de senha prontos em horas
- Suporte nativo a Next.js App Router
- Plano gratuito generoso para o MVP

> 💡 Motivo: Dev solo não deve gastar semanas implementando autenticação do zero — com risco de falhas de segurança. Clerk resolve isso em uma tarde.

---

### Como controlamos permissões de acesso?

Middleware centralizado + verificação de cota por plano.

```typescript
// middleware.ts — protege todas as rotas
export default authMiddleware({
  publicRoutes: ["/", "/precos", "/login"],
})

// uploads.service.ts — verificação de cota antes de aceitar upload
if (usuario.minutosUsados >= usuario.plano.limiteMinutos) {
  throw new Error("Limite do plano atingido")
}
```

> 💡 Motivo: Duas camadas de proteção: autenticação (quem pode entrar) e cota (quanto cada plano pode usar). Fundamental para um produto baseado em consumo de IA.

---

## 3. Banco de Dados

### Onde guardamos o texto transcrito?

No próprio banco (PostgreSQL) — o texto da transcrição fica em uma coluna do tipo `TEXT`.

> 💡 Motivo: PostgreSQL aguenta bem textos grandes. Para o MVP, centralizar tudo no banco simplifica buscas, filtragens e manutenção. Migração para storage externo pode ser feita no futuro se o volume justificar.

---

### Como gerenciamos mudanças no banco?

Migrações versionadas com **Prisma Migrate**.

```bash
# Cada mudança no schema vira um arquivo rastreável
npx prisma migrate dev --name adicionar_coluna_duracao
```

> 💡 Motivo: Histórico completo de toda evolução do banco, reversível e documentado no repositório. Indispensável para não perder dados em produção.

---

### Dados sensíveis

Campos críticos criptografados — dados pessoais dos usuários protegidos em repouso.

> 💡 Motivo: O sistema armazena dados pessoais e áudios de reuniões possivelmente confidenciais, enquadrando-se plenamente na LGPD.

---

### Backup

Automático via **Supabase** — incluído no plano gratuito, sem configuração adicional.

---

## 4. Armazenamento de Arquivos

### Onde ficam os arquivos de áudio e vídeo?

**Supabase Storage** — já está na stack, integração simples, sem configuração extra.

---

### Como fazemos o upload?

Upload direto pro Storage via **presigned URL** — o navegador envia o arquivo direto para o Supabase, sem passar pelo servidor Next.js.

```
Navegador → (presigned URL) → Supabase Storage
                                      ↓
                              Next.js recebe confirmação
                                      ↓
                              Inngest enfileira o job
```

> 💡 Motivo: Arquivos de áudio e vídeo podem ser pesados. Passar pelo servidor travaria requisições e causaria timeouts. Presigned URL elimina esse gargalo.

---

### Quais formatos são aceitos?

Formatos comuns compatíveis com Groq Whisper:

- `MP3`, `MP4`, `WAV`, `M4A`, `WebM`, `MOV`

> 💡 Motivo: Cobre 99% dos casos reais de gravações de reunião e é totalmente compatível com o Groq Whisper. "Qualquer formato" exigiria conversão automática — complexidade desnecessária no MVP.

---

## 5. Frontend e Experiência do Usuário

### Como as páginas são renderizadas?

SSR — Server Side Rendering (padrão do Next.js App Router).

> 💡 Motivo: Melhor performance no carregamento inicial, padrão natural do Next.js sem configuração extra.

---

### Como construímos a interface?

Biblioteca pronta: **shadcn/ui + Tailwind CSS**

- Componentes prontos: tabelas, formulários, modais, progress bars, badges de status
- Totalmente personalizável
- Integração nativa com Next.js e TypeScript

> 💡 Motivo: Economiza semanas de trabalho em componentes visuais. Foco nas telas do produto, não em estilizar inputs do zero.

---

### Como mostramos o progresso da transcrição?

**Supabase Realtime** — o navegador recebe atualização instantânea quando o status muda no banco.

```
AGUARDANDO → PROCESSANDO → CONCLUÍDA
```

O usuário vê o progresso em tempo real sem recarregar a página.

> 💡 Motivo: Transcrições podem levar minutos. Sem feedback em tempo real, o usuário não sabe se o sistema está funcionando. Supabase Realtime já está na stack — zero esforço extra.

---

## 6. Processamento Assíncrono

### Como processamos as transcrições em background?

**Inngest** — fila de processamento gerenciada com retentativas automáticas.

**Fluxo completo:**
```
Usuário faz upload
      ↓
Supabase Storage (arquivo salvo)
      ↓
Inngest (job entra na fila)
      ↓
Worker chama Groq Whisper
      ↓
Resultado salvo no banco (StatusTranscricao.CONCLUIDA)
      ↓
Supabase Realtime notifica o navegador
      ↓
Usuário vê a transcrição pronta ✅
```

Se qualquer etapa falhar, Inngest tenta novamente automaticamente. O painel nativo do Inngest mostra cada job, tentativas, falhas e tempo de execução.

> 💡 Motivo: Chamar a IA direto na rota causaria timeouts em arquivos longos. Inngest isola o processamento em background com retentativas automáticas e monitoramento — essencial para um produto que depende de IA.

---

### Como lidamos com o timeout da Vercel?

Inngest quebra o job em etapas menores, cada uma dentro do limite de 60 segundos do plano gratuito da Vercel.

> 💡 Motivo: Evita custo do Vercel Pro no MVP. Migrar para Pro quando o volume justificar o investimento.

---

## 7. Inteligência Artificial

### Qual provedor de transcrição?

**Groq Whisper**

- Velocidade de transcrição superior ao mercado
- Ótima qualidade em português brasileiro
- Plano gratuito generoso para o MVP
- Paga por minuto de áudio em produção

> 💡 Motivo: Melhor custo-benefício para o MVP. Mais rápido que OpenAI Whisper, com qualidade equivalente. Se diarização (identificação de speakers) for necessária no futuro, migrar para AssemblyAI sem refatorar o resto do sistema.

---

### Diarização (identificação de speakers)?

**Fora do MVP** — apenas o texto transcrito na versão inicial.

> 💡 Motivo: Groq Whisper não suporta diarização nativamente. Adicionar um segundo provedor só para isso seria complexidade desnecessária no MVP. Entra em versão futura via AssemblyAI.

---

### Como controlamos os custos de IA?

Limite por plano + alertas de custo desde o início.

- **Limite por plano:** Sistema bloqueia novos uploads quando a cota de minutos é atingida
- **Alertas:** Dashboard do Groq configurado com alertas por e-mail ao atingir % do limite mensal
- **Proteção contra abuso:** Validação de cota antes de aceitar qualquer upload

> 💡 Motivo: Um loop de bug ou usuário abusivo pode gerar custos inesperados em horas. Controle de cota desde o dia 1 é proteção obrigatória em produtos com IA.

---

### Privacidade dos dados enviados à IA

Opt-out de treinamento configurado no Groq + termos de uso claros para o usuário.

- Conta do Groq configurada com opt-out de uso de dados para treinamento
- Termos de uso informam explicitamente que áudios são processados pelo Groq
- Política de retenção de arquivos definida (ex: áudio deletado do storage após X dias)

> 💡 Motivo: Reuniões podem conter informações confidenciais. LGPD exige transparência sobre processamento por terceiros. Opt-out protege os dados dos usuários e o negócio de responsabilidades legais.

---

## 8. Testes

### Qual é a estratégia de testes?

Testar apenas as regras críticas com **Vitest**.

Prioridade de cobertura:
```typescript
it("deve bloquear upload quando cota esgotada")
it("deve atualizar status para ERRO quando IA falha")
it("deve calcular minutos consumidos corretamente")
it("deve rejeitar formatos de arquivo não suportados")
it("deve notificar usuário por e-mail quando transcrição falha")
```

> 💡 Motivo: Para dev solo no MVP, testes completos são inviáveis. Testar o que causa prejuízo real (cota, status, validação) é o equilíbrio certo entre segurança e velocidade de desenvolvimento.

---

## 9. Controle de Versão e Deploy

### Versionamento

**Git + GitHub** — histórico completo, base para o deploy automático.

---

### Deploy

Deploy automático: **Vercel + GitHub**

```
git push → Vercel detecta → publica automaticamente
```

- Rollback com um clique em caso de problema
- Preview automático para cada branch
- Plano gratuito para o MVP

> 💡 Motivo: O combo mais usado no mundo para Next.js. Zero configuração de servidor, zero estresse com infraestrutura.

---

## 10. Monitoramento e Logs

### Como monitoramos erros e jobs?

Três camadas de monitoramento:

- **Sentry:** Alertas automáticos de erros em produção com linha exata do código
- **Inngest painel:** Monitoramento de cada job de transcrição — tentativas, falhas, tempo de execução
- **Vercel logs:** Logs básicos da aplicação, incluído gratuitamente

> 💡 Motivo: Três componentes críticos para monitorar (servidor, fila e IA). Cada ferramenta cobre uma camada diferente sem sobreposição.

---

### O que acontece quando a transcrição falha?

Status atualizado para `StatusTranscricao.ERRO` + e-mail automático notificando o usuário.

> 💡 Motivo: Sem notificação, o usuário fica esperando indefinidamente sem saber o que aconteceu. E-mail de erro com instrução para tentar novamente reduz suporte e melhora experiência.

---

## 11. Comunicação com o Usuário

### Como o app envia e-mails?

Serviço dedicado: **Resend**

- E-mails que chegam de verdade (não caem no spam)
- Integração nativa com Next.js em menos de 1 hora
- Plano gratuito generoso

---

### Quais e-mails o MVP envia?

5 e-mails críticos implementados desde o início:

| E-mail | Gatilho |
|--------|---------|
| Confirmação de cadastro | Novo usuário criado |
| Transcrição concluída ✅ | `StatusTranscricao.CONCLUIDA` |
| Transcrição falhou ❌ | `StatusTranscricao.ERRO` |
| Cota quase esgotada ⚠️ | 80% dos minutos do plano usados |
| Cota esgotada 🚫 | 100% dos minutos usados — upgrade necessário |

---

### Notificações push e SMS?

**Fora do MVP** — apenas e-mail na versão inicial.

---

## 12. Pagamentos e Recorrência

### Qual gateway de pagamento?

**Pagar.me** — gateway nacional

- Suporte a Pix, boleto e cartão de crédito
- Documentação em português
- Módulo de assinaturas nativo
- Sandbox para testes sem gastar dinheiro real

> 💡 Motivo: Público brasileiro, menor fricção, suporte local e documentação acessível.

---

### Modelo de acesso

Somente planos pagos — sem freemium, sem plano gratuito.

- **Plano Básico:** limite de X minutos/mês
- **Plano Pro:** limite de Y minutos/mês

> 💡 Motivo: Receita desde o primeiro usuário. Considerar trial de 7 dias com cartão no futuro para equilibrar conversão e receita.

---

### O que acontece quando a cobrança falha?

Período de graça de 3 dias + tentativas automáticas pelo Pagar.me.

- Sistema tenta cobrar novamente em 1, 2 e 3 dias
- E-mail de aviso enviado ao usuário em cada tentativa
- Acesso suspenso apenas após esgotamento do período de graça

> 💡 Motivo: Cartão recusado por limite temporário é comum. Cancelar na hora gera churn involuntário e suporte desnecessário. 3 dias de graça reduz significativamente esse problema.

---

### Como testamos pagamentos?

Sandbox do Pagar.me + cartões de teste — seguro, gratuito e testável automaticamente antes de qualquer deploy em produção.

---

## 📋 Resumo das Decisões

| # | Tema | Decisão |
|---|------|---------|
| 1 | Linguagem | TypeScript |
| 1 | Framework | Next.js |
| 1 | Banco de dados | PostgreSQL via Supabase |
| 1 | ORM | Prisma |
| 1 | Regras de negócio | Camada de Serviços |
| 1 | Estrutura de pastas | Por Feature |
| 1 | Status mágicos | Enums/Constantes |
| 1 | Nomenclatura | camelCase |
| 2 | Autenticação | Clerk |
| 2 | Controle de acesso | Middleware + verificação de cota por plano |
| 3 | Texto transcrito | No banco (PostgreSQL) |
| 3 | Migrações | Prisma Migrate |
| 3 | Backup | Supabase (automático) |
| 4 | Storage | Supabase Storage |
| 4 | Método de upload | Presigned URL (direto ao storage) |
| 4 | Formatos aceitos | MP3, MP4, WAV, M4A, WebM, MOV |
| 5 | Renderização | SSR (Next.js padrão) |
| 5 | UI | shadcn/ui + Tailwind CSS |
| 5 | Progresso em tempo real | Supabase Realtime |
| 6 | Fila de processamento | Inngest |
| 6 | Timeout Vercel | Inngest gerencia em etapas |
| 7 | IA de transcrição | Groq Whisper |
| 7 | Diarização | Fora do MVP |
| 7 | Controle de custos | Limite por plano + alertas |
| 7 | Privacidade | Opt-out Groq + Termos de uso claros |
| 8 | Testes | Vitest nas regras críticas |
| 9 | Versionamento | Git + GitHub |
| 9 | Deploy | Vercel (automático via GitHub) |
| 10 | Monitoramento | Sentry + Inngest painel + Vercel logs |
| 10 | Falha de transcrição | ERRO + notificação por e-mail |
| 11 | E-mails | Resend (5 e-mails críticos) |
| 11 | Push/SMS | Fora do MVP |
| 12 | Gateway | Pagar.me |
| 12 | Modelo de acesso | Somente planos pagos |
| 12 | Falha de cobrança | Período de graça 3 dias + tentativas |
