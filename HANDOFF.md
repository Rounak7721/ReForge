# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-25 — Phase 1 complete (schema + RLS + auth, verified). Next: Phase 2, the analyzer._

---

## Where things stand

**Phase:** Phases 0 and 1 complete and verified. Next up is **Phase 2 — the analyzer**, the first phase that calls Gemini.

**Deadline: 2026-08-27 ~13:42 IST — CONFIRMED by the user.** A complete, hosted, working MVP by then. Whether to add bonus features is decided *after* that bar is met.

| | Status |
|---|---|
| Production URL | **https://reforge-blond-two.vercel.app/** — live, serving the placeholder |
| GitHub repo | `Rounak7721/ReForge` — pushed over SSH |
| Supabase project | ref `zqyahkyigokbxmufpxpj` — **schema applied** (`projects`, `refinements`, 7 RLS policies), MCP verified, advisors clean |
| Vercel project | **created**, connected to the GitHub repo; auto-deploys on push to `main` |

---

## No blockers

Supabase MCP is connected and verified (`list_tables` → `{"tables":[]}`). Skills `prompt-log` / `debug-log` / `deploy` / `wrap-up` are live, plus `frontend-design`, `code-review`, `security-review`, `run`; context7 and playwright are available.

`.env` is complete locally (git-ignored): every var in `.env.example` has a value.

**`mailer_autoconfirm` was set to `true`** via the Management API on 2026-08-25 — email confirmation is off. This is load-bearing, not cosmetic: with it on, every signup sends an email, the free tier allows only a handful per hour, and signup then fails **project-wide** with `over_email_send_rate_limit`. We hit exactly that during testing. Do not turn it back on.

---

## What exists right now

```
app/
  (marketing)/page.tsx       branded placeholder — what the deployed URL serves
  (auth)/login|signup        auth pages sharing components/auth/auth-form.tsx
  (app)/dashboard/           protected shell: header, user email, logout, empty state
  api/auth/{signup,login,logout}/route.ts
lib/
  env.ts                     zod-validated env access
  safe-redirect.ts           same-origin guard for `next` params
  supabase/                  browser · server · middleware · admin (service role)
  api/                       errors · auth-schema · supabase-auth-error
  types/database.ts          generated from the live schema — regenerate after migrations
  llm/ prompts/              EMPTY — Phase 2
middleware.ts                session refresh + /dashboard guard
supabase/migrations/         0001 schema+RLS, 0002 set_updated_at hardening
components/
  auth/                      auth-form, logout-button
  providers/theme-provider   light-only
  ui/                        shadcn: button input textarea card label sonner skeleton
docs/                        PROMPTS (1) · DEBUGGING (3) · ARCHITECTURE (current)
project_guidelines/          08-mvp-checklist.md is the live tracker
```

**Graded deliverables so far:** `docs/PROMPTS.md` has 1 of the 5–10 needed.
`docs/DEBUGGING.md` has 3 of the ≥2 needed — that requirement is met, keep
logging as things break.

---

## Next actions, in order

1. ~~Phase 0 — scaffold + deploy~~ and ~~Phase 1 — schema, RLS, auth~~ **done**.
2. **Set the Supabase env vars in Vercel before the next deploy.** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Phase 1 is the first code that reads env at runtime — production will **build fine and fail on first click** without them.
3. **Phase 2 — the analyzer.** `lib/llm` provider layer, `lib/prompts/analyzer.ts`, server-side URL fetch, `POST /api/analyze`, results cached to `projects.analysis`. See the two measured Gemini traps under Decisions before writing the provider.
4. Phases 3 → 6. Each push to `main` auto-deploys, so verify on the deployed URL as you go, not at the end.
5. Optional, any time: point `reforge.rounak.co` at the Vercel deployment.

**Env vars are NOT yet set in Vercel** — they are being added as each is first used. Anything reading an env var will build fine and fail at runtime in production until its var exists there. Check this before every deploy that introduces one.

Plan mode first for anything non-trivial, per the working agreement in `CLAUDE.md`.

---

## Decisions already made — don't relitigate

