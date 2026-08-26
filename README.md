# Reforge

Point Reforge at any product's website. It analyzes what the product does, who
it serves and where it falls short, then generates your own product concept —
which you refine in plain English.

**Live:** https://reforge-blond-two.vercel.app/

> **Build status.** Every functional requirement is built and verified on the
> deployed URL: landing page, auth, the analyzer, the builder, natural-language
> refinement, the dashboard, and persistence. What remains is documentation and
> the demo video. `project_guidelines/08-mvp-checklist.md` is the live tracker
> and is accurate (86/95).

## Try it without signing up

An account is seeded with a finished project so you can see the output without
spending any of the shared free-tier AI quota:

| | |
|---|---|
| **Email** | `demo@reforge.app` |
| **Password** | `reforge-demo-2026` |

It opens **"Soloist"** — a solo-developer issue tracker built from a `linear.app`
teardown, with all seven analysis fields, all six concept fields and two
refinements in its history. It deliberately ships with a `/pricing` page, so
typing *"Remove the pricing page."* into the refine box shows a real edit.

These credentials are intentionally public. Re-seed at any time with
`pnpm seed:demo`, which makes zero model calls.

---

## Architecture

Next.js App Router, deployed as a single Vercel project. UI renders in Server
Components where possible; interactive pieces are Client Components. **All data
mutations go through Route Handlers under `app/api/*`, called from the client** —
one pattern throughout, no Server Actions mixed in.

```
Browser
  │  fetch()
  ▼
Route Handler (app/api/*)          ← zod-validates input, all LLM calls live here
  │
  ├─► lib/llm  ──► Gemini           (Phase 2 — not built yet)
  │
  └─► lib/supabase/server.ts ──► Postgres (RLS enforced as the signed-in user)

middleware.ts ──► refreshes the session on every request, guards /dashboard/*
```

Two boundaries are enforced rather than merely intended:

- **The Gemini key never reaches the browser.** Every model call is server-side.
- **The service-role Supabase client cannot reach a Client Component.**
  `lib/supabase/admin.ts` opens with `import "server-only"`, so such an import
  is a build error, not a silent key leak.

### The product's AI pipeline

Three chained server-side calls, each returning strict JSON parsed into a typed,
zod-validated object:

| Step | Route | Input | Output |
|---|---|---|---|
| Analyzer | `POST /api/analyze` | url, description, target customer | analysis (7 fields) |
| Builder | `POST /api/build` | projectId (reads cached analysis) | concept (6 fields) |
| Editor | `POST /api/refine` | projectId + instruction | **full** updated concept |

The Editor returns the whole concept object rather than a patch — idempotent,
simple to persist, and it makes undo a matter of restoring the previous row.

Every result is cached in Postgres. **Reopening a saved project renders from the
database and never re-calls Gemini** — both a cost rule and a product
requirement.

### Directory shape

```
app/
  (marketing)/           public landing page
  (auth)/                login, signup
  (app)/dashboard/       protected
  api/auth/{signup,login,logout}/route.ts
lib/
  env.ts                 zod-validated env access
  safe-redirect.ts       same-origin guard for `next` params
  supabase/              browser · server · middleware · admin
  api/                   error envelope, schemas, Supabase error mapping
  types/database.ts      generated from the live schema
  llm/  prompts/         provider abstraction + prompts (Phase 2)
components/ui/           shadcn
supabase/migrations/     schema, applied via the Supabase MCP
docs/                    ARCHITECTURE · PROMPTS · DEBUGGING
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15.5.23 (App Router), React 19.1.0 | One deploy target for UI and API |
| Language | TypeScript strict + `noUncheckedIndexedAccess` | The pipeline indexes into arrays parsed from model output |
| Styling | Tailwind v4, shadcn/ui on Radix (`nova` preset) | Startup-grade UI in hours |
| Backend | Next.js Route Handlers | One mutation pattern everywhere |
| Database | Supabase Postgres, RLS on | Same service as auth |
| Auth | Supabase Auth (email + password) | One SDK for both |
| LLM | `gemini-3.1-flash-lite`, free tier | Zero recurring cost; see *AI models used* |
| Hosting | Vercel Hobby | Free, auto-deploys on push to `main` |

**Zero recurring cost is a hard requirement.** Claude Code was used to *build*
the app; Gemini runs *inside* it. No paid API is called at runtime.

---

## Setup instructions

Requires Node 22+ and pnpm.

```bash
git clone git@github.com:Rounak7721/ReForge.git
cd ReForge
pnpm install

