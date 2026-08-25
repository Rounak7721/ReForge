# Reforge

Point Reforge at any product's website. It analyzes what the product does, who it
serves and where it falls short, then generates your own product concept — which
you refine in plain English.

> **Status:** in active development. This README is expanded to the full required
> sections in Phase 7; see `project_guidelines/06-deliverables.md`.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui (Radix) ·
Supabase (Postgres + Auth) · Gemini Flash · Vercel

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in the values
pnpm dev
```

```bash
pnpm lint    # must pass before commit
pnpm build   # must pass before any deploy
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, data model, API routes, deploy process
- [`docs/PROMPTS.md`](docs/PROMPTS.md) — the prompts that shaped this build
- [`docs/DEBUGGING.md`](docs/DEBUGGING.md) — real failures and how they were resolved
- [`HANDOFF.md`](HANDOFF.md) — current status and next actions
