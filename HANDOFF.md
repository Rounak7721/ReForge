# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-26, ~20:15 IST — end of session 5. **All 42 required
bullets are built, deployed and verified; 5 of 5 deliverables done except the
video.** The next session builds three bonus phases, then records the video
last so the new features appear in it._

---

## Where things stand

**All 42 required bullets are built, deployed and verified (audited
2026-08-26).** Four of five deliverables are done. What is left is three
approved bonus phases, the process narrative, and the video.

| | Status |
|---|---|
| Production URL | **https://reforge-blond-two.vercel.app/** — full flow working |
| Demo login | `demo@reforge.app` / `reforge-demo-2026` — opens a finished project |
| GitHub repo | `Rounak7721/ReForge`, `main` current and pushed |
| Vercel | Auto-deploys on every push to `main` |
| Supabase | `zqyahkyigokbxmufpxpj` — schema + RLS live. **Only the demo account exists**; all test users deleted |
| Working tree | Clean, on `main`, synced with origin |
| LLM quota used today | ~86 of 500 (one refine spent verifying the diff panel). Resets midnight Pacific |

```
checklist      93 / 95 boxes     98% complete
required       42 / 42 bullets   100% — audited against the deployed URL
bonuses        1.5 / 7           three more approved, phases 1-3
deliverables   4 / 5             video outstanding, deliberately last
deadline       2026-08-27 ~13:42 IST      (~17h remaining at time of writing)
```

**Estimated remaining work: ~10.5h** — 7.5h of bonus phases plus 3h of
deliverables, against ~17h. It fits, but only if the hard stop is respected:
**stop bonus work when 4 hours remain and record the video.**

---

## Next actions, in order

The user approved a three-phase bonus plan on 2026-08-26. **Phases are ordered
so each one is independently shippable** — stop at any boundary.

> **Hard stop rule:** stop bonus work when 4 hours remain and record the video.
> An unrecorded video costs more than a missing bonus. The video is deliberately
> last so the bonus features are in it.

### Phase 1 — Concept preview (bonuses #2 + #5) · ~2h · zero quota

Turn the concept into a **rendered page** instead of a structured summary, in a
third tab beside Teardown and Your product.

**This needs no model call.** Everything a page requires is already in the
concept object: `pages[].sections[].{type, headline, body}` is real copy,
`uiDirection.palette[]` is real hex, `uiDirection.typography` is a concrete
typeface direction. It is a renderer over existing data.

**The one decision that matters: render into a sandboxed `<iframe srcdoc>`,
not the app DOM.** Two reasons — the concept has its own colours and fonts that
would collide with the design system, and an iframe's srcdoc *is* an HTML
document, which is exactly what phase 2 produces. Build "render an HTML string
in a sandboxed iframe" once and phases 1 and 2 share it.

**Security, already decided with the user:** `sandbox="allow-scripts"` and
**NOT** `allow-same-origin`. That pair is what stops generated JS reaching the
parent page, cookies or the Supabase session. It means the preview cannot talk
to the app at all, which is correct.

Reuse the existing tab component (`components/project/project-view.tsx`) — it
already handles URL sync, keeps panels mounted, and has correct tablist
semantics. It currently takes exactly two panels; generalise it to N.

### Phase 2 — Code generation + iteration (bonuses #3 + #6) · ~4h

Generate a single self-contained starter page from the concept, preview it in
the phase-1 iframe, refine it in natural language, download it.

**Provider: Groq + Qwen, with Gemini as fallback — the user's call.**

⚠️ **Cost is NOT confirmed.** The pricing page the user reviewed shows Groq
*Preview Models* with per-token pricing on a Developer Plan, and a banner
saying preview models "should not be used in production environments as they
may be discontinued at short notice." That is evidence *against* a free tier,
not for one. **Before enabling Groq in production, check the free-tier limits
specifically.** The project's zero-recurring-cost rule is hard.

The mitigation is already designed in: **make the codegen provider an env var
and keep Gemini working.** If Groq costs money or the preview model is pulled,
flip one variable and nothing else changes. Do not let Groq become load-bearing.

Implementation notes, verified against the code:

- Adding a provider is **3 files, not 1** — `LLMProviderName` is a closed union
  in `lib/llm/types.ts`, plus `registry.ts`, plus the env schema in `lib/env.ts`.
  Still ~30 minutes.
- **Wrap the HTML in JSON: `{ html: string }`.** The provider contract is
  `generateJson`, validated by zod. Wrapping keeps schema validation *and* the
  existing stricter-retry on malformed output with **no interface change**.
  Adding a `generateText` method would touch every provider and discard the
  retry policy.
- **One self-contained HTML file, not three.** It doubles as the iframe srcdoc
  *and* the download (`<a download>` + Blob, no ZIP code at all), and a model
  produces one coherent file far more reliably than three that must reference
  each other. ZIP is ~60 lines of stored-entry writer if files are split later
  — cheap to add after, pointless before.
- **Refinement reuses the Editor pattern**: `current HTML + instruction → new
  HTML`, exactly like `concept + instruction → concept`. That is all the
  "memory" a single-page loop needs.
- Reuse the command-bar component so both refine loops look identical.
- **The preview tab must never be empty.** Show the phase-1 template render
  immediately; "Build starter site" *upgrades* it to generated code. That keeps
  the tab useful when quota is gone — which matters when a grader is running on
  our shared free tier.