cp .env.example .env       # then fill in the values (see below)
pnpm dev                   # http://localhost:3000
```

Verification before any commit or deploy:

```bash
pnpm lint       # must pass
npx tsc --noEmit
pnpm build      # must pass
```

There is no test suite. Verification is lint + build + walking the flows in a
browser (Playwright), plus direct SQL assertions against the RLS policies.

### Database setup

Migrations live in `supabase/migrations/` and are applied to the remote project
through the Supabase MCP, in filename order. To reproduce the schema on a fresh
Supabase project, run each file's contents in the SQL editor. Every statement is
idempotent, so replaying the set is safe.

One project setting matters and is not in the migrations: **email confirmation
must be disabled** (Authentication → Sign In / Providers → Email → *Confirm
email* off). See *Known limitations*.

---

## Environment variables

Secrets live only in `.env` (git-ignored) and Vercel's environment variables.
`.env.example` is kept current with every new variable.

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `gemini` \| `openai` \| `anthropic` — selects the provider in `lib/llm` |
| `GEMINI_API_KEY` | Google AI Studio key. Server-only |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key. Public by design; RLS constrains it |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses RLS.** Server-only — never prefix `NEXT_PUBLIC_` |
| `MICROLINK_API_KEY` | Optional, screenshot bonus. Free tier works unauthenticated |

`lib/env.ts` validates these with zod at module load, so a missing variable
fails with a named error instead of arriving as `undefined` inside a client
constructor.

---

## APIs used

| API | Purpose | Tier |
|---|---|---|
| **Google Gemini** (`generativelanguage.googleapis.com`) | The analyzer, builder and editor calls | Free |
| **Supabase** — Postgres, Auth, Management API | Database, authentication, project config | Free |
| **microlink.io** | Website screenshots for the vision bonus | Free — **not built**, bonus only |

### Our own routes

| Route | Method | Status |
|---|---|---|
| `/api/auth/signup` | POST | Built. Returns `{ signedIn }` |
| `/api/auth/login` | POST | Built |
| `/api/auth/logout` | POST | Built |
| `/api/analyze` | POST | Built. url + description + customer → 7-field analysis. Creates the project row *after* the analysis succeeds, so a failed run persists nothing |
| `/api/build` | POST | Built. projectId → 6-field concept from the cached analysis. Returns `cached: true` without calling the model if one exists |
| `/api/refine` | POST | Built. projectId + instruction → **full** updated concept, plus a history row |

Every route validates its input with zod, wraps the call in try/catch, and
returns a typed envelope with a real status code:

```ts
{ error: { code: ApiErrorCode, message: string } }
```

`code` is what the UI branches on; `message` is what it shows. Keeping them
separate lets a rate-limited state render differently from a generic failure
without string-matching the message.

---

## Database structure

Two tables, both RLS-enabled.

### `projects`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | |
| `user_id` | `uuid` | → `auth.users`, cascade delete |
| `url` | `text` | the reference site |
| `description` | `text` | what the user wants to build |
| `target_customer` | `text` | who it's for |
| `analysis` | `jsonb` | nullable — cached 7-field analysis |
| `concept` | `jsonb` | nullable — cached 6-field concept |
| `created_at`, `updated_at` | `timestamptz` | `updated_at` via trigger |

Indexed on `(user_id, created_at desc)`. The JSON columns are nullable because a
project exists from creation, before either LLM call has run; their shapes are
enforced by zod at the application boundary rather than by Postgres.

### `refinements`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | |
| `project_id` | `uuid` | → `projects`, cascade delete |
| `instruction` | `text` | the user's natural-language edit |
| `concept_after` | `jsonb` | snapshot of the resulting concept |
| `created_at` | `timestamptz` | |

Append-only by design — there is no UPDATE policy. `concept_after` makes undo a
matter of restoring the previous row and gives the UI a real history to render.

### Row Level Security

Seven per-command policies rather than blanket `for all`, so each one's intent
is explicit and an over-broad `USING` clause cannot silently widen a write path.
`projects` compares `user_id` directly; `refinements` proves ownership through
its parent project.

**RLS is what enforces ownership; the middleware is only UX.** Verified directly
against Postgres with `set local role authenticated` and JWT claims — reads
*and* writes:

| Attempt by user A against user B's data | Result |
|---|---|
| Read B's projects | 0 rows |
| Update B's project | 0 rows matched |
| Delete B's project | 0 rows matched |
| Insert a project owned by B | policy violation |
| Attach a refinement to B's project | policy violation |

---

## AI models used

**Runtime: `gemini-3.1-flash-lite`** (free tier), through the provider
abstraction in `lib/llm`. Feature code imports only `getLLM` and
`generateStructured`; no vendor SDK is imported outside `lib/llm/providers/*`,
so switching model or vendor is an env change with zero edits to the analyzer,
builder or editor.

**Development: Claude Code (Opus 5)** wrote the application. Gemini runs inside
the product; Anthropic APIs are never called at runtime.

### Why flash-lite, and not a Flash model

The model ID was verified against the live API rather than recalled — which
overturned two assumptions. `gemini-2.5-flash` returns **404, "no longer
available to new users"**. `gemini-3.7-flash` returns `UNAVAILABLE` under load,
and `gemini-flash-latest` aliases to it and times out, so floating `*-latest`
aliases are avoided entirely.

The deciding factor was **requests per day**, which is far tighter than RPM. One
complete demo of the graded flow is 6 calls (1 analyze + 1 build + 4
refinements):

| Model | RPM | RPD | Complete demos/day |
|---|---|---|---|
| `gemini-3.6-flash` | 5 | 20 | 3 |
| `gemini-3.5-flash` | 5 | 20 | 3 |
| **`gemini-3.1-flash-lite`** | **15** | **500** | **83** |

Quality was checked on a realistic analyzer workload — real marketing copy
through the full 7-field schema — not a toy prompt: all fields populated,
sensible content, ~2s.

### Two measured traps the LLM layer handles

1. **`maxOutputTokens` caps thinking + output combined.** With a lean budget the
   model spends it all reasoning and returns HTTP 200 with `content: {}` and no
   `parts` array — so `candidates[0].content.parts[0].text` *throws* rather than
   returning undefined.
2. **`thinkingLevel` is not portable.** flash-lite emits 0 thinking tokens with
   no config but 118 with `thinkingLevel: "low"` — the inverse of `3.6-flash`.
   The layer enforces a token floor rather than trusting the parameter.

Both are documented with full reproduction in `docs/DEBUGGING.md`.

---

## Deployment process

GitHub → Vercel CI/CD. **Every push to `main` auto-deploys**; there is no manual
`vercel` invocation in the normal loop.

```
pnpm lint && pnpm build     # both green, locally
  → merge the phase branch into main
  → git push
  → Vercel builds and deploys automatically
  → smoke-test the production URL in a fresh incognito window as a NEW user
```

Work happens on phase branches (`phase-1/db-auth`) and fast-forwards into
`main`, so the commit history stays linear and reviewable.

Environment variables must exist in Vercel **before** the deploy that first
reads them — a missing one builds fine and fails at runtime.

Fallback if Vercel fails: OCI free tier behind a Cloudflare Tunnel on
`reforge.rounak.co`. Zero recurring cost either way.

---

## Known limitations

- **Free-tier LLM quota is 15 RPM / 500 requests per day, shared with everyone
  using the deployment.** One full demo is exactly 6 calls, measured. This is why
  every result is cached in Postgres and why reopening a project never re-calls
  Gemini. The seeded demo account above is the insurance against exhaustion.
- **No server-side rate limiting.** The refine box allows one in-flight request
  and enforces a minimum interval, but a second tab or a direct API call can
  still spend quota faster. A real fix needs a counter in Postgres.
- **The SSRF guard is resolve-then-fetch, not resolve-then-pin.** It blocks
  private and loopback addresses in every encoding, and re-validates each
  redirect hop — but a hostname whose DNS answer changes between our lookup and
  `fetch`'s own is not caught. Closing that needs a pinned-IP connection with a
  `Host` override, which `fetch` does not expose.
- **"Add a dashboard" is interpretive.** Measured on production: where no
  dashboard exists, the model converts the home page into one rather than adding
  a fifth page — consistent, and defensible, but not literally additive. The
  builder also does not reliably emit a pricing page, so two of the brief's four
  example instructions can be no-ops depending on the draft.
- **Rate-limit handling must distinguish per-minute from per-day.** A daily cap
  does not clear on retry, so "rate limited, retrying" would be dishonest after
  the 500th call.
- **Analysis is text-only.** The analyzer fetches HTML and strips it to text. A
  JavaScript-only shell site degrades to meta tags and title, and the UI says
  the site was thin. Visual understanding is the screenshot bonus, not built.
- **Email confirmation is disabled**, deliberately. With it enabled every signup
  sends an email, and Supabase's built-in mailer allows only a handful per hour
  on the free tier — after which signup fails project-wide with
  `over_email_send_rate_limit`. We hit exactly that during testing. The
  trade-off is that email addresses are unverified.
- **Light theme only.** `ThemeProvider` is mounted with `forcedTheme="light"` so
  there is one surface to design and QA. Enabling dark mode is a props change.
- **No automated test suite.** Verification is lint, type-check, build,
  Playwright walkthroughs and direct SQL assertions against RLS.
- **The multi-agent workflow (Research → Product → UI → Coding → QA) is cut.**
  Five chained calls per user action against a 500/day ceiling is not viable,
  and it adds no *required* capability — the 3-call pipeline already satisfies
  every functional requirement. It is a natural **LangGraph** fit: each agent a
  node with typed state on the edges, with orchestration, retries and
  human-in-the-loop checkpoints coming from the framework rather than
  hand-rolled. What blocks it is cost, not design.

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the detailed source for the above
- [`docs/PROMPTS.md`](docs/PROMPTS.md) — the prompts that shaped this build, and what was changed afterward
- [`docs/DEBUGGING.md`](docs/DEBUGGING.md) — real failures with the full Problem → Prompt → Attempt → Debug → Fix trail
- [`HANDOFF.md`](HANDOFF.md) — current status and next actions
