# Architecture

Working notes. The submission-facing version lives in the root `README.md` with
all nine sections the brief requires — keep this as the detailed source and the
README as the graded summary.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5.23, App Router, React 19.1.0 |
| Language | TypeScript strict + `noUncheckedIndexedAccess` |
| Styling | Tailwind v4, shadcn/ui on the Radix base (`nova` preset) |
| Backend | Next.js Route Handlers (`app/api/*`) — **not** Server Actions |
| DB + Auth | Supabase Postgres + Supabase Auth, RLS on |
| Runtime LLM | `gemini-3.1-flash-lite`, free tier, via a swappable `lib/llm` layer |
| Hosting | Vercel Hobby, auto-deploy on push to `main` |

Rationale for each is in `project_guidelines/03-tech-stack.md`. Two choices were
made against the obvious default and are worth restating:

- **Route Handlers over Server Actions.** Supabase's own Next.js examples use
  Server Actions for auth. One pattern everywhere is worth more than matching
  the upstream sample.
- **`gemini-3.1-flash-lite` over the 3.x Flash line.** Chosen on daily quota,
  not quality: Flash allows 20 requests/day, flash-lite 500. One complete demo
  of the graded flow is 6 calls.

## Data model

Two tables, both with RLS enabled. Migrations in `supabase/migrations/`, applied
to the remote project via the Supabase MCP and kept in git so the schema is
reviewable in a diff rather than living only in the dashboard.

### `projects`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | `gen_random_uuid()` |
| `user_id` | `uuid` | → `auth.users` on delete cascade |
| `url` | `text` | the reference site being analyzed |
| `description` | `text` | what the user wants to build |
| `target_customer` | `text` | who it's for |
| `analysis` | `jsonb` | nullable — the Analyzer's 7 fields, cached |
| `concept` | `jsonb` | nullable — the Builder/Editor's 6 fields, cached |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintained by trigger |

Both JSON columns are nullable because a project exists from the moment it is
created, before either LLM call has run. Their shapes are enforced by zod at the
application boundary rather than by Postgres — the DB stores whatever validated
successfully.

Indexed on `(user_id, created_at desc)`: every dashboard read filters by owner
and orders by recency.

### `refinements`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | |
| `project_id` | `uuid` | → `projects` on delete cascade |
| `instruction` | `text` | the user's natural-language edit |
| `concept_after` | `jsonb` | snapshot of the concept this instruction produced |
| `created_at` | `timestamptz` | |

`concept_after` is one column beyond the original spec. It makes undo a matter
of restoring the previous row, and gives the UI a real history to render — good
material for the demo video. Append-only by design: there is no UPDATE policy.

### Row Level Security

Seven per-command policies rather than blanket `for all`, so the intent of each
is explicit and an over-broad `USING` clause cannot silently widen a write path.
`projects` compares `user_id` directly; `refinements` has no `user_id` of its
own, so ownership is proven through the parent project with an `exists`
subquery. Policies call `(select auth.uid())` rather than `auth.uid()` so
Postgres caches the value per statement instead of re-evaluating per row.

**RLS is what actually enforces ownership. The Next.js middleware is only UX.**
Verified directly against Postgres with `set local role authenticated` plus JWT
claims, covering reads *and* writes:

| Attack | Result |
|---|---|
| A reads B's projects | 0 rows |
| A updates B's project | 0 rows matched |
| A deletes B's project | 0 rows matched |
| A inserts a project owned by B | `new row violates row-level security policy` |
| A attaches a refinement to B's project | `new row violates row-level security policy` |

## Auth

Supabase Auth, email + password, cookie-based sessions via `@supabase/ssr`.

**Four clients, deliberately distinct** (`lib/supabase/`):

| File | Key | Used by |
|---|---|---|
| `browser.ts` | anon | Client Components |
| `server.ts` | anon | Server Components, Route Handlers |
| `middleware.ts` | anon | session refresh + route protection |
| `admin.ts` | **service role** | server-only, bypasses RLS |

`admin.ts` opens with `import "server-only"`, so importing it from a Client
Component is a build error rather than a silent key leak. Verified absent from
`.next/static`.