**LangChain was considered and rejected.** Three reasons, all still true:
`pnpm-workspace.yaml`'s `allowBuilds` has broken this repo twice
(`docs/DEBUGGING.md` 4 + addendum) and LangChain pulls a large tree; `lib/llm`
already provides provider abstraction, schema-constrained output, validation,
retry, typed errors and a token floor, so it would wrap our abstraction in
another; and "memory" here is one variable. Do not reopen this without a new
reason.

### Phase 3 — Screenshot analysis (bonus #1) · ~1.5h · zero extra quota

1. `GET https://api.microlink.io?url=<target>&screenshot=true&meta=false` → a
   hosted PNG URL. Free tier, no key needed for basic use.
2. Fetch the bytes server-side, base64 them.
3. **Attach to the existing analyzer call as an `inlineData` part** alongside
   the scraped text. Gemini Flash is already multimodal — this is the *same*
   call, so it costs no extra quota.
4. Add prompt fields the text cannot answer: visual style, layout density,
   colour treatment.

**Both failure modes must degrade to text-only silently, never fail the
request:** microlink is slow (3–8s against a 60s route budget) and it
rate-limits anonymous callers.

Why it is worth doing: the analyzer is text-only today, so a JS-heavy landing
page with little copy analyses badly — a limitation already written into the
README. This fixes a real weakness rather than adding a trick.

### Phase 4 — Deliverables (the last two boxes)

1. **AI development process narrative** — blank folder → deployed. Required,
   not yet written. ~30min.
2. **Record the video**, ≤3 min, against production, all 8 beats from
   `project_guidelines/06-deliverables.md`. Reserve **2.5h**.

**Read the demo caveat under Decisions before recording** — two of the brief's
four example instructions can be no-ops depending on the generated draft.

---

## Bonus status — audited 2026-08-26

| # | Bonus | Status |
|---|---|---|
| 1 | Screenshot analysis | Planned, phase 3 |
| 2 | Generate actual UI | **Partial** — structure renders, page does not. Phase 1 |
| 3 | Code generation | Planned, phase 2 |
| 4 | Agent workflow | **CUT** — reasoned, documented, keep it cut |
| 5 | Live preview | **Partial** — only the palette mock. Phase 1 |
| 6 | Iterative AI dev | Planned, phase 2 (un-cut: depended on #3 + #5) |
| 7 | Automated QA | **Done as process, NOT as a feature.** Claim it as process only |

On #7: real AI-driven inspection happened — `docs/UI-AUDIT.md`, the canvas
contrast audit across both themes, the overflow sweep, and the frame-sampling
that caught the analyze flash. It is a development practice, not something the
product does. Saying otherwise in the video would be a false claim.

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
  marketing/      wordmark(+LogoMark) · marketing-header · site-nav · teardown-panel
  analysis/       analysis-view (pure, bento) · analysis-skeleton
  concept/        concept-view (pure, bento) · concept-diff · product-studio
  analyze/        analyze-form
  ui/             button(+ButtonIcon) · icons (custom set) · motion (Reveal,
                  Spotlight) · theme-toggle · input · textarea · skeleton · sonner
lib/
  concept-diff.ts pure before/after comparison — powers the diff panel
docs/             ARCHITECTURE · PROMPTS(8) · DEBUGGING(8) · UI-AUDIT
```

**Honest status:** everything above works locally and is committed. The redesign
has *not* been seen on production yet — that is action 1.

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

### Bonus architecture — settled 2026-08-26, do not relitigate
- **The preview is a sandboxed iframe**, `sandbox="allow-scripts"` WITHOUT
  `allow-same-origin`. That exact pair is what isolates generated JS from the
  parent page, cookies and the Supabase session. Not negotiable.
- **One HTML string is the shared substrate** for bonuses #2, #3, #5 and #6.
  Template-rendered from the concept (free, deterministic) or model-generated —
  the iframe does not care which.
- **Codegen output is `{ html: string }` JSON**, not raw text. Keeps zod
  validation and the existing stricter-retry with no provider-interface change.
- **Single self-contained HTML, not a multi-file bundle.** More reliable from a
  model, and it is both the srcdoc and the download with no ZIP code.
- **LangChain is rejected** — allowBuilds risk (has broken this repo twice),
  it would wrap `lib/llm` in a second abstraction that duplicates every feature
  it already has, and "memory" here is one variable.
- **Groq must not become load-bearing.** Provider is an env var; Gemini stays a
  working fallback.

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

1. **Is Groq actually free at our volume?** Unresolved, and it gates phase 2's
   provider choice. The pricing page reviewed showed *Preview Models* with
   per-token pricing and a "not for production, may be discontinued" banner —
   which argues against a free tier. Check the free-tier limits specifically.
   Either answer is workable: the codegen provider is an env var and Gemini is
   the fallback, so this is not a blocker, only a config decision.
2. **Video: seeded account or live analysis?** A hybrid — live analyze + build,
   then the seeded project for refinements — is probably strongest. The diff
   panel makes the refinement beat land much harder than it used to, so give it
   screen time. If phases 1–2 land, the preview and starter-site beats need
   room too, which argues for keeping the live portion short.
3. **Imagery.** The user decided against background images ("looks better as
   is"). The logo is done. Only the OG card (1200x630) is still worth making —
   metadata is wired in `app/layout.tsx`, only the file is missing.

## Session wrap-up ritual

Run the **`wrap-up`** skill. In order: `08-mvp-checklist.md` (tick only what is
verified on the deployed URL) → `docs/PROMPTS.md` and `docs/DEBUGGING.md` →
`docs/ARCHITECTURE.md` and `README.md` → **this file** (rewrite, don't append) →
commit and push.