- **Stack:** Next.js 15 App Router, TS strict, Tailwind + shadcn/ui, Supabase (Postgres + Auth, RLS on), Gemini Flash free tier, Vercel Hobby. Rationale in `03-tech-stack.md`.
- **Zero recurring cost is a hard requirement.** Gemini free tier at runtime; no OpenAI/Anthropic API calls inside the product. Claude Code builds it, Gemini runs in it — state this distinction in the README and video.
- **Route Handlers, not Server Actions**, for all mutations. One pattern throughout.
- **All model calls go through `lib/llm`.** Feature code never imports a vendor SDK. Swapping vendor = env change only.
- **Multi-agent workflow is cut** for cost/rate-limit reasons → future scope, framed as a LangGraph fit. Belongs in README "Known limitations" and the video's "what's next" beat.
- **Supabase MCP over the CLI fallback.** `.mcp.json` is committed; the token stays in the shell env, never in the file.
- **Runtime model is `gemini-3.1-flash-lite`** — chosen on **daily quota**, not quality. AI Studio shows the 3.x Flash line capped at **20 requests/day**; one complete demo of the graded flow is 6 calls (1 analyze + 1 build + 4 refinements), so that is **3 demos per day** shared with the grader. flash-lite allows **500/day and 15 RPM**, and handles the real 7-field analyzer workload in ~2s with all fields populated. Also verified: `gemini-2.5-flash` is 404 for new keys, `gemini-3.7-flash` is UNAVAILABLE under load, `*-latest` aliases time out. Table in `03-tech-stack.md`.
- **Two traps `lib/llm` must handle** (both measured, `docs/DEBUGGING.md` entry 2): `maxOutputTokens` caps *thinking + output combined*, so a lean budget returns HTTP 200 with `content: {}` and no `parts` array — the usual accessor throws. And `thinkingLevel` is **not portable**: flash-lite emits 0 thinking tokens with no config but 118 with `thinkingLevel: "low"`, the inverse of 3.6-flash. Enforce a token floor rather than trusting the parameter.
- **Seeding a demo account is now required, not optional**, and 429 must distinguish per-minute from per-day exhaustion — a daily cap never clears on retry.
- **Route Handlers, not Server Actions**, including for auth — Supabase's own examples use Server Actions; we deviate deliberately for one pattern everywhere.
- **`getUser()`, not `getSession()` or `getClaims()`**, for every server-side session check. `getSession()` trusts the cookie; `getClaims()` needs asymmetric signing keys enabled.
- **Redirects must carry rotated auth cookies.** `getUser()` can refresh tokens as a side effect; a bare `NextResponse.redirect` throws them away and silently logs the user out on the next request. `redirectPreservingCookies()` in `lib/supabase/middleware.ts` exists for this.
- **`lib/safe-redirect.ts` guards every caller-supplied `next`.** `startsWith("/")` is not enough — `//evil.com` is protocol-relative and navigates off-origin. Found by `security-review`; 19 payloads tested.
- **No subagents.** `code-review` skill covers the review gate; `playwright` + `run` cover QA.
- **Deploy early, via GitHub → Vercel CI/CD** — settled 2026-08-25 (briefly deferred, then reversed the same session; the deferral is void). Repo is `Rounak7721/ReForge`, pushed over SSH. Vercel is connected to the repo, so **every push to `main` auto-deploys** and no manual `vercel` invocation is part of the normal loop. This is the ordering `04-execution-flows.md` wanted: build failures from environment differences surface against a placeholder on day one rather than against the whole app near the deadline.
- **Cloudflare Tunnel / OCI is a fallback, not the plan.** If Vercel ever fights us, self-host on the OCI free tier behind a Cloudflare Tunnel. `reforge.rounak.co` can also simply point at the Vercel deployment. Either way: zero recurring cost, a public URL, requirement 7 satisfied.
- **Product name is `Reforge`** — confirmed by the user 2026-08-25. Phase 5 builds the logo around it.
- **The MVP generates a structured product concept, not a codebase.** No code generation, no iframe preview, no export. Those are bonuses #2/#3/#5/#6 and are out of scope until the required flow is deployed. This was an explicit point of confusion — see the pipeline sketch below.
- **The concept schema is structured data, not prose** — `navigation`, `pages` and `uiDirection` are arrays/objects. Locked so the visual-preview bonus is an additive component rather than a rewrite. Full rationale and shape: `02-functional-requirements.md` §3.
- **Rendering is a pure function of the concept object.** `<ConceptView concept={...} />` in the MVP; a preview later is a sibling component on the same prop. DB stays additive — generated UI/code would be a new nullable column, never a migration of `projects.concept`.

---

## The MVP pipeline, in one block

```
inputs (url + description + target customer)
   |  Call 1: ANALYZER  -> 7-field analysis  -> rendered, cached in projects.analysis
   |  [user clicks "Build My Product"]
   |  Call 2: BUILDER   -> 6-field concept   -> rendered, cached in projects.concept
   |  [user types a natural-language instruction]
   |  Call 3: EDITOR    -> FULL updated concept -> re-rendered, persisted
```

Two display gates, not one: the analysis is a finished artifact the user reads, and "Build My Product" is a separate action on top of it. The chat refines the **concept object** — it is an editing control, not a message stream. Building it as a chat transcript loses points on requirement 3.

---

## Standing constraints worth re-reading before coding

- Reopening a saved project must render from the DB and **never** re-call Gemini — this is both a cost rule and requirement 6.
- `maxOutputTokens` on every LLM call; zod-validate every LLM response before it touches the DB or UI.
- Free tier is ~10–15 RPM. Debounce the chat box, serialize requests, handle 429 as a distinct UI state.
- `apply_migration` and `execute_sql` write straight to the remote project — there is no staging. **Ask before running either.**
- 35 of 100 points are process docs. `docs/PROMPTS.md` and `docs/DEBUGGING.md` are maintained continuously by Claude, never batched to the end.

---

## Open questions for the user

- None outstanding. (Deadline and product name were both settled 2026-08-25.)

---

## Session wrap-up ritual

Run the **`wrap-up`** skill. It updates, in this order, then commits:

1. `project_guidelines/08-mvp-checklist.md` — tick only what is done **and verified on the deployed URL**
2. `docs/PROMPTS.md` / `docs/DEBUGGING.md` — append anything not yet logged
3. `docs/ARCHITECTURE.md` / `README.md` — reflect real structure
4. **This file** — rewrite the sections; a stale handoff is worse than a short one
5. `git commit`
