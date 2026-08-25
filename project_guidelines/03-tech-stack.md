# 03 — Tech Stack & Constraints

## What the PDF says

> "You are free to choose the technology stack." … "You may use a completely different stack **if you can justify it**."

Suggested stack in the brief:

| Layer | Suggested |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind |
| Backend | Next.js API / Node.js |
| Database | Supabase / PostgreSQL |
| AI | OpenAI / Anthropic / Gemini API |
| Auth | Supabase Auth / Clerk |
| Deployment | Vercel / equivalent |

## What we're using **[OUR DECISION]**

We follow the suggested stack almost exactly. Deviating costs time and buys nothing here — the brief rewards execution speed, and the graders' mental model is the suggested stack.

| Layer | Choice | Justification |
|---|---|---|
| Framework | **Next.js 15, App Router** | Suggested; one deploy target for UI + API. |
| Language | **TypeScript (strict)** | Suggested; `no any` in committed code. |
| Styling | **Tailwind + shadcn/ui** | Tailwind suggested; shadcn buys a startup-grade look in hours, which is where the Product-quality points live. |
| Backend | **Next.js Route Handlers** (`app/api/*`) | Suggested; keeps everything on Vercel. |
| DB | **Supabase Postgres**, RLS on | Suggested; same service as auth. |
| Auth | **Supabase Auth** | Suggested; one SDK for DB + auth, and OAuth providers are a dashboard toggle — relevant to the live-change final test. |
| LLM | **Gemini Flash, free tier**, via `@google/genai` | Gemini is explicitly permitted. Free tier ⇒ zero recurring cost. |
| Screenshots (bonus) | **microlink.io** free tier | Do not self-host Chromium on serverless. |
| Hosting | **Vercel Hobby** | Suggested; free. |

### Hard constraints layered on top of the PDF

These are **ours**, stricter than the brief:

1. **Zero recurring cost.** If a choice adds cost, stop and ask. This is why Gemini free tier over OpenAI/Anthropic, even though the PDF permits all three.
2. **No Anthropic or OpenAI at runtime.** They're permitted by the brief but cost money. Claude Code is used *to build* the product; Gemini runs *inside* the product. Make this distinction explicit in the README and video — it's a product-thinking point, not an apology.
3. **All LLM calls server-side only.** The Gemini key never reaches the browser.
4. **Never import the service-role Supabase client into a Client Component.**

## LLM provider layer — the model is swappable

All model calls go through `lib/llm`. Feature code imports only `getLLM` and `generateStructured` from `@/lib/llm`; it never imports `@google/genai`, `openai`, or `@anthropic-ai/sdk` directly. Those live only in `lib/llm/providers/*`.

- Switching vendor/model = **env change only** (`LLM_PROVIDER` + `<VENDOR>_MODEL`), zero edits to analyzer/builder/editor.
- Adding a vendor = one file in `providers/` + one line in `registry.ts`.
- The layer supports `gemini|openai|anthropic`, but the **deployed provider is always `gemini`**. The others exist to prove swappability, not to be enabled.

Why this earns points: it answers "AI/LLM integration" (10 pts) and "Code quality" (5 pts) with an architectural argument rather than a single SDK call, and it's a clean thing to show in the video.

## Cost rules — enforce in code

The free tier is the binding constraint on the whole design.

- **Cache every analysis/build result in Postgres.** Reopening a saved project renders from the DB and **never** re-calls Gemini. This is simultaneously a cost rule and requirement 6 ("reopen previous projects").
- **Set `maxOutputTokens` on every call.** Keep prompts lean.
- **~10–15 RPM ceiling.** Debounce the chat-edit box, serialize requests, and handle 429s with a friendly "rate limited, retrying" state — never a crash. The grader will hit this.
- **Validate every LLM response with zod.** Models return malformed JSON. An unvalidated `JSON.parse` is the most likely runtime failure in this app.

## Environment variables

Secrets live only in `.env.local` (git-ignored) and Vercel env vars. Never inline a key. Keep `.env.example` current with every new var — the PDF's README deliverable explicitly asks for an env-var list.

```bash
# LLM (provider-agnostic layer)
LLM_PROVIDER=gemini              # gemini | openai | anthropic
GEMINI_API_KEY=
GEMINI_MODEL=                    # confirm current free Flash model ID in AI Studio

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never NEXT_PUBLIC_

# Bonus
MICROLINK_API_KEY=               # optional; free tier works unauthenticated
```

Rule of thumb: if a var is not prefixed `NEXT_PUBLIC_`, it must never be referenced in a file that runs in the browser.

## Bootstrap

The repo is currently empty — not even a git repo.

```bash
git init
pnpm create next-app@latest . --typescript --tailwind --app --eslint
pnpm dlx shadcn@latest init
```

Day-to-day:

```bash
pnpm dev     # local
pnpm build   # must pass before any deploy
pnpm lint    # must pass before commit
vercel       # deploy preview — ASK before running
```

No test suite is planned for the MVP; verification is `build` + `lint` + walking the flows in `04-execution-flows.md`.
