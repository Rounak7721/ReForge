# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-27, ~03:30 IST — end of the overnight autonomous session.
**All three approved bonus phases are built, reviewed and verified locally.
Nothing is deployed: `git push` is blocked in this environment and needs you.**_

---

## ⚠️ Three things need you before anything else

### 1. Push — everything is committed locally and nothing is on production

`git push` is refused by the harness permission classifier, regardless of the
authorisation given verbally. Four commits are sitting on local `main`:

```
0e595d8  fix(llm): Gemini rejects minItems/maxItems alongside enum — build and refine were down
12c2dad  feat(codegen): generate and iterate on a real page (bonuses #3, #6)
8c1df9a  feat(analyze): read a screenshot of the target site (bonus #1)
24bcd23  feat(preview): render the concept as an actual page (bonuses #2, #5)
```

```bash
git push origin main    # auto-deploys to Vercel
```

**`0e595d8` is urgent and unrelated to the bonus work — see §2.**

### 2. Production is currently BROKEN, and was before this session started

`/api/build` and `/api/refine` fail on **every** request with
`400 Request contains an invalid argument`. Google tightened Gemini's
`responseJsonSchema` validation server-side; nothing was deployed to cause it.
It rejects `minItems`/`maxItems` when the same schema also contains an `enum`,
and `conceptSchema` has both.

Confirmed by running the same probe against a worktree at `a2c9dc5` — the last
commit of the previous session — where it fails identically.

**Commit `0e595d8` fixes it.** Until it is pushed, the deployed app cannot
build a product or refine one. Full write-up: `docs/DEBUGGING.md` entry 9.

### 3. Add three Vercel env vars, or code generation falls back to Gemini

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | the key you added to `.env` locally |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `CODEGEN_PROVIDER` | `groq` |

If they are missing, `CODEGEN_PROVIDER` falls back to `LLM_PROVIDER` (Gemini)
and code generation still works — it just spends the scarce Gemini quota
instead of Groq's separate one. **It will not crash**, that fallback was built
deliberately. `.env.example` documents all of them.

---

## Where things stand

| | Status |
|---|---|
| Production URL | https://reforge-blond-two.vercel.app/ — **build/refine broken until `0e595d8` ships** |
| Demo login | `demo@reforge.app` / `reforge-demo-2026` |
| GitHub repo | `Rounak7721/ReForge` — local `main` is **4 commits ahead** |
| Supabase | `zqyahkyigokbxmufpxpj` — migration 0003 applied to production |
| Working tree | Clean, on `main` |
| Gemini quota | ~45 of 500 used (mostly schema bisection). Resets 12:30 IST today |
| Groq quota | Free tier: 1000 req/day, **8000 tokens/minute** — the minute is the real limit |

```
required       42 / 42 bullets   100%
bonuses        6 / 7             built + reviewed, verified LOCALLY only
deliverables   4 / 5             video outstanding
deadline       2026-08-27 ~13:42 IST
```

---

## What was built tonight

### Phase 1 — Concept preview (bonuses #2 + #5)

A third tab renders the concept as an actual web page: its own copy, palette
and typeface direction. **Zero model calls** — a pure function over data already
in Postgres, so it works with the daily quota fully spent.

Renders into an iframe with `sandbox="allow-scripts"` and deliberately WITHOUT
`allow-same-origin`. That exact pair gives the document an opaque origin, so
nothing inside can reach the app's cookies or the Supabase session. **Do not add
`allow-same-origin`** to fix a layout problem — it silently undoes both flags.

The concept moved out of `ProductStudio`'s local state into a small context
(`components/concept/concept-store.tsx`), because the preview is a second reader
of the same mutable object. Verified: refining on the "Your product" tab
repaints the preview tab live, with no reload.

### Phase 3 — Screenshot analysis (bonus #1)

microlink's anonymous tier returns a hosted PNG; it is attached to the analyzer
call that was already happening as a second `inlineData` part. **No extra
quota** — it is the same call. Adds a "Visual impression" cell (style, layout
density, colour treatment).

Verified against stripe.com: the model correctly described the gradient, the
whitespace and the purple CTA. Verified in the negative too — with no screenshot
it **omits** the field rather than inventing appearance from the copy.

Every failure path returns `null` and never throws. Providers now declare
`supportsImages`, and the route only captures when the model can actually see —
otherwise the prompt would claim a screenshot was attached to a model that
cannot read it, which invites a fabricated description.

