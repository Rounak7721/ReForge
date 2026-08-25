# 09 — Required Tooling (MCPs, Skills, Subagents)

Deliberately minimal. **MCP servers are expensive in context** — every enabled server's tool schemas are loaded into every request. On a project this size, an unnecessary server costs more than it gives.

Current state audited from `~/.claude/settings.json` and `~/.claude.json`.

---

## MCP servers

### Keep — enabled and needed

| Server | Status | Why it's necessary |
|---|---|---|
| **context7** | ✅ enabled (plugin) | Next.js 15 App Router, `supabase-js` v2, and `@google/genai` all have APIs that changed recently. Recalling signatures from memory is the single most likely source of wasted debugging time. Non-negotiable for this stack. |
| **playwright** | ✅ enabled (plugin) | QA phase only — drive the **deployed** app to verify flows, and generate real material for `docs/DEBUGGING.md`. Also covers bonus #7 (Automated QA) nearly for free. |

### Add — missing and genuinely useful

| Server | Status | Why |
|---|---|---|
| **supabase** | ❌ not configured | Schema, migrations, RLS policies, and seeding are a meaningful slice of Phases 1–4. Doing this through the MCP server rather than the dashboard keeps DB changes in the transcript, which feeds `docs/PROMPTS.md`. **Recommended.** Install: `claude mcp add supabase` (needs a Supabase access token). |

If adding it proves fiddly, the fallback is the Supabase CLI plus SQL files committed under `supabase/migrations/` — arguably better for the "clean repo" deliverable anyway. Decide once, early; don't do both.

### Disable for this project

| Server | Status | Why |
|---|---|---|
| **obsidian** | ⚠️ enabled globally | 17 tools of pure context overhead. Nothing in this project touches a vault. |
| **claude.ai Google Drive** | ⚠️ present, unauthenticated | Not authorized in this session and not needed. Leave unauthorized. |

> Note: Google Drive and any other claude.ai connector can't be authorized from a non-interactive session — that's done in claude.ai connector settings. Not needed here regardless.

---

## Skills

### Already available — use these

| Skill | When |
|---|---|
| **frontend-design** | Phase 5 landing page, and the concept-rendering UI. Directly targets the 15 product-quality points; the whole risk on that requirement is "looks like a coding assignment," which is exactly what this skill exists to prevent. |
| **code-review** | The review gate after every phase. Replaces the `reviewer` subagent that `CLAUDE.md` referenced but that never existed. |
| **security-review** | Once before the first deploy, once before submission. This project has three specific exposures worth a targeted pass: service-role key leaking clientward, RLS gaps, and secrets in the client bundle. |
| **run** | Launching the app and screenshotting it during QA. |

### Not needed — don't reach for them

`dataviz` (no charts), `claude-api` (we're on Gemini, not Anthropic, at runtime), `design`/`artifact-*` (deliverables are a repo and a video, not artifacts), `schedule`/`loop` (no recurring work), `keybindings-help`, `update-config` (only if MCP setup needs it).

### Create — project-specific, worth the 10 minutes

These automate rituals that are otherwise easy to skip under deadline pressure, and three of them defend graded deliverables.

| Skill | Purpose |
|---|---|
| **`prompt-log`** | Append a prompt to `docs/PROMPTS.md`: fix typos, then answer all four required questions inline. Enforces the "nothing left for later manual review" rule. |
| **`debug-log`** | Append a failure to `docs/DEBUGGING.md` in Problem → Prompt → Attempt → Debug → Fix format, at the moment it happens. |
| **`wrap-up`** | End-of-session ritual: update the MVP checklist, docs, and `HANDOFF.md`; commit. |
| **`deploy`** | Vercel + env-var checklist so no deploy ships with a missing variable. |

---

## Subagents

**None required.** `CLAUDE.md` originally referenced `reviewer` and `qa-tester` subagents that were never created. The `code-review` skill covers the first; `playwright` + `run` cover the second. Don't build subagents for a 48-hour project — the setup cost exceeds the benefit, and each spawn starts cold and re-derives context already in this session.

---

## Summary

- **Enabled and correct:** context7, playwright
- **Add:** supabase MCP (or commit to the CLI + migrations fallback)
- **Disable:** obsidian
- **Skills to use:** frontend-design, code-review, security-review, run
- **Skills to create:** prompt-log, debug-log, wrap-up, deploy
- **Subagents:** none
