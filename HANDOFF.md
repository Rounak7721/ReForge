# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-26, ~14:30 IST — end of session 3. Phases 0–6 complete and verified on production. Next: a frontend/UX refactor, then Phase 7 (docs + video)._

---

## Where things stand

**Every functional requirement in the brief is built, deployed and verified.**
What is left is a UI/UX pass the user has asked for, and the graded paperwork.

| | Status |
|---|---|
| Production URL | **https://reforge-blond-two.vercel.app/** — full flow working |
| Demo login | `demo@reforge.app` / `reforge-demo-2026` — opens a finished project |
| GitHub repo | `Rounak7721/ReForge`, `main` current and pushed |
| Vercel | Auto-deploys on every push to `main` |
| Supabase | `zqyahkyigokbxmufpxpj` — schema + RLS live. **Only the demo account exists**; all test users deleted |
| Working tree | Clean, on `main`, synced with origin |
| LLM quota used today | ~85 of 500. Resets midnight Pacific |

```
checklist    86 / 95 boxes    91% complete
deadline     2026-08-27 ~13:42 IST     (~23h remaining at time of writing)
```

**Estimated remaining work: ~6h.** Comfortable, but the video is the one item
that cannot be rushed — reserve 2.5h for it and do not let the refactor eat that.

---

## Next actions, in order

### 1. Frontend / UX refactor — **the user's explicit next request**

> "we will do some refactoring for the frontend with new added skills … to give
> a more natural feel to it"

The user intends to add new skills before this. **Ask which skills are available
before starting**, and treat this as a design task — they granted full autonomy
for the last one and reviewing the artifact beat approving a plan.

Where the current UI is weakest, in priority order:

1. **`/dashboard/[projectId]` is a long vertical dump.** Analysis (7 sections)
   then concept (4 sections) stacked. It works but has no rhythm — this is the
   page a grader spends the most time on and the one that would benefit most.
2. **The refine box is functional, not conversational.** It sits above the
   concept as a form. The brief calls this "modify through natural-language
   instructions"; it currently reads as a control panel. *Careful:* a previous
   decision (below) explicitly rejects building it as a chat transcript — the
   goal is a more natural *feel*, not a message stream.
3. **No visual diff after a refinement.** The concept silently changes. Showing
   what changed would make the demo land far harder.
4. **`/dashboard/new` is a plain form** on an otherwise designed product.
5. Landing page is done and verified — leave it unless asked.

The design language is established: see `.marketing` in `app/globals.css`
(`--ink`, `--paper`, `--wash`, `--rule`, `--dim`, `--signal: #1F4BE0`) and
`components/marketing/`. Three type roles: Archivo display, Geist body, Geist
Mono data.

### 2. Phase 7 — deliverables (the remaining 9 boxes)

1. **Final pass on the docs.** They are current, not stale — this is verification,
   not writing. `docs/PROMPTS.md` has **6** entries (target 5–10),
   `docs/DEBUGGING.md` has **6** (minimum 2), `README.md` has all nine required
   sections plus a demo-account block, `docs/ARCHITECTURE.md` is current.
2. **AI development process narrative** — blank folder → deployed. Not yet
   written. This is a required deliverable.
3. **Record the video, ≤3 min, against production**, all 8 beats from
   `project_guidelines/06-deliverables.md`.
4. **Walk `02-functional-requirements.md` top to bottom against the deployed
   URL** and tick the last boxes.

**Before recording, read the demo caveat under Decisions — two of the brief's
four example instructions can be no-ops depending on the generated draft.**

---

## What exists right now

```
app/
  (marketing)/page.tsx        THE landing page — 9 sections, verified on prod
  (auth)/login|signup         share components/auth/auth-form.tsx
  (app)/dashboard/            page (list) · new (analyze form) · [projectId]
                              + loading.tsx on both server routes, error.tsx
  not-found.tsx               branded 404
  api/auth/{signup,login,logout}
  api/analyze  api/build  api/refine        all working, all maxDuration=60
lib/
  llm/            getLLM · generateStructured · providers/gemini.ts · registry
                  + README.md documenting the swap contract
  prompts/        analyzer.ts (7 fields) · builder.ts (6) · editor.ts
  scrape/         fetch-site.ts — SSRF guard + manual redirect following
  api/            errors · llm-error · project · auth-schema · supabase-auth-error
  demo/           credentials.ts · seed-data.ts (captured, zero model calls)
  supabase/       browser · server · middleware · admin(service role)
  types/database.ts    generated — REGENERATE after any migration
scripts/
  generate-demo-data.ts   one-off; runs the real pipeline, writes seed-data
  seed-demo.ts            `pnpm seed:demo` — idempotent, zero model calls
components/
  marketing/      wordmark · marketing-header · teardown-panel
  analysis/       analysis-view (pure) · analysis-skeleton
  concept/        concept-view (pure) · product-studio (build + refine + history)
  analyze/        analyze-form
docs/             ARCHITECTURE · PROMPTS(6) · DEBUGGING(6)
```

**Honest status:** everything above works. The UI is clean but plain in the app
shell — that is exactly what the next session is meant to address.

---

## Decisions already made — don't relitigate

### Product
- MVP produces a **structured product concept, not a codebase**. No code
  generation, no iframe preview, no export.
- **Two display gates:** the analysis is a finished artifact; "Build My Product"
  is a *separate* action producing a second artifact.
- The chat refines the **concept object** — an editing control, not a message
  stream. **Building it as a transcript loses points on requirement 3.** Keep
  this in mind during the UX refactor.
