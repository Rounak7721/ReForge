# From a blank folder to a deployed product

How Reforge was built with AI, in the order it actually happened. Timestamps
are real; they come from `git log`.

The short version: **35 commits over roughly 26 working hours across three
days.** Every phase was planned before it was written, reviewed after it was
written, and verified on the deployed URL before it was ticked.

---

## The one decision that shaped everything else

Before any code: the assignment PDF was distilled into
`project_guidelines/`, eight documents that turn a prose brief into
**literal gradeable checklists**. `02-functional-requirements.md` is the seven
required areas as tickboxes; `07-scoring-map.md` maps the 100-point rubric onto
actions.

This mattered more than any individual prompt. The brief was then never
re-read — the checklists were the source of truth, and every feature was
checked against them before it was built. Our own choices are marked
**[OUR DECISION]** so that "required" and "chosen" never blur, which is what
stops scope creep from wearing the costume of a requirement.

`CLAUDE.md` encodes the working agreement itself: plan before building, one
phase at a time, a review gate after each phase, ask before anything
irreversible. The rules were written down because an agent that is told them
once forgets; an agent that reads them every turn does not.

---

## Phase 0 — Scaffold and constraints (25 Aug, 17:18 – 19:18)

`create-next-app` + shadcn, then the constraint work that is easy to skip and
expensive to skip: pinning the model.

The model was chosen by **probing the live API, not by reading marketing
pages**. Two commits an hour apart tell the story — `pin gemini-3.6-flash after
probing the live API`, then `switch runtime model to gemini-3.1-flash-lite on
quota grounds`. The first pick was better at the task. The second pick allowed
**500 requests a day instead of 20**, and 20/day is three complete demos shared
with whoever grades this. Quota beat quality, and only measurement surfaced the
difference.

## Phase 1 — Data and auth (25 Aug, 21:23)

Supabase schema with Row Level Security on from the first migration, not added
later. Auth conventions were fixed here and have not moved since: `getUser()`
everywhere, never `getSession()`; map errors by `error.code`, never by matching
message text.

## Phase 2-3 — The pipeline (26 Aug, 11:46 – 13:10)

The provider layer came **before** the first model call. All model access goes
through `lib/llm`; feature code imports `generateStructured` and never a vendor
SDK. That discipline paid for itself on day three, when code generation was
added on a second vendor without touching the analyzer, builder or editor.

The concept schema was settled by **measurement, not preference**: 42 live
calls comparing nested JSON, XML and flat JSON across build, narrow edit,
structural edit and a depth-stress test. All three scored 100%, so the
assumption that nesting was risky was simply wrong. Nested JSON won on two
secondary grounds. Full write-up in `docs/PROMPTS.md` entry 3.

One schema decision is worth naming because it is counter-intuitive: **array
minimums are 1, not 3.** The schema is shared with the editor, and "remove the
pricing page" is a first-class instruction. `min(3)` on `pages` makes the third
removal unsatisfiable — zod rejects the model's correct answer, the retry
rejects it again, and the user dead-ends having spent two requests. Validity is
the schema's job; richness belongs to the prompt.

## Phase 5-6 — Landing page, demo account, hardening (26 Aug, 13:55 – 14:16)

The seeded demo account is **insurance, not decoration**. The free tier is 500
requests a day shared with the evaluator. If it runs out, a visitor with no
seeded project sees an empty dashboard and an honest error — correct behaviour,
poor demonstration. The seed makes **zero model calls**: every value was
captured from one real pipeline run.

## The redesign (26 Aug, 14:47 – 18:50)

An AI-driven UI audit (`docs/UI-AUDIT.md`) found the app looked like a class
project. Every surface was rebuilt on a dual-theme design system, then the
logo was hand-authored as vector rather than generated.

## Bonus phases (27 Aug, 00:54 – 02:04)

Three phases, each independently shippable, in an order chosen so that stopping
at any boundary still left something complete:

1. **Concept preview** — the concept rendered as a real page. Zero model calls:
   everything a page needs was already in the concept object. It renders into
   an iframe sandboxed with `allow-scripts` and deliberately *without*
   `allow-same-origin`, which is what isolates generated JS from the app's
   cookies and Supabase session.
2. **Screenshot analysis** — a microlink PNG attached to the analyzer call that
   was already happening. No extra quota, because it is the *same* call.
3. **Code generation and iteration** — a complete HTML page from the concept,
   refined in natural language, downloadable. Runs on Groq while the pipeline
   stays on Gemini, so generating pages cannot exhaust the quota analysis
   depends on.

---

## What AI was actually used for

| Used heavily | Used carefully | Not used |
|---|---|---|
| Writing the code, end to end | Model/library choices — probed the live API first | Anything irreversible without asking |
| Planning each phase before writing | Anything security-shaped — reviewed, then re-reviewed | Deciding what to build; the checklists did that |
| Reviewing its own diffs | Verification code — see below | |

The review gate is the part most worth copying. After every phase, an AI code
review ran **against its own diff**. It found real defects a human skim would
not: an alpha hex value producing `#dedbNaN` and silently deleting every border
in the preview; an SSRF where a validated URL was then followed through a
redirect; a rate-limit branch that would tell users to retry something that
could not succeed until tomorrow. Roughly a third of the findings were rejected
as wrong or not worth it — the gate is a source of candidates, not a verdict.

## The lesson that cost the most time

**Verification code is trusted precisely when it says what you hoped to hear,
and it gets no review.**

Four separate times across the project, the *verification* was wrong rather
than the thing being verified: a deploy probe that would have reported success
against the old build; an SSRF result that read as "blocked" but was a network
timeout; a structural test that passed because the fixture never contained the
thing being removed; and, on the last night, an assertion about backticks that
fired falsely because it matched a string in a comment 200 lines above the code
it meant to check.

The habit that came out of it: **read the reason, not the verdict.** When a
check passes, ask what would have made it fail.

Its twin, learned on the last night: when results look non-deterministic,
suspect the test before the system. Three rounds of schema probing appeared to
show intermittent failures. They were not intermittent — the probes were
rebuilding sub-schemas in a way that emitted different JSON, so "the same test
twice" never was.

## What went wrong, honestly

Eleven real failures are logged in `docs/DEBUGGING.md` with the full
Problem → Prompt → Attempt → Debug → Fix trail. The three that generalise:

- **A dependency you do not deploy can still break you.** On the final morning
  `/api/build` and `/api/refine` were failing on every request, in code that had
  been verified working on production and not touched since. Google had
  tightened schema validation server-side. Confirmed by running the same probe
  against an older commit in a git worktree — the fastest way to answer "did I
  break this?" is to ask the code that predates you.
- **The same trap wears different clothes.** Gemini's `maxOutputTokens` caps
  thinking *plus* output, which returns HTTP 200 with no content. Groq's
  `max_completion_tokens` does the same to reasoning models, which returns HTTP
  400 "Failed to generate JSON". Two vendors, two symptoms, one cause — and the
  second cost far less time because the first was written down.
- **Success-shaped failures are the expensive ones.** A generated page arrived
  as valid JSON, a valid string, schema-conformant, `finish_reason: "stop"` —
  and truncated mid-attribute at exactly 10240 characters by the vendor's JSON
  decoder. Every signal said success. The check that caught it asks whether the
  artifact *ends the way that kind of artifact ends*.

## Deployment

GitHub → Vercel, auto-deploying on push to `main` from Phase 2 onward. Deploying
early meant every phase was verified on the real URL rather than on localhost,
which is where the environment-variable and serverless-timeout problems live.
Nothing is ticked on the checklist until it has been verified on production.
