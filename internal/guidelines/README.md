# Project Guidelines

A condensed, point-wise working reference distilled from the assignment PDF (10 pages, held outside this repository). Build against these docs instead of re-reading the PDF.

Everything here is faithful to the PDF. Our own choices — decisions the brief leaves open, or constraints stricter than it requires — are marked **[OUR DECISION]** so the line between "required" and "chosen" never blurs.

| Doc | Contents | Read when |
|---|---|---|
| [01-assignment-brief.md](01-assignment-brief.md) | Objective, the challenge, the 7-step product flow, time limit, the live-change final test | Start here; re-read before planning any phase |
| [02-functional-requirements.md](02-functional-requirements.md) | The 7 required areas as literal gradeable checklists | Before building any feature; again before submitting |
| [03-tech-stack.md](03-tech-stack.md) | PDF's suggested stack, our locked choices + justification, cost rules, env vars, bootstrap commands | Before scaffolding; before adding any dependency |
| [04-execution-flows.md](04-execution-flows.md) | Core loop, the 3-call AI pipeline, failure modes, auth/routing, deploy flow | Before implementing routes or the dashboard |
| [05-bonus-features.md](05-bonus-features.md) | All 7 bonuses with effort/verdict and a recommended order | Only after the required flow is deployed |
| [06-deliverables.md](06-deliverables.md) | The 5 submissions + video script + pre-submission checklist | Day one (to start the logs), and at the end |
| [07-scoring-map.md](07-scoring-map.md) | The 100-point rubric mapped to concrete actions; time allocation | Whenever two tasks compete for time |
| [08-mvp-checklist.md](08-mvp-checklist.md) | **The live task tracker** — 7 phases, frontend + backend, ticked as work happens | Every session; this is state, everything else is reference |
| [09-tooling.md](09-tooling.md) | MCP servers, skills and subagents this project needs — and what to disable | Session start; before installing anything |

## The three things most likely to be forgotten

1. **35 of 100 points are process documentation** — the prompt log, the debugging log, and the video. Write `docs/03-prompt-log.md` and `docs/04-debugging-log.md` continuously; they cannot be reconstructed convincingly at the end. See [07](07-scoring-map.md).
2. **Deploy early.** Deployment is worth 10 points and the grader must be able to use the app without touching our dev environment. A public URL on day one beats a perfect localhost.
3. **The free-tier rate limit is a product constraint, not just an ops one.** Cache in Postgres, cap output tokens, serialize chat requests, and handle 429s as a first-class UI state. The grader will run our quota down. See [03](03-tech-stack.md).

## Relationship to CLAUDE.md

`CLAUDE.md` is the working agreement — how to work in this repo (plan mode, review gate, conventions, definition of done). These docs are *what* to build and *why*. When they disagree about a requirement, the PDF as captured here wins; when they disagree about process, `CLAUDE.md` wins.
