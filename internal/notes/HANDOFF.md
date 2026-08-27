# HANDOFF

**Read this first in every new session.** It is the fastest path back to full
context.

_Last updated: 2026-08-27, end of the documentation and hardening session.
**Everything is built, deployed and verified. One deliverable remains: the
video.**_

---

## Where things stand

| | |
|---|---|
| Production | **https://reforge.rounak.co** (fallback `reforge-blond-two.vercel.app`) |
| Demo login | `demo@reforge.app` / `reforge-demo-2026` — public on purpose |
| GitHub | `Rounak7721/ReForge` — `main` is pushed and clean |
| Supabase | `zqyahkyigokbxmufpxpj`, migrations 0001–0003 applied |
| Working tree | Clean |

```
required       42 / 42     verified on the deployed URL
bonuses         6 / 7      #4 multi-agent reframed as a paid tier, not cut
deliverables    4 / 5      VIDEO OUTSTANDING
```

**There is no deadline pressure left.** The 48h mark passed; the video is being
recorded deliberately rather than in a rush.

---

## The video is done

Published: **https://youtu.be/yT_LptZCr4A** · 4:42 · linked from the README.

All production material lives **outside this repo**, in
`~/Work/Job_Tasks/Reforge-demo-edit/`, deliberately — a public repository does
not need the shot list, the narration audio or the editing project:

| | |
|---|---|
| `notes/video-script.md` | shot list, per-clip narration, timings |
| `notes/video-diagrams.md` | Mermaid source for the five slides, and the shared diagram style |
| `render/Reforge-demo-narrated.kdenlive` | the finished timeline |
| `speech/` + `PLACEMENT.md` | 27 narration WAVs and where each one sits |
| `assets/` | app screenshots, logo files, YouTube copy |
| `build_timeline.py`, `make_srt.py`, `make_music.py`, `make_thumbnail.py` | regenerate it all |

The diagrams in `README.md`, `docs/01` and `docs/02` are copies of the blocks in
`video-diagrams.md`. That file is still canonical for the shared theme and the
shape and line-type conventions; it just no longer ships in the repo.

---

## What happened this session

Twelve commits.

### Repository restructure

The root showed working material before it showed the product. Now:

- `docs/` is a **closed set** of exactly the four topics the brief names.
  Do not add a fifth file there.
- `internal/` holds the brief, the nine requirement checklists and these notes.
- Every document in `docs/` and the root `README.md` is written in **ASD-STE100
  Simplified Technical English** with Mermaid diagrams. Match that register.

### Rate limiting

`/api/analyze` allows 10 an hour and 30 a day; `/api/refine` allows 30 and 100.
**Raised from 3/10 and 10/40 on 2026-08-27** — the analyze hourly cap of 3 was
binding during a normal session with retakes.
Counted from the `projects` and `refinements` tables — no counter table, because
those rows are already timestamped and already scoped by RLS. Verified on
production for zero quota by inserting rows directly.

**Why it exists:** the README publishes working credentials, and the free Gemini
tier is 500 requests a day shared by everyone. Without a cap, anyone reading the
README could strand the evaluator in about a minute.

### Custom domain

`reforge.rounak.co`, live. Cloudflare **DNS-only** CNAME to Vercel — the orange
cloud blocks the certificate Vercel issues. Both origins are in the Supabase Auth
redirect allow-list.

### Docker and Makefile

`make env && make docker-up` runs the app anywhere. 322 MB image, non-root,
read-only root filesystem. Verified running, not just building.

### Diagrams

23 Mermaid blocks across the repo, all sharing one pinned theme and one set of
shape and line-type conventions. The canonical source is
`Reforge-demo-edit/notes/video-diagrams.md`, **outside this repo** — edit there,
then copy outward into `README.md`, `docs/01` and `docs/02`.

---

## Decisions already made — don't relitigate

### From this session

- **Multi-agent is a paid tier, not a cut.** The argument order matters:
  latency first (5 chained calls is ~3 minutes per click, and iteration is the
  point), then compounding unreliability, then cost. Slower-but-deeper describes
  a tier, not a default. Shipped as the Studio tier on the landing page.
- **`docs/` is closed.** Four files, the topics the brief names. Working
  material goes to `internal/notes/`.
- **The prompt log holds only the HUMAN's prompts.** Four entries were removed
  because they were Claude's own slash commands and reasoning. Five real ones
  beat ten with impostors. The `prompt-log` skill now states this rule.
- **Every diagram pins its full theme.** GitHub renders in the viewer's theme,
  and a partially-pinned diagram goes dark-on-dark. Two line types only: solid
  is the normal path, dotted is optional or rejected. No `==>`.
- **Cloudflare stays DNS-only** for the `reforge` record.
- **`lib/supabase/browser.ts` is deleted, and its absence is load-bearing** —
  with no browser client the anon key never reaches the client bundle, which is
  what the Dockerfile's claims depend on. Adding one changes that.
- **No Google sign-in before submission.** It touches the one flow requirement 5
  is scored on, and the OAuth consent screen has a turnaround you do not control.

### Still standing from earlier sessions

- Reopening a saved project renders from the DB and **never** re-calls a model.
- `getUser()` everywhere, never `getSession()`. Map Supabase errors by `code`.
- Email confirmation stays **off**. Turning it on caps signups per hour
  project-wide and fails closed.
- `.gitignore` patterns must be root-anchored (`/build/`, not `build/`).
- Any new dependency with an install script needs `allowBuilds` set, or
  `pnpm install` exits 1 and silently breaks lint and build.
- Route Handlers, not Server Actions.
- The preview iframe is `allow-scripts` **without** `allow-same-origin`, plus
  `<base href="about:srcdoc">`. Both are load-bearing; see debugging entry 12.
- SSRF guard is resolve-then-fetch; DNS rebinding is a documented residual.

---

## Database state

| Account | Projects |
|---|---|
| `demo@reforge.app` | 1 — "Soloist" from a linear.app teardown, 2 refinements, plus a generated starter site |
| `rounaks7721@gmail.com` | 2 — your own, deliberately left alone |

No orphans. `pnpm seed:demo` restores the demo account with **zero model calls**.

---

## The pattern this project keeps rediscovering

**Verification is trusted exactly when it says what you hoped, and it gets no
review.** Six occurrences now, the last two this session:

| The check said | The truth |
|---|---|
| The deployment succeeded | The probe read the old build |
| The SSRF attempt was blocked | The request timed out on the network |
| The structural edit works | The fixture never held the item to remove |
| The preview frame did not navigate | A `srcdoc` frame never sets `src`; the check could not fail |
| The rate limiter is broken | The stub read `gte()`'s first argument, which is the column name |
| The diagrams are fine | One had never rendered; nobody had rendered them |

The habit: **read the reason, not the verdict.** When a check passes, ask what
state would make it fail. When something looks non-deterministic, suspect the
test before the system.

---

## Open questions

1. **Voiceover: your own, or synthetic?** The script recommends your own with
   burned-in subtitles either way — the largest scoring category is your account
   of how you used the AI, and that reads better in a person's voice. Not
   decided.
2. **Delete the recording accounts afterwards?** Harmless to leave; deleting
   returns the database to demo + your own.

---

## Session wrap-up ritual

Run the **`wrap-up`** skill. In order: `08-mvp-checklist.md` → `docs/03` and
`docs/04` → root `README.md` → **this file** (rewrite, don't append) → commit
and push.
