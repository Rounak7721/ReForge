# 08 — MVP Checklist (living document)

**This is the working tracker.** Update it as work happens — tick boxes the moment something is done and deployed, not when it's "basically done". Every other doc in this folder is reference; this one is state.

**Deadline: 2026-08-27 ~13:42 IST — CONFIRMED.** 48h from PDF generation (2026-08-25 13:42 IST). A complete, hosted, working MVP must exist by then. Bonus features are decided *after* that bar is met, not before.

**Rule:** nothing in `05-bonus-features.md` starts until every box below is ticked **on the deployed URL**.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done & verified on deploy · `[-]` cut (note why)

---

## Phase 0 — Bootstrap & deploy skeleton

Goal: a public URL exists before any feature does. Deployment is 10 points; get them banked early.

**Repo & tooling**
- [x] `git init`, `.gitignore` (`.env*`, `.next`, `node_modules`)
- [x] `pnpm create next-app` — TypeScript, Tailwind v4, App Router, ESLint (Next 15.5.23, React 19.1.0)
- [x] `pnpm dlx shadcn@latest init` — Radix base, `nova` preset; button/input/textarea/card/label/sonner/skeleton added
- [x] `tsconfig` strict verified (+ `noUncheckedIndexedAccess`); `pnpm lint` + `pnpm build` green
- [x] `.env.example` created with every var from `03-tech-stack.md`
- [x] `docs/PROMPTS.md`, `docs/DEBUGGING.md`, `docs/ARCHITECTURE.md` scaffolded

**Deploy** — **[OUR DECISION, 2026-08-25]** GitHub → Vercel CI/CD from the start, so every push to `main` auto-deploys and later phases are verified on the real URL rather than only on localhost. Fallback if Vercel fails: OCI free tier behind a Cloudflare Tunnel on `reforge.rounak.co`.
- [x] GitHub repo `Rounak7721/ReForge` pushed
- [x] Vercel project linked to the GitHub repo (auto-deploy on push to `main`)
- [ ] Env vars set in Vercel (all of `.env.example`) — **deliberately deferred**, added as each is first used; re-check before any deploy that introduces one
- [x] Placeholder page deployed and publicly reachable — https://reforge-blond-two.vercel.app/ (HTTP 200, correct title)
- [x] Production URL recorded in `HANDOFF.md`

---

## Phase 1 — Database & Auth

Covers requirement 4 (partially) and requirement 5 in full.

**Backend**
- [x] Supabase project created
- [ ] Schema: `projects` table — `id`, `user_id`, `url`, `description`, `target_customer`, `analysis jsonb`, `concept jsonb`, `created_at`, `updated_at`
- [ ] Schema: `refinements` table — `id`, `project_id`, `instruction`, `created_at` (chat history + an audit trail for the video)
- [ ] RLS enabled on both tables; policies scoped to `auth.uid()`
- [ ] `lib/supabase/browser.ts` (anon key) and `lib/supabase/server.ts` (service role, server-only)
- [ ] Middleware guarding `/dashboard/*` → redirect to `/login`

**Frontend**
- [ ] Sign up page
- [ ] Login page
- [ ] Logout control in dashboard chrome *(graded bullet — easy to forget)*
- [ ] Protected dashboard shell renders for an authed user

**Verify**
- [ ] A brand-new user can sign up in incognito on the **deployed** URL with no email-confirmation dead end
- [ ] User A cannot read User B's projects (test RLS directly, not just via UI)

---

## Phase 2 — Analyzer pipeline

Covers requirement 2. See `04-execution-flows.md` for the flow and failure table.

**Backend**
- [ ] `lib/llm/` — `getLLM`, `generateStructured`, `providers/gemini.ts`, `registry.ts`
- [ ] `lib/llm/README.md` documenting the swap contract
- [x] Confirm current free Flash model ID; set `GEMINI_MODEL` — `gemini-3.6-flash`, verified against the live API, table in `03-tech-stack.md`
- [ ] `lib/prompts/analyzer.ts`
- [ ] Zod schema: exactly the 7 analysis fields from `02-functional-requirements.md`
- [ ] Server-side URL fetch — timeout, size cap, HTML→text, truncate to token budget
- [ ] `POST /api/analyze` — input validation, try/catch, typed error JSON + status
- [ ] Result cached to `projects.analysis`
- [ ] `maxOutputTokens` set
- [ ] Malformed-JSON path: zod fail → one stricter retry → typed error
- [ ] 429 path returns a distinct rate-limited error code

**Frontend**
- [ ] Form: Website URL + Product description + Target customer (validated)
- [ ] Analysis results view rendering all 7 fields
- [ ] Loading state (skeleton)
- [ ] Error state with retry
- [ ] Rate-limited state, distinct from generic error

