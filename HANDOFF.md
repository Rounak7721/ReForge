# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-25, ~22:00 IST — end of session 2. Phases 0 and 1 complete and verified on production. Next: Phase 2, the analyzer._

---

## Where things stand

**Phase:** 0 and 1 done. **Phase 2 (the analyzer) is next** — the first code that calls Gemini.

| | Status |
|---|---|
| Production URL | **https://reforge-blond-two.vercel.app/** — live, auth working |
| GitHub repo | `Rounak7721/ReForge`, pushed over SSH, `main` is current |
| Vercel | Connected to the repo. **Every push to `main` auto-deploys** |
| Vercel env vars | All six set and verified working in production |
| Supabase | `zqyahkyigokbxmufpxpj` — schema applied, RLS verified, advisors clean, tables empty |
| Local `.env` | Complete, git-ignored |
| Working tree | Clean, on `main`, synced with origin |

**Deadline: 2026-08-27 ~13:42 IST.** ~40h remained at the end of this session.

### Are we on pace?

Yes, with a caveat.

```
checklist    24 / 95 boxes    25% complete
time         8.1h of 48h      17% elapsed
```

Ahead on paper — 25% of the work in 17% of the time — and the projection says
~24h of work against ~40h remaining. **But the caveat matters:** Phases 0 and 1
were infrastructure with well-trodden patterns. Phase 2 onward is LLM
integration, where prompt iteration, malformed-output handling and a 500/day
quota make estimates less reliable. Treat the buffer as insurance, not slack.

Budget guidance: aim to have **Phases 2–4 done in the next ~15h**, leaving the
landing page, hardening, README/video for the final stretch. Reserve the last
4h for the video and deliverables — an unfinished bonus scores zero, a missing
README loses guaranteed points.

---

## No blockers

Everything is connected and verified: Supabase MCP, context7, playwright; skills
`prompt-log`, `debug-log`, `deploy`, `wrap-up`, plus `frontend-design`,
`code-review`, `security-review`, `run`.

---

## What exists right now

```
app/
  (marketing)/page.tsx       branded placeholder — what / currently serves
  (auth)/login|signup        pages sharing components/auth/auth-form.tsx
  (app)/dashboard/           protected shell: header, user email, logout, empty state
  api/auth/{signup,login,logout}/route.ts     WORKING
lib/
  env.ts                     zod-validated env access
  safe-redirect.ts           same-origin guard for `next` params (19 payloads tested)
  supabase/                  browser · server · middleware · admin(service role)
  api/                       errors · auth-schema · supabase-auth-error
  types/database.ts          generated from live schema — REGENERATE after migrations
  llm/  prompts/             EMPTY — this is Phase 2
middleware.ts                session refresh + /dashboard guard
supabase/migrations/         0001 schema+RLS · 0002 set_updated_at hardening
components/
  auth/                      auth-form · logout-button
  providers/theme-provider   light-only (forcedTheme)
  ui/                        shadcn: button input textarea card label sonner skeleton
docs/                        ARCHITECTURE(current) · PROMPTS(2) · DEBUGGING(3)
README.md                    all 9 required sections, current
project_guidelines/08-mvp-checklist.md   ← the live tracker, accurate
```

**Honest status:** the landing page is a *placeholder*, not the real one
(Phase 5). The dashboard renders an empty state with a **disabled** "New
project" button — project CRUD is Phase 4.

**Graded deliverables:** `docs/DEBUGGING.md` has **3** entries (≥2 required —
met). `docs/PROMPTS.md` has **2** of the 5–10 needed. Keep logging as you go;
do not batch these.

---

## Next actions, in order

1. **Build `lib/llm`** — `getLLM`, `generateStructured`, `providers/gemini.ts`,
   `registry.ts`, plus `lib/llm/README.md` documenting the swap contract. It
   must: set `maxOutputTokens` with a **floor**, throw a typed error when
   `candidates[0].content.parts` is missing (carrying `finishReason`), and map
   429 to a distinct error code. See the two traps under Decisions.
2. **`lib/prompts/analyzer.ts` + zod schema** locked to exactly the 7 fields in
   `02-functional-requirements.md` §2. No more, no fewer.
3. **Server-side URL fetch** — timeout, size cap, HTML→text, truncate to a token
   budget. Never ask the model to "visit" a URL. Fall back to meta tags + title
   for JS-only shells and tell the user the site was thin.
4. **`POST /api/analyze`** — validate input, cache the result to
   `projects.analysis`, typed errors. Needs a `projects` row to exist first, so
   create the project in the same request or add `POST /api/projects`.
5. **Analyzer UI** — the 3-field form, results view rendering all 7 fields, plus
   loading / error / **rate-limited** states (rate-limited is distinct).
6. Then Phase 3 (builder + editor), Phase 4 (dashboard CRUD), Phase 5 (landing
   page, use the `frontend-design` skill), Phase 6 (hardening), Phase 7 (docs +
   video).

Plan mode first for anything non-trivial, per `CLAUDE.md`.

---

## Decisions already made — don't relitigate

