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
| LLM | **`gemini-3.1-flash-lite`, free tier**, via `@google/genai` | Gemini is explicitly permitted. Free tier ⇒ zero recurring cost. Chosen on **daily quota**, not quality — see below. |
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
- **`maxOutputTokens` caps thinking + output combined.** Verified 2026-08-25 against the live API: Gemini 3.x Flash reasons before answering, and a lean budget can be spent entirely on thinking — the call returns **HTTP 200 with `content: {}` and no `parts` array**, so the standard `candidates[0].content.parts[0].text` accessor *throws* rather than returning undefined. Mitigations, all in `lib/llm`: pin `thinkingConfig: { thinkingLevel: "low" }`, enforce a floor on `maxOutputTokens`, and treat a missing `parts` as a typed error carrying `finishReason`. Full trail in `docs/04-debugging-log.md` entry 2.

## Environment variables

Secrets live only in `.env.local` (git-ignored) and Vercel env vars. Never inline a key. Keep `.env.example` current with every new var — the PDF's README deliverable explicitly asks for an env-var list.

```bash
# LLM (provider-agnostic layer)
LLM_PROVIDER=gemini              # gemini | openai | anthropic
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite  # chosen on free-tier RPD; verified 2026-08-25

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never NEXT_PUBLIC_

# Bonus
MICROLINK_API_KEY=               # optional; free tier works unauthenticated
```

Rule of thumb: if a var is not prefixed `NEXT_PUBLIC_`, it must never be referenced in a file that runs in the browser.

## Bootstrap

Git is already initialised (4 commits of docs). The repo has no `package.json` yet.

```bash
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


## Model selection **[OUR DECISION]** — decided by quota, verified not assumed

`CLAUDE.md` says to confirm the current free Flash model ID rather than hardcode one. Doing so on 2026-08-25 — by listing models on the real key, probing each with the exact structured-output call the pipeline makes, and then reading the AI Studio rate-limit dashboard — overturned two assumptions this repo was built on.

### Availability

| Model | Result |
|---|---|
| `gemini-2.5-flash` | **404** — "no longer available to new users". The ID most documentation still names is dead for new keys. |
| `gemini-3.7-flash` | **UNAVAILABLE** — "currently experiencing high demand". |
| `gemini-flash-latest` | Timed out twice (aliases to 3.7). **Avoid `*-latest` aliases** — they float under you mid-project. |

### The binding constraint is requests per DAY, not RPM

This repo assumed "~10–15 RPM" and never considered a daily cap. The actual free-tier limits are far tighter. A complete demo of the graded flow is **6 calls**: 1 analyze + 1 build + 4 refinements (the four instructions the brief names).

| Model | RPM | TPM | RPD | Complete demos/day |
|---|---|---|---|---|
| `gemini-3.6-flash` | 5 | 250K | **20** | **3** |
| `gemini-3.5-flash` | 5 | 250K | **20** | **3** |
| `gemini-3.7-flash` | 5 | 250K | **20** | **3** |
| **`gemini-3.1-flash-lite`** | **15** | 250K | **500** | **83** |

Three demo runs per day is not a product — the grader consumes one, and any debugging that day consumes the rest. **`gemini-3.1-flash-lite` is the only viable runtime model**, at 25× the daily budget and 3× the RPM.

### Is the quality good enough?

Tested on a realistic analyzer workload (real marketing copy → the full 7-field schema), not a toy prompt: all seven fields populated, sensible content, **~2s** latency. Good enough by a clear margin for a concept generator. `gemini-3.6-flash` remains reachable via `GEMINI_MODEL` for a side-by-side, which is precisely what the swappable `lib/llm` layer is for.

### Consequences that are now mandatory, not optional

1. **Caching is survival, not just a cost rule.** Reopening a saved project must never re-call Gemini. Already required by requirement 6; now it also protects the daily quota.
2. **Seed a demo account with a pre-analyzed project.** Previously "consider" in the checklist. With a hard daily ceiling and a grader sharing it, this is insurance the submission needs.
3. **`thinkingLevel` is not portable.** `flash-lite` emits **0** thinking tokens with no `thinkingConfig`, but **118** when `thinkingLevel: "low"` is set — the inverse of `3.6-flash`. `lib/llm` must enforce a `maxOutputTokens` floor rather than trusting the parameter.
4. **Handle 429 as a first-class state**, distinguishing per-minute from per-day exhaustion. A daily cap does not clear on retry, so "rate limited, retrying" is a *lie* after the 500th call — that path needs its own message.
