# PROJETO NOVO Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-17

## Active Technologies

- TypeScript (Next.js 14+ App Router) + Prisma, Inngest, Groq Whisper API, Supabase (DB + Storage + Realtime), (005-admin-billing-dashboard)

## Project Structure

```text
app/                    → Next.js App Router pages e Server Components
  uploads/              → Módulo de Upload & Queue (001)
  transcricoes/         → Módulo de Visualização (002)
  clips/                → Módulo de Clipes (003)
  biblioteca/           → Módulo de Prompts (004)
  dashboard/            → Módulo Admin & Billing (005)
inngest/functions/      → Funções assíncronas (Inngest jobs)
prisma/                 → Schema e migrations (Prisma)
lib/                    → enums.ts, utils.ts compartilhados
__tests__/              → Vitest — testes críticos de negócio
```

## Commands

```bash
npm run dev           # inicia Next.js + Supabase local
npx inngest-cli dev   # inicia Inngest dev server
npm test              # Vitest
npm run lint          # ESLint + TypeScript check
```

## Code Style

- TypeScript estrito; camelCase para funções/variáveis; PascalCase para componentes
- Regras de negócio em `*.service.ts` — nunca em rotas ou componentes de UI
- Status e constantes em `lib/enums.ts` (ex: StatusProcessamento, FormatoAceito)
- Upload de arquivos via presigned URL (Supabase Storage) — nunca multipart pelo servidor
- Jobs assíncronos via Inngest — cada step dentro do limite de 60s da Vercel

## Recent Changes

- 005-admin-billing-dashboard: Added TypeScript (Next.js 14+ App Router) + Prisma, Inngest, Groq Whisper API, Supabase (DB + Storage + Realtime),

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
