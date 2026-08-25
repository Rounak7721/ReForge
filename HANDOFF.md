# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-25 — end of setup session (docs + tooling complete, no app code yet)_

---

## Where things stand

**Phase:** Phase 0 not started. Planning, reference docs and tooling are complete. **No application code exists yet.**

**Deadline:** 48h from receipt. PDF generated 2026-08-25 13:42 IST ⇒ target **2026-08-27 ~13:42 IST**. Still unconfirmed with the user.

| | Status |
|---|---|
| Production URL | not deployed |
| GitHub repo | not pushed (local git only, 3 commits) |
| Supabase project | **created** — ref `zqyahkyigokbxmufpxpj`, schema empty |
| Vercel project | not created |

---

## First thing to do in this session

The previous session created four project skills and the Supabase MCP config. Both were verified working but could not load mid-session. **Confirm they are live before doing anything else:**

1. Approve the `.mcp.json` supabase server if prompted at startup.
2. Check the skills list contains `prompt-log`, `debug-log`, `deploy`, `wrap-up`.
3. Check `/mcp` shows **supabase**, **context7** and **playwright** connected.
4. Sanity-check the MCP with `list_tables` — expect `{"tables":[]}` until Phase 1 runs.

If `frontend-design` or `playwright` are missing, re-enable them — `frontend-design` is needed for Phase 5, `playwright` for QA.

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

1. Verify skills + MCP are live (see above).
2. Confirm the actual assignment receipt time with the user — it fixes the real deadline.
3. Confirm the product name. "Reforge" is assumed throughout; settle it before Phase 5 builds a logo around it.
4. **Start Phase 0** in `project_guidelines/08-mvp-checklist.md`: scaffold Next.js + shadcn, then deploy a placeholder to Vercel **the same day**. Deployment is 10 points — bank them early.
5. Then Phase 1 (Supabase schema + RLS + auth). The DB is empty and waiting.

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

---

## Standing constraints worth re-reading before coding

- Reopening a saved project must render from the DB and **never** re-call Gemini — this is both a cost rule and requirement 6.
- `maxOutputTokens` on every LLM call; zod-validate every LLM response before it touches the DB or UI.
- Free tier is ~10–15 RPM. Debounce the chat box, serialize requests, handle 429 as a distinct UI state.
- `apply_migration` and `execute_sql` write straight to the remote project — there is no staging. **Ask before running either.**
- 35 of 100 points are process docs. `docs/PROMPTS.md` and `docs/DEBUGGING.md` are maintained continuously by Claude, never batched to the end.

---

## Open questions for the user

- Actual assignment receipt time? (fixes the real deadline)
- Product name — is "Reforge" confirmed?

---

## Session wrap-up ritual

Run the **`wrap-up`** skill. It updates, in this order, then commits:

1. `project_guidelines/08-mvp-checklist.md` — tick only what is done **and verified on the deployed URL**
2. `docs/PROMPTS.md` / `docs/DEBUGGING.md` — append anything not yet logged
3. `docs/ARCHITECTURE.md` / `README.md` — reflect real structure
4. **This file** — rewrite the sections; a stale handoff is worse than a short one
5. `git commit`
