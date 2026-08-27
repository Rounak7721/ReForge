# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read `internal/notes/HANDOFF.md` first

**Every new session starts by reading `internal/notes/HANDOFF.md`.** It carries current status, the next actions, decisions already made, and open questions. It is maintained at the end of every session and is the fastest path back to full context.

Then check `internal/guidelines/08-mvp-checklist.md` for what is actually built. Phases 0 and 1 are done: the app is scaffolded and deployed, and Supabase schema, RLS and auth are in place. `lib/llm/` and `lib/prompts/` are still empty. Do not assume any code path in this document exists; check first.

## Source of truth for requirements

The assignment PDF is at `internal/brief/AI FS Engineer Technical Task.pdf`. **Do not re-read it** — it is fully distilled into `internal/guidelines/`, which is the working reference:

- `internal/guidelines/README.md` — index and the three easiest things to forget
- `01-assignment-brief.md` — objective, the challenge, time limit, the live-change final test
- `02-functional-requirements.md` — the 7 required areas as literal gradeable checklists
- `03-tech-stack.md` — stack, cost rules, env vars, bootstrap commands
- `04-execution-flows.md` — core loop, 3-call pipeline, failure modes, deploy flow
- `05-bonus-features.md` — all 7 bonuses, effort/verdict, build order
- `06-deliverables.md` — the 5 submissions + video script + pre-submission checklist
- `07-scoring-map.md` — 100-point rubric mapped to actions; time allocation
- `08-mvp-checklist.md` — **the live task tracker**; update it as work happens
- `09-tooling.md` — the MCP servers, skills, and subagents this project needs

Check any feature against `02-functional-requirements.md` before building it. Those docs mark our own choices as **[OUR DECISION]** to keep "required" and "chosen" distinct.

## What we're building

Reforge: a SaaS MVP that takes a website URL + a short description + target customer, analyzes the site with an LLM, and produces a structured product concept (summary, users, core problem, features, business model, suggested improvements, MVP feature list). The user then clicks "Build My Product" to generate a proposed name / description / feature list / navigation / page structure / UI direction, and refines it through natural-language chat ("make it more premium", "add a dashboard", "remove pricing"). Everything is saved per-project and reopenable from a protected dashboard. Plus a polished public landing page for Reforge itself.

This is a 48–72h brief being executed in ~24h. Optimize for a working, demoable MVP, not polish.

## Working agreement — applies to every turn, read before acting

- **Plan before you build.** For any non-trivial change, enter plan mode first: propose the approach, list the files you'll create/modify, note tradeoffs. Wait for explicit approval. Do not write code from an unapproved plan.
- **One phase at a time.** After implementing an approved phase, stop, summarize the diff in a few lines, and propose the next step. Do not chain into the next phase on your own.
- **Review gate.** After a phase, run the `code-review` skill on your own diff and surface its findings before approval.
- **Ask before irreversible actions.** Never run a DB migration, `git push`, `vercel deploy`, delete files, or rotate secrets without asking first in that message.
- **Suggest, don't assume.** For real decisions (schema shape, auth flow, library choice), present 2 options with a one-line recommendation. For trivial ones, just do it and mention it.
- **Log as you go.** Append to `docs/03-prompt-log.md` and `docs/04-debugging-log.md` in the same turn the material appears — see "Documentation is Claude's job" below. Never batch this to the end.
- **Token discipline.** Prefer Context7 for library APIs over recalling signatures. Keep files small and modular. Don't re-read the whole repo when a targeted read will do.

## Stack & hard constraints

- **Framework:** Next.js 15 (App Router), TypeScript strict, Tailwind, shadcn/ui.
- **DB + Auth:** Supabase (Postgres + Supabase Auth) — one service for both. Row Level Security on.
- **Runtime LLM:** `gemini-3.1-flash-lite`, **free tier**, via `@google/genai`. Do not use Anthropic or OpenAI at runtime — cost constraint. Chosen on **daily quota**: the 3.x Flash models allow 20 requests/day, which is 3 complete demos; flash-lite allows 500. Verified 2026-08-25; `gemini-2.5-flash` is 404 for new keys and `*-latest` aliases are unstable. Table in `internal/guidelines/03-tech-stack.md`.
- **Screenshots (bonus only):** microlink.io free tier. Do not self-host Chromium on serverless.
- **Hosting:** Vercel Hobby (free).
- **Zero recurring cost is a requirement.** If a choice adds cost, stop and ask.

### Cost rules (enforce in code)

