# HANDOFF

**Read this first in every new session.** It is the fastest path back to full context.

_Last updated: 2026-08-25 — end of planning session_

---

## Where things stand

**Phase:** Phase 0 not started. Planning and reference docs complete; **no application code exists yet.**

**Deadline:** 48h from receipt. PDF generated 2026-08-25 13:42 IST ⇒ target **2026-08-27 ~13:42 IST**. Confirm actual receipt time with the user.

**Production URL:** _not deployed yet_
**GitHub repo:** _not pushed yet_ (local git only — push once MVP is working, then connect Vercel for CI/CD)
**Supabase project:** _not created yet_

---

## What exists right now

```
CLAUDE.md                    working agreement + conventions
HANDOFF.md                   this file
project_reference/           the original assignment PDF
project_guidelines/          distilled reference — 10 docs, read README.md first
  08-mvp-checklist.md        ← the live task tracker
docs/
  PROMPTS.md                 scaffolded, no entries yet
  DEBUGGING.md               scaffolded, no entries yet
  ARCHITECTURE.md            scaffolded, mostly TBD
```

Nothing else. No `package.json`, no `app/`, no `lib/`.

---

## Next actions, in order

1. Confirm the actual assignment receipt time (fixes the real deadline).
2. Decide the Supabase MCP question — install the server, or commit to the CLI + `supabase/migrations/` fallback. See `project_guidelines/09-tooling.md`. Don't do both.
3. Disable the `obsidian` MCP server for this project (pure context overhead here).
4. Start **Phase 0** in `project_guidelines/08-mvp-checklist.md` — scaffold, then deploy a placeholder to Vercel the same day. Deployment is 10 points; bank them early.

---

## Decisions already made — don't relitigate

- **Stack:** Next.js 15 App Router, TS strict, Tailwind + shadcn/ui, Supabase (Postgres + Auth, RLS on), Gemini Flash free tier, Vercel Hobby. Rationale in `03-tech-stack.md`.
- **Zero recurring cost is a hard requirement.** Gemini free tier at runtime; no OpenAI/Anthropic API calls in the product. Claude Code builds it, Gemini runs inside it.
- **Route Handlers, not Server Actions**, for all mutations — one pattern throughout.
- **All model calls go through `lib/llm`.** Feature code never imports a vendor SDK. Swapping vendor = env change only.
- **Multi-agent workflow is cut** for cost/rate-limit reasons → documented as future scope (LangGraph fit). Goes in README "Known limitations" and the video's "what's next" beat.
- **No subagents.** `code-review` skill covers review; `playwright` + `run` cover QA.

---

## Open questions for the user

- Actual assignment receipt time?
- Product name — "Reforge" is assumed throughout. Confirm or change before the landing page is built.

---

## Session wrap-up ritual

When the user says to wrap up, update in this order, then commit:

1. `project_guidelines/08-mvp-checklist.md` — tick what's genuinely done **and verified on deploy**
2. `docs/PROMPTS.md` / `docs/DEBUGGING.md` — append anything from the session not yet logged
3. `docs/ARCHITECTURE.md` — reflect real structure
4. **This file** — status, next actions, new decisions, new open questions
5. `git commit` with a clear message
