---
name: wrap-up
description: End-of-session ritual — update the MVP checklist, logs, architecture docs and internal/notes/HANDOFF.md, then commit. Use when the user says to wrap up, end the session, "we're done for today", or asks to hand off.
---

# wrap-up

Leave the repo so the next session — with no memory of this conversation — can resume in one file read.

Work through these in order. Do not skip a step because "nothing changed there"; check, then say it's unchanged.

## 1. `internal/guidelines/08-mvp-checklist.md`

Tick boxes for what is genuinely done. The bar is **done and verified on the deployed URL**, not "done locally" or "basically working".

- `[x]` done & verified on deploy
- `[~]` in progress
- `[-]` cut — and add the reason inline

If something was cut this session, record why. A reasoned cut is a product-thinking signal; an unexplained gap reads as unfinished work.

## 2. `docs/03-prompt-log.md` and `docs/04-debugging-log.md`

Review the session for anything not yet logged. Apply the `prompt-log` and `debug-log` skills.

These should already be current — both skills say to log in the same turn the material appears. This step is the safety net, not the main path. If there's a lot to catch up on here, that's a process failure worth noting in HANDOFF.

## 3. `internal/notes/ARCHITECTURE.md` and root `README.md`

Update to reflect what actually exists — real routes, real schema, real model IDs. Not intentions.

Once application code exists, the root `README.md` needs all nine sections from `internal/guidelines/06-deliverables.md`: architecture, tech stack, setup, env vars, APIs used, database structure, AI models used, deployment process, known limitations.

## 4. `internal/notes/HANDOFF.md` — the important one

This is the first file the next session reads. Write it for someone with **no memory of this conversation**. Rewrite the sections rather than appending:

- **Last updated** — today's date
- **Where things stand** — current phase, production URL, GitHub repo, Supabase project status
- **What exists right now** — a short tree; be honest about what's scaffolded vs working
- **Next actions, in order** — numbered, specific enough to act on without re-deriving context. "Wire the refine route to the concept view" not "continue Phase 3"
- **Decisions already made — don't relitigate** — carry forward the existing list and add anything decided this session
- **Open questions for the user** — anything blocking or assumed

Delete anything that's no longer true. A stale handoff is worse than a short one.

## 5. Commit

```bash
git add -A
git commit -m "<clear message describing the session's work>"
```

Include the `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` trailer.

Repo is **local only** until the MVP works. Ask before the first push to GitHub — after which Vercel connects to the repo for CI/CD auto-deploy.

## Finally

Tell the user in a few lines: what got done, what's next, and anything that needs their decision before the next session starts.