**Stack & process**
- Next.js 15 (App Router), TS strict, Tailwind v4 + shadcn/ui on the **Radix**
  base, Supabase (Postgres + Auth, RLS on), Vercel Hobby. Pinned to Next **15**,
  not the 16 that `create-next-app@latest` now installs — follow the reference
  docs.
- **Route Handlers, not Server Actions**, for everything including auth.
  Supabase's own examples use Server Actions; we deviate deliberately.
- **Deploy early via GitHub → Vercel CI/CD.** Verify on the deployed URL as you
  go, not at the end. Fallback if Vercel fails: OCI + Cloudflare Tunnel on
  `reforge.rounak.co`.
- **Zero recurring cost is a hard requirement.** Claude Code builds it, Gemini
  runs in it. State that distinction in the README and video.
- Work on phase branches, fast-forward into `main`. **No subagents** —
  `code-review` covers the review gate, `playwright` + `run` cover QA.

**The product**
- The MVP generates a **structured product concept, not a codebase.** No code
  generation, no iframe preview, no export — those are bonuses #2/#3/#5/#6 and
  are out of scope until the required flow is deployed.
- **Two display gates, not one:** the analysis renders as a finished artifact,
  and "Build My Product" is a *separate* action producing a second artifact.
- The chat refines the **concept object** — it is an editing control, not a
  message stream. Building it as a transcript loses points on requirement 3.
- **The concept schema is structured data, not prose** — `navigation`, `pages`
  and `uiDirection` are arrays/objects, so the visual-preview bonus becomes an
  additive component rather than a rewrite. Shape and rationale in
  `02-functional-requirements.md` §3. Moderate structure only; deep nesting
  hurts model reliability.
- Rendering is a pure function of the concept object; DB changes stay additive.
- **Multi-agent workflow is cut** — framed as a LangGraph fit in the README's
  known limitations and the video's "what's next" beat.

**Model — measured, not assumed**
- **`gemini-3.1-flash-lite`**, chosen on **daily quota**: the 3.x Flash line
  allows **20 requests/day** (≈3 complete demos); flash-lite allows **500** at
  15 RPM. `gemini-2.5-flash` is 404 for new keys; `gemini-3.7-flash` is
  UNAVAILABLE under load; avoid `*-latest` aliases, they float.
- **Trap 1: `maxOutputTokens` caps thinking + output combined.** A lean budget
  returns HTTP 200 with `content: {}` and **no `parts` array**, so the usual
  accessor throws rather than returning undefined.
- **Trap 2: `thinkingLevel` is not portable.** flash-lite emits 0 thinking
  tokens with no config but 118 with `"low"` — the inverse of 3.6-flash. Enforce
  a token floor instead of trusting it.
- Both reproduced in `docs/DEBUGGING.md` entry 2.

**Auth & security**
- **`getUser()` everywhere**, never `getSession()` (trusts the cookie) or
  `getClaims()` (needs asymmetric keys enabled).
- Only `getAll`/`setAll` cookie methods — `get`/`set`/`remove` are deprecated
  and cause random logouts.
- **Redirects must carry rotated auth cookies forward.** `getUser()` can refresh
  tokens as a side effect; a bare `NextResponse.redirect` throws them away and
  silently logs the user out. `redirectPreservingCookies()` exists for this.
- **`lib/safe-redirect.ts` guards every caller-supplied `next`.**
  `startsWith("/")` is not enough — `//evil.com` is protocol-relative.
- **`mailer_autoconfirm` is `true`** (email confirmation OFF). Load-bearing, not
  cosmetic: with it on, every signup sends an email, the free tier allows a
  handful per hour, and signup then fails **project-wide** with
  `over_email_send_rate_limit`. We hit exactly that. **Do not turn it back on.**
- Map Supabase errors by **`error.code`**, never message substrings. Unmapped
  errors must log server-side — a silent catch-all is where bugs hide.

---

## Standing constraints worth re-reading before coding

- Reopening a saved project must render from the DB and **never** re-call
  Gemini — a cost rule *and* requirement 6.
- Set `maxOutputTokens` on every call (with a floor); zod-validate every LLM
  response before it touches the DB or UI.
- 15 RPM / **500 requests per day**, shared with the grader. Debounce the chat
  box, serialise requests, and handle 429 as **two** distinct states:
  per-minute (retrying works) and per-day (retrying never works — say so).
- **Seeding a demo account with a pre-analyzed project is required**, not
  optional — insurance if the grader arrives after quota is spent.
- `apply_migration` and `execute_sql` write straight to the remote project with
  no staging. **Ask before running either.** After any migration, regenerate
  `lib/types/database.ts`.
- Any **new** env var must be added to Vercel too — code reading a missing var
  builds fine and fails at runtime.
- 35 of 100 points are process docs, maintained continuously by Claude.

---

## Open questions for the user

- None blocking. Phase 2 can start immediately.

---

## Session wrap-up ritual

Run the **`wrap-up`** skill. In order: `08-mvp-checklist.md` (tick only what is
verified on the deployed URL) → `docs/PROMPTS.md` and `docs/DEBUGGING.md` →
`docs/ARCHITECTURE.md` and `README.md` → **this file** (rewrite, don't append) →
commit and push.
