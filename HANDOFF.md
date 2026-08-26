# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-26, ~14:45 IST — session 4 paused for a usage-limit reset,
resuming ~15:45 IST. No code changed this session. Phases 0–6 remain complete and
verified on production. The frontend refactor's **visual direction is now settled**
(v0 / Lovable / Replit — see Next actions) and a pre-refactor defect baseline was
captured in `docs/UI-AUDIT.md`. Next: build the refactor, then Phase 7 (docs +
video)._

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

### 1. Frontend / UX refactor — **direction now settled, not yet started**

**The user picked the references on 2026-08-26: v0.dev, Lovable, Replit.**

Their brief, verbatim in substance: the current UI is *"too simple"*; if this is
meant to be a startup page it should *"look like an actual good startup page
with all the UI enhancements, loaders, animations, to make it attractive and
feel like a real product instead of just some plain old generic demo."*
Explicitly asked for **background images, logos, gradients, stylish buttons**.

**This reverses the existing design language.** The current `.marketing` system
in `app/globals.css` is a flat editorial "spec sheet" — hairline rules, one
accent, no gradients, no shadows. The three references are dark-first,
gradient-heavy and motion-rich. Treat `--ink/--paper/--wash/--rule/--signal` as
**the thing being replaced**, not a constraint to design within. Note also that
`components/providers/theme-provider.tsx` pins `forcedTheme="light"` — going
dark-first is a deliberate reversal of that, not an oversight.

**Answers already given, do not re-ask:**

| Question | Answer |
|---|---|
| Scope | **Everything, including the verified landing page** |
| Refine UX | **Command bar + visual diff** (not a chat transcript — see Decisions) |
| Aesthetic | v0 / Lovable / Replit |

**Skills to use** (installed at `~/.agents/skills`, symlinked into
`~/.claude/skills`; `web-design-guidelines` is project-scoped in
`.claude/skills/` via `skills-lock.json`):

- `high-end-visual-design` — the aesthetic driver. Matches the references
  (depth, layered shadows, cinematic spacing, micro-interactions).
  **Not `minimalist-ui`** — it explicitly bans gradients and heavy shadows,
  which is the opposite of what was asked for.
- `redesign-existing-projects` — audit-first process wrapper.
- `web-design-guidelines` — the compliance gate at the end.
- `design-taste-frontend` self-describes as *"not dashboards, not multi-step
  product UI"*, so it is a poor fit for `/dashboard`. The `imagegen-*`,
  `image-to-code` and `brandkit` skills need image generation, which was not
  available in the session that surveyed them.

Where the current UI is weakest, in priority order — **use this order if time
runs short**, it is highest-graded-value first:

1. **`/dashboard/[projectId]` is a long vertical dump.** Analysis (7 sections)
   then concept (4 sections) stacked, every box an identical
   `bg-card rounded-lg border p-5`. No rhythm, no hierarchy. This is the page a
   grader spends the most time on.
2. **The refine box is a form, not a command bar** — and the concept mutates
   silently behind an `opacity-50` with no diff. Fixing both is what makes the
   demo land.
3. **The app shell uses stock shadcn neutrals** while marketing has a real
   design language, so the two halves of the product look unrelated.
4. **`/dashboard/new` is a plain form** on an otherwise designed product.
5. **The landing page** — now in scope, but it already works, so it is the
   safest thing to cut if the clock runs out.

**Baseline defects are already catalogued in `docs/UI-AUDIT.md`** (run with
`web-design-guidelines` before the refactor). Items tagged **[keep]** are real
accessibility bugs that must not be re-introduced into the new components;
items tagged **[folds in]** disappear when the surface is rebuilt. Do not re-run
that audit from scratch — carry the [keep] list forward, then re-run the skill
at the end as the gate.

**Time risk, stated honestly:** this scope is much larger than the ~2h the
previous session had penciled in for a UI pass. The video is a required
deliverable worth real points and needs ~2.5h. If both cannot fit, the video
wins — a slightly plainer app that is demonstrated well scores better than a
beautiful one with no recording. Raise this with the user rather than silently
letting the refactor consume the buffer.

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

1. **Dark-first or light-first?** v0, Lovable and Replit are all dark-first.
   Going dark means reversing `forcedTheme="light"` in
   `components/providers/theme-provider.tsx` and restyling every surface. Going
   light keeps more of the existing work but drifts from the references. Ask
   before committing — it is the single highest-leverage call in the refactor.
2. **Where do background images and logos come from?** The user asked for both.
   There is no image generation available and no asset pipeline in the repo.
   Options: CSS-only gradients and noise (zero cost, zero new deps), inline SVG
   patterns, or the user supplies files. **Zero recurring cost is a hard project
   constraint**, so no CDN-hosted stock imagery.
3. **Video: demo from the seeded account or a live analysis?** Live is more
   impressive but spends quota and risks the two interpretive instructions in
   the Decisions section. A hybrid — live analyze + build, then the seeded
   project for refinements — is probably the strongest.

---

## Session wrap-up ritual

Run the **`wrap-up`** skill. In order: `08-mvp-checklist.md` (tick only what is
verified on the deployed URL) → `docs/PROMPTS.md` and `docs/DEBUGGING.md` →
`docs/ARCHITECTURE.md` and `README.md` → **this file** (rewrite, don't append) →
commit and push.