Only `getAll`/`setAll` cookie methods are implemented — `get`/`set`/`remove` are
deprecated in `@supabase/ssr` and implementing them wrongly causes random
logouts and early session termination.

Session checks use `getUser()`, which revalidates against the auth server, never
`getSession()`, which trusts the cookie.

**Redirects carry rotated cookies forward.** `getUser()` can refresh the session
as a side effect, writing new tokens into the response via `setAll`. Returning a
bare `NextResponse.redirect` discards them and silently logs the user out on the
next request, so `redirectPreservingCookies()` copies them across.

**`mailer_autoconfirm` is on** (confirmation email disabled). Not cosmetic: with
confirmation enabled every signup sends an email, and the free tier's built-in
mailer allows only a handful per hour — after which signup fails project-wide
with `over_email_send_rate_limit`. See `docs/DEBUGGING.md` entry 3.

## API routes

Every route validates input with zod, wraps the call in try/catch, and returns a
typed error envelope with a real status code.

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/signup` | POST | Create account. Returns `{ signedIn }` — false when confirmation is required |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/analyze` | POST | *Phase 2* — url + description + customer → analysis, cached |
| `/api/build` | POST | *Phase 3* — projectId → concept, cached |
| `/api/refine` | POST | *Phase 3* — projectId + instruction → full updated concept |

### Error envelope

```ts
{ error: { code: ApiErrorCode, message: string } }
```

`code` is what the UI branches on; `message` is what it shows. Keeping them
separate lets a rate-limited state render differently from a generic failure
without string-matching the message.

`fromAuthError` maps Supabase errors by **`error.code`**, not message
substrings — messages are not an API contract. Unmapped errors log server-side
with their code and status before returning a generic message, so the next
unknown case is diagnosable from logs. An earlier substring-matching version
turned a clear 400 into an opaque 502; see `docs/DEBUGGING.md` entry 3.

### Redirect safety

`lib/safe-redirect.ts` resolves any caller-supplied `next` to a same-origin
path. `startsWith("/")` is not sufficient — `//evil.com` and `/\evil.com` are
protocol-relative and navigate off-origin, which turns a genuine login on the
real domain into a credential-phishing handoff.

## AI models used

`gemini-3.1-flash-lite` at runtime, through the provider abstraction in
`lib/llm` (Phase 2). Claude Code built the app; Gemini runs inside it.

Two measured constraints the LLM layer must handle:

1. **`maxOutputTokens` caps thinking + output combined.** A lean budget can be
   spent entirely on reasoning, returning HTTP 200 with `content: {}` and no
   `parts` array — so the usual `parts[0].text` accessor throws rather than
   returning undefined.
2. **`thinkingLevel` is not portable.** flash-lite emits 0 thinking tokens with
   no config but 118 with `thinkingLevel: "low"` — the inverse of 3.6-flash. The
   layer enforces a token floor rather than trusting the parameter.

## Deployment process

GitHub → Vercel CI/CD. Push to `main` auto-deploys; there is no manual `vercel`
invocation in the normal loop.

Production: https://reforge-blond-two.vercel.app/

Env vars are being added to Vercel as each is first used. **Anything reading a
var builds fine and fails at runtime until that var exists in Vercel** — check
before any deploy that introduces one.

Fallback if Vercel fails: OCI free tier behind a Cloudflare Tunnel on
`reforge.rounak.co`. Zero recurring cost either way.

## Known limitations

- **Multi-agent workflow cut** for cost/rate-limit reasons. Five chained calls
  per user action against a 15 RPM / 500 RPD free tier is not viable, and it
  adds no *required* capability. A natural LangGraph fit: each agent a node with
  typed state on the edges, orchestration and retries from the framework. What
  blocks it is cost, not design.
- **Light theme only.** The `ThemeProvider` is mounted with `forcedTheme="light"`
  so there is one surface to design and QA. Enabling dark mode is a props change.
- **Daily LLM quota is shared with the grader.** 500 requests/day, ~6 per full
  demo. Caching every result is a correctness requirement, not just a cost rule,
  and a seeded demo account is planned as insurance.
- **No test suite.** Verification is `pnpm lint` + `pnpm build` + Playwright
  walkthroughs + direct SQL assertions against RLS.