⚠️ **Your `MICROLINK_API_KEY` is rejected** (`EAUTH` 403 on `pro.microlink.io`).
The code uses the anonymous endpoint, which works fine. Worth a look if you
meant to buy pro.

### Phase 2 — Code generation + iteration (bonuses #3 + #6)

"Build starter site" → a complete self-contained HTML page. Command bar edits it
in plain English. Download saves it. Same sandboxed frame as phase 1.

The preview tab opens on the free template render and the generated page
*upgrades* it, so the tab is never empty and never depends on quota.

**Provider layer:** `gemini | openai | groq`, env-selected. Groq speaks the
OpenAI wire format, so one file serves both. Written with `fetch`, not the
`openai` SDK — a new dependency with an install script has broken this repo
twice. `llmEnv` now validates only the **active** provider's vars; it used to
demand `GEMINI_API_KEY` unconditionally, which quietly broke the swap the whole
abstraction exists to provide.

Anthropic dropped on your call — with no key behind it, a fourth provider is
scaffolding rather than proof.

---

## Measurements — do not re-derive these

- **Groq free tier: 1000 requests/day but only 8000 tokens/MINUTE.** The minute
  is the binding constraint. Worse, Groq reserves prompt + `max_completion_tokens`
  **up front**, so asking for more output than the bucket has left is an instant
  413 before anything is generated. Budgets are sized from measured need.
- **`qwen/qwen3.8-27b` truncates at exactly 10240 characters** — Groq's
  JSON-schema decoder caps string values there, closes the JSON cleanly around
  the stump, and still reports `finish_reason: "stop"`. Every downstream check
  passes; the page is broken. Pinned `openai/gpt-oss-120b` instead: complete
  documents in a third of the output tokens.
- **`gpt-oss` are reasoning models and reasoning bills to
  `max_completion_tokens`** — the Gemini `thinkingLevel` trap in another
  vendor's clothing. Without `reasoning_effort: "low"` an edit spends its budget
  thinking and returns HTTP 400 "Failed to generate JSON".
- **`groq/compound` has 70k TPM but rejects `json_schema`** — considered and
  ruled out, don't re-test it.
- **Gemini rejects `minItems`/`maxItems` alongside `enum`.** See §2 above.

---

## Next actions, in order

1. **`git push origin main`** — ships the production fix and all three bonuses.
2. **Add the three Vercel env vars** (§3).
3. **Re-verify on production**, then tick the `[~]` boxes in
   `project_guidelines/08-mvp-checklist.md`. Nothing there is ticked `[x]` yet
   because none of it has been seen on the deployed URL.
   - build + refine work again (the §2 fix)
   - Preview tab: template renders, page switcher, source toggle
   - "Build starter site" → a complete page ending in `</html>`
   - one natural-language edit to the page
   - Download saves the page you are looking at
4. **Record the video.** Reserve 2.5h. Read the demo caveat below first.
5. Optional, with you: security review, code-quality pass, then the public-repo
   doc polish you asked to keep until the app was done.

---

## Video notes

**Suggested order** — this is a hybrid, which the previous session's analysis
favoured and the new features reinforce:

1. Landing page, brief.
2. **Live**: analyze a real URL → teardown, now including "Visual impression"
   read from a screenshot. Pick a visually distinctive site; stripe.com reads
   well.
3. **Live**: Build My Product → the concept.
4. **Switch to the seeded demo project** for refinement — it ships *with* a
   `/pricing` page so "Remove the pricing page." demonstrably works. The diff
   panel makes this beat land; give it screen time.
5. **Preview tab** — the concept as a real page, page switcher across all four.
6. **Build starter site** → generated code, then one plain-English edit, then
   Download.
7. Reopen a saved project → renders from Postgres, zero model calls.
8. Known limitations + what's next.

**Demo caveat, still true:** the builder does not reliably emit a dashboard or
a pricing page, so two of the brief's four example instructions can be no-ops
depending on the draft. Where no dashboard exists, "Add a dashboard" converts
the home page into one rather than appending a fifth page — consistent and
defensible, but not literally additive. Demo refinements from the seeded
project, or pick a target where all four land.