- Cache every analysis/build result in Postgres. Reopening a saved project must render from the DB and **never** re-call Gemini.
- Set `maxOutputTokens` on every Gemini call. Keep prompts lean — **but note it caps thinking + output combined.** Too lean and the model spends the whole budget reasoning and returns HTTP 200 with `content: {}` and no `parts` array, which makes the usual `parts[0].text` accessor throw. `lib/llm` pins `thinkingLevel: "low"`, enforces a token floor, and raises a typed error on missing `parts`. See `docs/04-debugging-log.md` entry 2.
- **Free tier is 15 RPM and 500 requests/DAY** (measured, not assumed). The daily cap is the real constraint: one complete demo is 6 calls. Debounce the chat-edit box and serialize requests; handle 429 as two distinct states — per-minute (retrying works) and **per-day (retrying never works, say so honestly)**.
- **Seed a demo account with a pre-analyzed project.** With a hard daily ceiling shared with the grader, this is required insurance, not a nice-to-have.

## Architecture

Next.js App Router. UI in Server Components where possible; interactive bits are Client Components. **Data mutations go through Route Handlers under `app/api/*`, called from the client** — use this pattern throughout rather than mixing in Server Actions.

All LLM calls are server-side only; the model key never reaches the browser. Supabase has three server-side clients: `server.ts` (anon key + cookies, acts as the signed-in user, RLS-guarded), `middleware.ts` (session refresh), and `admin.ts` (service role, `import "server-only"`). **Never import the service-role client into a Client Component.**

There is deliberately **no browser client.** Every mutation goes through a Route Handler, so nothing client-side needs Supabase — which is also why `NEXT_PUBLIC_*` never reaches the client bundle. If you add one, that changes: the anon key ships to the browser, and `docs/`/`Dockerfile` claims about the bundle need updating with it.

### Target directory shape

```
app/
  (marketing)/            # public landing page
  (app)/dashboard/        # protected
  api/analyze/route.ts    # POST url+desc+customer -> analysis JSON (cached)
  api/build/route.ts      # POST projectId -> product concept JSON (cached)
  api/refine/route.ts     # POST projectId + instruction -> updated concept JSON
lib/
  llm/                    # provider abstraction (see below)
  supabase/               # server.ts, middleware.ts, admin.ts
  prompts/                # analyzer.ts, builder.ts, editor.ts
components/
docs/                     # the four REQUIRED process documents, ASD-STE100
  01-ai-development-process.md
  02-ai-tools-and-workflow.md
  03-prompt-log.md
  04-debugging-log.md
internal/                 # working material, NOT a deliverable
  brief/  guidelines/  notes/
```

### LLM provider layer — the model is swappable (hard rule)

All model calls go through `lib/llm`. Feature code imports **only** `getLLM` and `generateStructured` from `@/lib/llm` and never imports a vendor SDK (`@google/genai`, `openai`, `@anthropic-ai/sdk`) directly — those live only inside `lib/llm/providers/*`.

Switching model or vendor must be an **env change only** (`LLM_PROVIDER` + `<VENDOR>_MODEL`), with zero edits to analyzer/builder/editor. Adding a vendor = one new file in `providers/` + one line in `registry.ts`.

The abstraction supports `gemini|openai|anthropic`, but **the runtime/deployed provider is always `gemini`** — the others exist so the layer is provably swappable, not to be enabled.

If you're about to call a model SDK from a route or component, stop and route it through this layer instead.

### The product's runtime AI pipeline (a feature, not your subagents)

Three server-side chained Gemini calls, each returning strict JSON parsed into typed objects:

1. **Analyzer** — fetch the target site's text (and screenshot for the vision bonus) → analysis object.
2. **Builder** — analysis → proposed product concept object.
3. **Editor** — current concept + user instruction → updated concept object (idempotent; returns the full object).

The 5-agent Research→Product→UI→QA pipeline is a **stretch bonus**. Don't build it until the 3-call version works end to end and is deployed.

## Conventions

- TypeScript strict; no `any` in committed code. Type every API boundary and every LLM JSON shape — **validate LLM output with zod**, models return malformed JSON sometimes.
- Every API route: validate input, wrap the LLM call in try/catch, return typed error JSON with a proper status. No unhandled promise rejections.
- Secrets only in `.env.local` (git-ignored) and Vercel env vars. Never inline a key. Keep `.env.example` current with every new var. LLM config is env-driven: `LLM_PROVIDER` plus the active vendor's `*_API_KEY` and `*_MODEL` (e.g. `GEMINI_API_KEY`, `GEMINI_MODEL`). Default provider is `gemini`.
- UI: shadcn/ui components, consistent spacing scale, loading and empty states on every async view. It should read like a startup, not a class project.
- Commit after every approved phase with a clear message. Small, reviewable diffs.

## Commands

Bootstrap (not yet run — git is initialised, but there is no `package.json`):

```bash
pnpm create next-app@latest . --typescript --tailwind --app --eslint
pnpm dlx shadcn@latest init
```

Day to day:

```bash
pnpm dev              # local dev server
pnpm build            # must pass before any deploy
pnpm lint             # must pass before commit
vercel                # deploy preview (ASK before running; use the `deploy` skill)
```