- Rendering is a pure function of the concept object; DB changes stay additive.
- **Multi-agent workflow is cut** — framed in the README as a LangGraph fit.

### The concept schema — settled by measurement, do not revisit
42 live calls across nested JSON / XML / flat JSON. All three scored **100%** on
build, narrow edit, structural edit and depth stress — nesting was never the
reliability risk we assumed. **Nested JSON won** on two secondary grounds:
Gemini enforces `responseJsonSchema` on the wire and has no XML equivalent, and
`pages[].sections[]` is already the shape a visual preview or code generator
needs. Full write-up: `docs/PROMPTS.md` entry 3.

**Array minimums are 1, not 3.** The schema is shared with the Editor and
"remove the pricing page" is a first-class instruction — `min(3)` on `pages`
makes the third removal unsatisfiable and dead-ends the user after spending two
requests. Validity is the schema's job; richness belongs to the builder prompt.

### Model — measured, not assumed
- **`gemini-3.1-flash-lite`**, chosen on **daily quota**: the 3.x Flash line
  allows 20 requests/day, flash-lite 500. Avoid `*-latest` aliases.
- **Trap 1: `maxOutputTokens` caps thinking + output combined.** A lean budget
  returns HTTP 200 with `content: {}` and **no `parts` array**.
- **Trap 2: `thinkingLevel` is not portable** across the Flash family. The
  portable defence is `MIN_OUTPUT_TOKENS`, a floor in `lib/llm/generate.ts`.
- Both reproduced in `docs/DEBUGGING.md` entry 2.

### Demo caveat — read before recording the video
Measured on production: **the builder does not reliably emit a dashboard or a
pricing page**, so two of the brief's four example instructions can be no-ops
depending on the draft. And where no dashboard exists, "Add a dashboard"
**converts the home page into one rather than appending a fifth page** —
consistent (nav still matches pages) and defensible, but not literally additive.

The seeded demo project is built around this: it ships *with* a `/pricing` page
so "Remove the pricing page." demonstrably works. Either demo from the seeded
project, or choose a target where all four instructions land.

### Auth & security
- **`getUser()` everywhere**, never `getSession()` or `getClaims()`.
- Only `getAll`/`setAll` cookie methods.
- **Redirects must carry rotated auth cookies forward** —
  `redirectPreservingCookies()` exists for this.
- `lib/safe-redirect.ts` guards every caller-supplied `next`.
- **`mailer_autoconfirm` is `true`** (email confirmation OFF). Load-bearing —
  turning it on makes signup fail project-wide with
  `over_email_send_rate_limit`. **Do not turn it back on.**
- Map Supabase errors by **`error.code`**, never message substrings.
- **SSRF guard is resolve-then-fetch, not resolve-then-pin.** DNS rebinding is a
  known, documented residual; closing it needs a pinned-IP connection `fetch`
  does not expose.

### Process
- Route Handlers, not Server Actions. Phase branches, fast-forward into `main`.
- **No subagents** — `code-review` is the review gate, `playwright` + `run` cover QA.
- `pnpm-workspace.yaml` `allowBuilds`: **any new dependency with an install
  script makes `pnpm install` exit 1**, which silently breaks `lint` and `build`.
  Read what the script does, then set it. Hit twice — `docs/DEBUGGING.md` 4 and
  its addendum.
- **`.gitignore` patterns must be root-anchored** (`/build/`, not `build/`). An
  unanchored `build/` silently excluded `app/api/build/route.ts` from the index
  while every gate passed. `docs/DEBUGGING.md` entry 6.

---

## Standing constraints worth re-reading before coding

- Reopening a saved project must render from the DB and **never** re-call Gemini.
- `maxOutputTokens` on every call, with a floor; zod-validate every response.
- 15 RPM / **500 requests per day**, shared with the grader. One full demo is
  exactly **6 calls**. Handle 429 as two states: per-minute (retry works) and
  per-day (retry never works — say so).
- Any **new** env var must be added to Vercel too.
- `apply_migration` / `execute_sql` write straight to production. **Ask first.**
  Regenerate `lib/types/database.ts` after any migration.
- Delete test users after any manual flow — only `demo@reforge.app` should remain.
- 35 of 100 points are process docs, maintained continuously by Claude.

---

## A pattern worth carrying forward

Three separate times this session a **verification step was wrong rather than the
thing being verified**: a deploy probe that would have reported success against
the old build, a "blocked" SSRF result that was actually a network timeout, a
structural test that passed because the fixture never contained the thing being
removed, and an assertion that failed only because the headings are
CSS-uppercased. Verification code gets no review and no tests, and it is trusted
precisely when it says what you hoped to hear. **Read the reason, not the verdict.**

---

## Open questions for the user

1. **Which skills are being added for the frontend refactor?** The user said
   "with new added skills" — ask before starting so the work uses them.
2. **How much of the app shell should the refactor touch?** The landing page is
   done and verified; the recommendation is to focus on
   `/dashboard/[projectId]`, which is where a grader spends most time.
3. **Video: demo from the seeded account or a live analysis?** Live is more
   impressive but spends quota and risks the two interpretive instructions
   above. A hybrid — live analyze + build, then the seeded project for
   refinements — is probably the strongest.

---

## Session wrap-up ritual

Run the **`wrap-up`** skill. In order: `08-mvp-checklist.md` (tick only what is
verified on the deployed URL) → `docs/PROMPTS.md` and `docs/DEBUGGING.md` →
`docs/ARCHITECTURE.md` and `README.md` → **this file** (rewrite, don't append) →
commit and push.