**Pacing warning for the live codegen beat:** generate and edit back-to-back can
exceed Groq's 8000 tokens/minute. The bucket refills continuously; ~30-40s
between the two is enough. If it does trip, the UI says "Slow down a moment"
honestly — but plan the take so it doesn't.

---

## Database state

Clean. Only what should be there:

| Account | Projects | Notes |
|---|---|---|
| `demo@reforge.app` | 1 | "Soloist", 4 pages incl. `/pricing`, 2 refinements, **plus a seeded generated site** |
| `rounaks7721@gmail.com` | 1 | **Your own account — deliberately left for you to decide** |

Deleted this session: `me@example.com` (a throwaway test account) and one test
project created while verifying the screenshot path.

Your personal account was **not** deleted. You asked for "only the demo
account", but that is your own email rather than a random test account, and
deleting a person's account is irreversible — your call in the morning.

The seed now includes the generated starter site (`DEMO_GENERATED_HTML`), so
`pnpm seed:demo` restores it. Same insurance principle as the rest of the seed:
the demo must not need live quota to show its headline feature.

---

## Decisions already made — don't relitigate

### From tonight
- **The preview iframe is `allow-scripts` WITHOUT `allow-same-origin`.** Not negotiable.
- **One HTML string is the shared substrate** for the template render, the
  generated page, the srcdoc and the download. No ZIP, no multi-file bundle.
- **Codegen output is `{ html: string }` JSON**, not raw text — keeps zod
  validation and the stricter retry with no provider-interface change.
- **The schema requires a closing `</html>`.** Truncation is the failure mode
  that actually happens, and it is otherwise completely silent.
- **Groq is never load-bearing.** `CODEGEN_PROVIDER` unset falls back to Gemini.
- **LangChain rejected** — `allowBuilds` risk, it would wrap `lib/llm` in a
  second abstraction duplicating everything it already does, and "memory" here
  is one variable.
- **Anthropic dropped** — your call, and the right one.

### Still standing from earlier sessions
- Reopening a saved project renders from the DB and **never** re-calls a model.
- `getUser()` everywhere, never `getSession()`. Map Supabase errors by `code`.
- `mailer_autoconfirm` stays `true`. Turning it on breaks signup project-wide.
- `.gitignore` patterns must be root-anchored (`/build/`, not `build/`).
- Any new dependency with an install script needs `allowBuilds` set, or
  `pnpm install` exits 1 and silently breaks lint and build.
- Route Handlers, not Server Actions. Phase branches, fast-forward into `main`.
- SSRF guard is resolve-then-fetch; DNS rebinding is a documented residual.

---

## A pattern worth carrying forward

The previous handoff warned that **verification code gets no review and is
trusted precisely when it says what you hoped to hear.** It happened twice more
tonight: an assertion about backticks fired falsely because it matched a string
in a comment 200 lines above the code it meant to check, and a "wait for the
request to finish" loop reported failure because it was counting pre-existing
log lines.

Its twin, new tonight: **when results look non-deterministic, suspect the test
before the system.** Three rounds of schema probing appeared to show intermittent
failures. They were not intermittent — the probes were rebuilding sub-schemas
with fresh `z.object({...})` calls, which emit different JSON than slicing the
real schema, so "the same test twice" never was. That cost about forty minutes
and roughly thirty requests of quota.

---

## Verification status, stated honestly

Everything below passed **locally**, on `localhost:3001`, against the real
Supabase and the real model APIs:

- `pnpm lint`, `pnpm build`, `tsc --noEmit`, `pnpm check` — all green
- `pnpm check` now runs three self-checks: the concept renderer (escaping, the
  hex guard, alpha normalisation, typeface parsing, page clamping), the
  OpenAI-compatible schema translation, and the Gemini sanitiser
- code review run on all three phase diffs; **16 findings, 15 fixed**, one
  documented as a known ceiling with a `ponytail:` comment
- full regression walk: login → teardown (with visual impression) → refine →
  diff panel → preview template → page switcher → generated site → source
  toggle → plain-English edit → cross-tab live update

**None of it has been seen on production.** That is the gap, and it is only a
`git push` wide.

---

## Session wrap-up ritual

Run the **`wrap-up`** skill. In order: `08-mvp-checklist.md` (tick only what is
verified on the deployed URL) → `docs/PROMPTS.md` and `docs/DEBUGGING.md` →
`docs/ARCHITECTURE.md` and `README.md` → **this file** (rewrite, don't append) →
commit and push.