There is no test suite and none is planned for the MVP. Verification is `pnpm build` + `pnpm lint` + manually walking the flows (or the `qa-tester` subagent driving Playwright). If you add tests, note the runner and single-test invocation here.

## Tooling

Full rationale in `internal/guidelines/09-tooling.md`. Summary:

- **context7** — pull current Next.js 15 / supabase-js / Gemini SDK docs before writing against an API. Default to this instead of recalling signatures.
- **playwright** — QA phase only; drive the deployed app.
- **supabase MCP** — not yet configured. Either add it or commit to the Supabase CLI + `supabase/migrations/`. Pick one, early.
- **obsidian MCP** — enabled globally, unused here; disable it for this project.
- **Skills to use:** `frontend-design` (landing page + UI), `code-review` (the review gate), `security-review` (before deploy and before submission), `run`.
- **Project skills in `.claude/skills/`:** `prompt-log` and `debug-log` (fire automatically when material appears — see below), `deploy` (before any deploy), `wrap-up` (end of session).
- **Subagents: none.** `code-review` replaces the `reviewer` subagent; `playwright` + `run` replace `qa-tester`. Don't build subagents for a 48h project.

## Documentation is Claude's job, not a later chore

35 of 100 points are process documentation (`internal/guidelines/07-scoring-map.md`). These logs are maintained **by you, continuously** — the user does not write them and should never have to review them for cleanup.

### `docs/03-prompt-log.md`

Use the **`prompt-log`** skill. When a prompt in this session is worth keeping — it unblocked something, shaped the architecture, or its failure taught something — append it immediately, in the same turn. At append time:

1. **Fix spelling and typos** in the prompt before recording it. Record the corrected version.
2. **Answer all four required questions right then**: what was asked, why it was structured that way, what the AI produced, what was changed afterward.
3. Never leave a placeholder or a "fill in later". The fourth question especially — "what I changed and why" — is the one that demonstrates judgment, and it cannot be reconstructed days later.

Target 5–10 entries by submission. Quality over count.

### `docs/04-debugging-log.md`

Use the **`debug-log`** skill. Log every real failure **at the moment it happens, before fixing it**, in Problem → AI prompt → Attempted solution → Debugging → Final solution format. Minimum 2 by submission; the brief calls this out as "important" and it's worth 10 points. A bug fixed silently is a lost point.

### Keep current as you go

The root `README.md` carries the nine required sections and is **canonical**.
`internal/notes/ARCHITECTURE.md` is a superseded record — do not update it; where the two disagree, the README wins.

**`docs/` is a closed set.** It holds only the four topics the brief names. Do not add a fifth file there — working material goes in `internal/notes/`.
Every file in `docs/` and the root `README.md` is written in **ASD-STE100 Simplified Technical English** with Mermaid diagrams: short sentences, active voice, one idea per sentence, no idioms or metaphors, one term per concept. Match that register when you edit them.

## Git

Maintain a proper history from the start.

- Commit after every approved phase, with a clear message. Small, reviewable diffs.
- Branch before committing if on the default branch.
- **Local only for now.** Push to GitHub once the MVP works — then connect Vercel to the repo for CI/CD auto-deploy. Ask before the first push.
- Never commit `.env.local` or any secret. Keep `.env.example` current with every new var.

## Session wrap-up

Use the **`wrap-up`** skill. When the user says to wrap up, update everything relevant and hand off — in this order:

1. `internal/guidelines/08-mvp-checklist.md` — tick only what is done **and verified on the deployed URL**
2. `docs/03-prompt-log.md` and `docs/04-debugging-log.md` — append anything from the session not yet logged
3. root `README.md` — reflect real structure (nine sections, STE)
4. **`internal/notes/HANDOFF.md`** — status, next actions, new decisions, new open questions. This is what the next session reads first, so write it for someone with no memory of this conversation.
5. Commit.

## Definition of done (per feature)

- Types check; `pnpm lint` and `pnpm build` pass.
- Loading + error + empty states present.
- No secret reaches the client bundle.
- Result cached in the DB where the cost rules require it.
- `code-review` has passed and the change is approved.

## Graded deliverables — keep current, don't leave to the end

- `docs/03-prompt-log.md` — 5–10 best prompts, each with: what you asked, why phrased that way, what it produced, what you changed.
- `docs/04-debugging-log.md` — ≥2 real failures with the full Problem→Prompt→Attempt→Debug→Fix trail.
- root `README.md` — stack, data model, API routes, models used, deploy process, limitations (the nine required sections).
- `docs/01-ai-development-process.md` — blank folder to deployed product.
- `docs/02-ai-tools-and-workflow.md` — the skills, MCP servers and gates used, and what was rejected.
- Public Vercel URL + clean GitHub repo + a 2–3 min demo video.
