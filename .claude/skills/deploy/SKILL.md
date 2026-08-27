---
name: deploy
description: Vercel deployment checklist for this project — preflight, env vars, smoke test on production. Use before any deploy, when the user asks to deploy or ship, or when setting up the Vercel project and GitHub CI/CD connection.
---

# deploy

Deployment is worth **10 points** — the same as all of frontend engineering. A polished app that isn't publicly reachable scores worse than a plain one that is.

The grader opens the URL cold, signs up with their own account, and runs the flow on our free-tier quota. Everything below exists to survive that.

**Ask before running `vercel` or promoting to production.** Deploys are outward-facing.

## Preflight — all must pass

```bash
pnpm lint     # green
pnpm build    # green
```

- [ ] No `any` in the diff
- [ ] `.env.example` includes every variable the code now reads
- [ ] No secret inlined anywhere; nothing sensitive prefixed `NEXT_PUBLIC_`
- [ ] Service-role Supabase client not imported by any Client Component
- [ ] `security-review` run if this deploy touches auth, RLS, or env handling

## Env vars

Every var in `.env.example` must exist in the Vercel project **before** deploying — a missing one fails at runtime, not at build, which means it looks fine until the grader clicks something.

Current set (see `internal/guidelines/03-tech-stack.md`):

```
LLM_PROVIDER                        # gemini
GEMINI_API_KEY
GEMINI_MODEL                        # confirm current free Flash ID in AI Studio
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY           # server-only — never NEXT_PUBLIC_
MICROLINK_API_KEY                   # bonus only, optional
```

Verify the list against `.env.example` rather than against this file — this one goes stale.

## Deploy

```bash
vercel          # preview — ASK first
vercel --prod   # promote — ASK first
```

Once the MVP works and the repo is on GitHub, connect Vercel to the repo so pushes to `main` auto-deploy. After that, deploying is `git push` and this checklist applies to the push.

## Smoke test — on the deployed URL, not localhost

Do this in a **fresh incognito window as a brand-new user**. This is exactly what the grader does, and it's the only way to catch a broken sign-up or a missing env var.

- [ ] Landing page renders; all nine sections present
- [ ] Sign up works — no email-confirmation dead end
- [ ] Create a project, enter a real URL, analyze — all 7 analysis fields render
- [ ] "Build My Product" — all 6 concept fields render
- [ ] One chat refinement visibly changes the concept
- [ ] Log out, log back in, reopen the project — renders from DB, **no LLM call** (check the network tab)
- [ ] Log out works
- [ ] Responsive at 375 / 768 / 1440
- [ ] Browser console clean of errors

## Failure paths — test these too

The grader will hit them.

- [ ] Unreachable URL → friendly error, nothing persisted
- [ ] Rate limit (429) → "rate limited, retrying" state, not a crash
- [ ] Direct navigation to `/dashboard` while logged out → redirects to login

## After deploying

- [ ] Record the production URL in `internal/notes/HANDOFF.md`
- [ ] Tick the relevant boxes in `internal/guidelines/08-mvp-checklist.md` — only now do they count as verified
- [ ] Consider seeding a demo account with one pre-analyzed project, as insurance against quota exhaustion during grading