**Verify**
- [ ] Works on a real marketing site
- [ ] Unreachable URL → friendly error, nothing persisted
- [ ] JS-only shell site → falls back to meta/title, tells the user the site was thin

---

## Phase 3 — Builder & Editor

Covers requirement 3.

**Backend**
- [ ] `lib/prompts/builder.ts`
- [ ] Zod schema: exactly the 6 concept fields, **structured not prose** — see the `[OUR DECISION]` block in `02-functional-requirements.md` §3
- [ ] `POST /api/build` — reads cached analysis by `projectId`, writes `projects.concept`
- [ ] `lib/prompts/editor.ts`
- [ ] `POST /api/refine` — `{projectId, instruction}` → **full** updated concept, persisted
- [ ] Refinement logged to `refinements`
- [ ] Both routes: validation, try/catch, typed errors, `maxOutputTokens`

**Frontend**
- [ ] "Build My Product" button + loading state
- [ ] Concept view rendering all 6 fields — `<ConceptView concept={...} />`, a pure function of the concept object (so the preview bonus is a sibling component, not a refactor)
- [ ] Chat/instruction input, **debounced**, max one in-flight request
- [ ] Refinement history visible
- [ ] Optimistic or clearly-signalled updating state

**Verify — all four PDF instructions visibly change the concept**
- [ ] "Make the design more premium."
- [ ] "Add a dashboard."
- [ ] "Remove the pricing page."
- [ ] "Make it suitable for enterprise customers."

---

## Phase 4 — Dashboard & persistence

Covers requirement 6.

**Backend**
- [ ] List projects for current user
- [ ] Create project
- [ ] Load project by id (analysis + concept + refinements) — **zero LLM calls**

**Frontend**
- [ ] Project list with empty state + CTA
- [ ] Create-project flow
- [ ] `/dashboard/[projectId]` — analysis, concept, chat on one page
- [ ] Reopening a saved project renders instantly from DB

**Verify**
- [ ] Reopen a project with the network tab open — confirm no LLM request fires
- [ ] Refresh mid-flow doesn't lose state

---

## Phase 5 — Landing page

Covers requirement 1. Worth a large share of the 15 product-quality points, and it's the grader's first impression. Use the `frontend-design` skill.

- [ ] Product name / logo
- [ ] Clear value proposition
- [ ] Hero section
- [ ] Product demo / mockup
- [ ] Features
- [ ] How it works
- [ ] CTA (→ sign up)
- [ ] Pricing (sample tiers are explicitly fine — no billing)
- [ ] Footer
- [ ] Responsive at 375 / 768 / 1440
- [ ] Reads like a startup, not an assignment

---

## Phase 6 — Hardening & production readiness

Covers requirement 7 and the remainder of requirement 4.

- [ ] Every async view has loading + error + empty + rate-limited states
- [ ] No unhandled promise rejections
- [ ] No secret in the client bundle (grep the build output for key prefixes)
- [ ] Service-role client provably absent from any Client Component
- [ ] `pnpm lint` and `pnpm build` green
- [ ] `security-review` run on the diff
- [ ] Seed a demo account with one pre-analyzed project *(insurance against quota exhaustion during grading)*
- [ ] Full flow smoke-tested in a fresh incognito window as a new user, on production

---

## Phase 7 — Deliverables

These are 35 of 100 points. See `06-deliverables.md`. Written continuously, finalised here.

- [ ] Root `README.md` with all 9 required sections
- [ ] `docs/PROMPTS.md` — 5–10 prompts, each with all 4 required parts
- [ ] `docs/DEBUGGING.md` — ≥2 full Problem→Prompt→Attempt→Debug→Fix trails
- [ ] `docs/ARCHITECTURE.md` current
- [ ] AI development process narrative (blank folder → deployed)
- [ ] Clean commit history, pushed to GitHub
- [ ] Vercel connected to GitHub for CI/CD auto-deploy
- [ ] Video ≤3 min, recorded against **production**, all 8 beats
- [ ] Every box in `02-functional-requirements.md` verified on the deployed URL

---

## Explicitly cut from MVP

- **[-] Multi-agent workflow (Research → Product → UI → QA)** — cut for cost/rate-limit reasons. Five chained calls per user action against a ~10–15 RPM free tier is not viable, and it adds no *required* capability. Documented as future scope: a natural LangGraph fit, where each agent is a graph node with typed state and the orchestration/retry/fan-out is handled by the framework rather than hand-rolled. Say this in the README's "Known limitations" and in the video's "what I'd build next" beat — a reasoned cut is a product-thinking signal, an unexplained gap is not.
- **[-] Iterative code-level AI development** — depends on code generation + live preview; out of MVP scope.

## Reordering rule

If time runs short, cut in this order: bonus features → landing-page polish → refinement history UI. **Never** cut: deployment, the 7 analysis fields, the 6 concept fields, auth, or the Phase 7 docs.
