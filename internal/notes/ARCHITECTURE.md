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

Rationale for each is in `internal/guidelines/03-tech-stack.md`. Two choices were
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
with `over_email_send_rate_limit`. See `docs/04-debugging-log.md` entry 3.

## API routes

Every route validates input with zod, wraps the call in try/catch, and returns a
typed error envelope with a real status code.

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/signup` | POST | Create account. Returns `{ signedIn }` — false when confirmation is required |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/analyze` | POST | url + description + customer → 7-field analysis. **Creates the project row after the analysis succeeds**, so a failed run persists nothing |
| `/api/build` | POST | projectId → 6-field concept from the *cached* analysis. Returns `cached: true` without calling the model if a concept exists |
| `/api/refine` | POST | projectId + instruction → **full** updated concept, plus a `refinements` history row |

`/api/analyze`, `/api/build` and `/api/refine` set `maxDuration = 60` (Vercel
Hobby's ceiling). The per-call model timeout is 20s so the worst case — 8s fetch
+ 20s call + 20s stricter retry = 48s — fits inside it. A handler killed
mid-flight would spend quota and persist nothing.

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
turned a clear 400 into an opaque 502; see `docs/04-debugging-log.md` entry 3.

### Redirect safety

`lib/safe-redirect.ts` resolves any caller-supplied `next` to a same-origin
path. `startsWith("/")` is not sufficient — `//evil.com` and `/\evil.com` are
protocol-relative and navigate off-origin, which turns a genuine login on the
real domain into a credential-phishing handoff.

## The LLM layer

All model calls go through `lib/llm`. Feature code imports **only**
`generateStructured` and `getLLM`; `@google/genai` appears in exactly one file,
`lib/llm/providers/gemini.ts`. Switching model or vendor is an env change;
adding a vendor is one file in `providers/` plus one line in `registry.ts`.

```
analyzer / builder / editor        lib/prompts/*
        │  zod schema + prompt
        ▼
generateStructured                 lib/llm/generate.ts
        │  token floor · JSON parse · zod validate · ONE stricter retry
        ▼
getLLM()                           lib/llm/registry.ts   (LLM_PROVIDER)
        │
        ▼
createGeminiProvider               lib/llm/providers/gemini.ts
```

The zod schema is used **twice** — converted to the vendor's schema so the model
is constrained on the wire, and again to validate the response — so the two can
never drift. Field-level `.describe()` text rides onto the wire, so per-field
guidance lives on the field.

`openai` and `anthropic` exist in the registry as entries that throw a clear
"not enabled" error. That is deliberate: it keeps the swap contract honest
without enabling a paid vendor. Full contract in `lib/llm/README.md`.

### Concept schema — chosen by measurement

Three wire formats (nested JSON / XML / flat JSON with string sections) were run
head to head over **42 live calls** — build, narrow edit, structural edit, depth
stress. All three scored 100%, so nesting was never the reliability risk it was
assumed to be. Nested JSON won on two secondary grounds: Gemini enforces
`responseJsonSchema` on the wire and has no equivalent for XML, and
`pages[].sections[]` is already the shape a visual preview or code generator
needs. See `docs/03-prompt-log.md` entry 3.

Array minimums are `1`, not `3`. The schema is shared with the Editor, and
"remove the pricing page" is a first-class instruction — a `min(3)` on `pages`
makes the third removal unsatisfiable and dead-ends the user after spending two
requests. Validity is the schema's job; richness is the builder prompt's.

## Rate limits

Free tier is **15 requests/minute and 500 requests/day**. The daily cap is the
real constraint: one complete demo is 6 calls (1 analyze + 1 build + 4 refine),
measured.

`LLMRateLimitError` carries a `scope` read from the 429 body's
`error.details[].violations[].quotaId` — structurally, never by matching message
text. The distinction is load-bearing: a per-minute limit clears on retry and a
per-day one does not, and the UI renders them as different states
(`rate_limited` vs `quota_exhausted`, both HTTP 429).

## SSRF guard

`/api/analyze` fetches an untrusted, user-supplied URL from inside our
infrastructure. `lib/scrape/fetch-site.ts`:

- resolves the hostname and checks the **resolved addresses**, rather than
  pattern-matching the literal — this catches `2130706433`, `127.1`,
  `0x7f000001` and public hostnames that resolve to private IPs;
- parses IPv6 to bytes rather than by spelling, because the URL parser rewrites
  `::ffff:169.254.169.254` as `::ffff:a9fe:a9fe`;
- follows redirects **by hand**, re-validating every hop, because
  `redirect: "follow"` would let hop 0 be public and hop 1 be the metadata
  endpoint.

**Known residual:** this is resolve-then-fetch, not resolve-then-pin, so DNS
rebinding is not caught. Closing it needs a pinned-IP connection with a `Host`
override, which `fetch` does not expose.

## Demo account

`pnpm seed:demo` — idempotent, and makes **zero model calls**. The data in
`lib/demo/seed-data.ts` was captured from one real pipeline run by
`scripts/generate-demo-data.ts`. That separation matters: the account exists as
insurance for when the daily quota is exhausted, so a seed that called Gemini
would fail in precisely the situation it was written for.

Credentials are in the root `README.md` and are intentionally public.

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

## Design system

Everything visual is driven by tokens in `app/globals.css`. There are two token
layers and the split is load-bearing:

1. **The Reforge semantic layer** — `--ink`, `--dim`, `--faint`, `--shell`,
   `--core`, `--hairline`, `--ember`. App components use these directly.
2. **A shadcn bridge** — `--background`, `--card`, `--primary`, `--border` and
   friends are *defined in terms of* layer 1. That is why the stock
   `components/ui/*` primitives inherit the new system without being rewritten,
   and why swapping a token propagates everywhere at once.

**Accent.** One accent, ember/copper. Deliberately not the purple-blue gradient
that fingerprints AI-generated SaaS. It is used sparingly — focus rings, state,
glow, data keys — while primary buttons are ink-on-paper (inverting to
paper-on-ink in dark), which is both higher contrast and more restrained.

**Contrast.** Ember flips lightness between themes, so `--ember-contrast` exists
to carry the text colour that sits *on* an ember fill; hardcoding white failed
dark mode at 2.23:1. Every text token is verified ≥ 4.5:1 against all three
surfaces (page, shell, core) in both themes — worst case 4.69.

**Type.** Three roles, no more: Bricolage Grotesque (display, with its optical
size axis driven from 32 to 72 so one family covers an eyebrow and a headline),
Geist (body), Geist Mono (data and labels).

**Depth without assets.** No image files ship. Surfaces are built from a fixed
three-orb radial mesh on `body`, an SVG `feTurbulence` grain overlay, masked
hairline grids, and a "double-bezel" pattern (`.bezel` tray + `.bezel-core`
plate with concentric radii). This keeps the zero-recurring-cost constraint and
removes any asset that could fail to load.

**Motion.** CSS only — no animation library. Scroll entry is an
`IntersectionObserver` (`components/ui/motion.tsx`) toggling a data attribute
that CSS acts on; the hidden state lives inside a
`@media (prefers-reduced-motion: no-preference)` block, so a reduced-motion
visitor gets content immediately with no JS dependency, and a `<noscript>` rule
un-hides everything if JS never runs. Only `transform` and `opacity` animate.

**Theme.** `next-themes` with `defaultTheme="system"` and `enableSystem`. The
control is a three-state segmented radio group (light / system / dark) rather
than a two-way switch, because "system" is the default and a binary toggle makes
it unreachable once touched.

**Z-index** is a named scale (`.z-nav`, `.z-nav-open`, `.z-overlay`, `.z-toast`).
Safe-area insets are applied with Tailwind arbitrary values, never custom
classes — see `DEBUGGING.md` entry 7 for why that distinction cost an afternoon.

## Known limitations

- **Multi-agent workflow cut** for cost/rate-limit reasons. Five chained calls
  per user action against a 15 RPM / 500 RPD free tier is not viable, and it
  adds no *required* capability. A natural LangGraph fit: each agent a node with
  typed state on the edges, orchestration and retries from the framework. What
  blocks it is cost, not design.
- **No server-rendered theme preference.** Theme is resolved client-side by
  `next-themes` from an inline blocking script, so the first paint is correct
  but the server has no knowledge of it. Fine here; it would matter if any
  server component needed to branch on theme.
- **Daily LLM quota is shared with the grader.** 500 requests/day, ~6 per full
  demo. Caching every result is a correctness requirement, not just a cost rule.
  The seeded demo account (`pnpm seed:demo`) is the insurance.
- **No server-side rate limiting.** The refine box serialises requests and
  enforces a client-side minimum interval, but a second tab or a direct API call
  can still spend quota faster. A real fix needs a counter in Postgres.
- **"Add a dashboard" is interpretive.** Measured on production: where no
  dashboard exists the model *converts the home page into one* rather than
  appending a fifth page. Consistent (nav still matches pages) and defensible,
  but not literally additive — and the builder does not reliably emit a pricing
  page either, so two of the brief's four demo instructions can be no-ops
  depending on the draft.
- **Landing page is dynamically rendered.** The header is auth-aware, so `/`
  reads cookies and opts out of static caching. Correct — a cached auth-aware
  page would serve one visitor's state to another — but it costs a server render
  per visit.
- **No test suite.** Verification is `pnpm lint` + `pnpm build` + Playwright
  walkthroughs + direct SQL assertions against RLS.
