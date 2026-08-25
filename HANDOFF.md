# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-25 — scope clarified and decisions locked; Phase 0 starting_

---

## Where things stand

**Phase:** Phase 0 not started. Planning, reference docs and tooling are complete. **No application code exists yet.**

**Deadline: 2026-08-27 ~13:42 IST — CONFIRMED by the user.** A complete, hosted, working MVP by then. Whether to add bonus features is decided *after* that bar is met.

| | Status |
|---|---|
| Production URL | not deployed |
| GitHub repo | not pushed (local git only, 3 commits) |
| Supabase project | **created** — ref `zqyahkyigokbxmufpxpj`, schema empty |
| Vercel project | not created |

---

## Known blocker — Supabase MCP is unauthorised

`list_tables` returns `Unauthorized`. **Cause:** `SUPABASE_ACCESS_TOKEN` is exported in `~/.bashrc`, but Claude Code was launched from the VSCode extension host, which never sourced it. `.mcp.json` interpolates `${SUPABASE_ACCESS_TOKEN}` from Claude Code's process env, so it resolves to empty and the server starts unauthenticated.

**Fix:** relaunch Claude Code from a shell that has the token exported (`source ~/.bashrc && claude`), or export it into the VSCode launch environment. Claude cannot run the auth flow itself.

This blocks **Phase 1** (schema + RLS). It does **not** block Phase 0.

Everything else is live: skills `prompt-log` / `debug-log` / `deploy` / `wrap-up`, plus `frontend-design`, `code-review`, `security-review`, `run`; context7 and playwright tools available.

---

## What exists right now

```
CLAUDE.md                    working agreement + conventions
HANDOFF.md                   this file
.mcp.json                    supabase MCP (token via ${SUPABASE_ACCESS_TOKEN})
.claude/skills/              prompt-log, debug-log, deploy, wrap-up
project_reference/           the original assignment PDF
project_guidelines/          distilled reference — 10 docs, read README.md first
  08-mvp-checklist.md        ← the live task tracker
docs/
  PROMPTS.md                 scaffolded, no entries yet
  DEBUGGING.md               scaffolded, no entries yet
  ARCHITECTURE.md            scaffolded, mostly TBD
```

No `package.json`, no `app/`, no `lib/`. The repo is documentation and git history.

---

## Next actions, in order

1. **Phase 0** in `project_guidelines/08-mvp-checklist.md`: scaffold Next.js 15 + shadcn, get `pnpm lint` and `pnpm build` green, write `.env.example`, deploy a placeholder to Vercel **the same day**. Deployment is 10 points — bank them early.
2. Fix the Supabase MCP token (see blocker above) before Phase 1.
3. **Phase 1** — Supabase schema + RLS + auth. The DB is empty and waiting.

Plan mode first for anything non-trivial, per the working agreement in `CLAUDE.md`.

---

## Decisions already made — don't relitigate

- **Stack:** Next.js 15 App Router, TS strict, Tailwind + shadcn/ui, Supabase (Postgres + Auth, RLS on), Gemini Flash free tier, Vercel Hobby. Rationale in `03-tech-stack.md`.
- **Zero recurring cost is a hard requirement.** Gemini free tier at runtime; no OpenAI/Anthropic API calls inside the product. Claude Code builds it, Gemini runs in it — state this distinction in the README and video.
- **Route Handlers, not Server Actions**, for all mutations. One pattern throughout.
- **All model calls go through `lib/llm`.** Feature code never imports a vendor SDK. Swapping vendor = env change only.
- **Multi-agent workflow is cut** for cost/rate-limit reasons → future scope, framed as a LangGraph fit. Belongs in README "Known limitations" and the video's "what's next" beat.
- **Supabase MCP over the CLI fallback.** `.mcp.json` is committed; the token stays in the shell env, never in the file.
- **No subagents.** `code-review` skill covers the review gate; `playwright` + `run` cover QA.
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
