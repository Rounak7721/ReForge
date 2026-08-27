# 06 — Deliverables

Five submissions. Three of them (README, prompt log, debugging log) are **documentation written during development**, not after — the PDF asks for a real trail, and a reconstructed one reads as reconstructed.

---

## 1. Live Product

- [ ] A publicly accessible URL
- [ ] Testable without setting up a dev environment
- [ ] Sign-up works for a brand-new user in incognito

---

## 2. GitHub Repository

- [ ] "Clean, structured and readable"
- [ ] No secrets committed; `.env.example` present and current
- [ ] Small, reviewable commits with clear messages — the commit history is itself evidence of process

---

## 3. Video — 2–3 minutes

Tight budget. Eight required beats, ~20 seconds each. Script it; don't improvise.

- [ ] What you built
- [ ] How it works
- [ ] Architecture
- [ ] AI tools used
- [ ] **How you used Claude/Codex** ← the assignment's centre of gravity
- [ ] One example of debugging
- [ ] What you would build next

Suggested allocation for 3:00 —

| Time | Beat |
|---|---|
| 0:00–0:20 | What it is + the landing page |
| 0:20–1:00 | Live demo: URL in → analysis → Build My Product → one chat refinement |
| 1:00–1:30 | Architecture: 3-call pipeline, swappable LLM layer, Supabase + RLS |
| 1:30–2:20 | **How Claude Code built it** — plan mode, the review gate, a real prompt from `docs/03-prompt-log.md` |
| 2:20–2:45 | One debugging story from `docs/04-debugging-log.md` |
| 2:45–3:00 | What's next (name the un-built bonuses) |

Do the demo on the **deployed URL**, not localhost.

---

## 4. Short Technical README

Nine required sections — all named explicitly in the PDF:

- [ ] Architecture
- [ ] Tech stack
- [ ] Setup instructions
- [ ] Environment variables
- [ ] APIs used
- [ ] Database structure
- [ ] AI models used
- [ ] Deployment process
- [ ] Known limitations

"Known limitations" is a gift — state the free-tier RPM ceiling, the text-only analysis fallback, and the un-built bonuses. Naming your own constraints reads as engineering judgment, not as excuses.

Note: this maps onto our planned `internal/notes/ARCHITECTURE.md`. Keep one canonical source and have the root `README.md` carry these nine sections directly — the graders will look at the repo root, not at `docs/`.

---

## 5. AI Prompt Log

**5–10 of your best prompts.** For each, the PDF requires four things:

- [ ] What you asked the AI to do
- [ ] Why you structured the prompt that way
- [ ] What the AI produced
- [ ] What you changed / fixed afterward

The fourth is the one people skip and the one that demonstrates judgment. "The AI produced X, I rejected Y because Z" is worth more than a prompt that worked first try.

Lives in `docs/03-prompt-log.md`. **Append as you go** — you cannot reconstruct "why I phrased it that way" three days later.

---

## Also required: AI Development Process & Debugging

Listed under the AI Engineering Requirement rather than under Deliverables, but both are explicitly requested:

### AI Development Process
- [ ] "How did you go from a blank folder to a deployed product using AI?"
- [ ] Show the major steps

We literally start from a blank folder — capture the phases as they happen.

### Debugging — "This is important."
- [ ] **At least 2 examples** where AI-generated code failed
- [ ] Each in the format: **Problem → AI prompt → attempted solution → debugging → final solution**

Lives in `docs/04-debugging-log.md`. Log failures the moment they happen. Likely candidates given this stack: malformed LLM JSON, a 429 storm from the chat box, an RLS policy blocking a legitimate read, or the service-role client leaking into a client bundle.

---

## Pre-submission checklist

- [ ] All 7 requirement areas in `02-functional-requirements.md` verified **on the deployed URL**
- [ ] `pnpm lint` and `pnpm build` green
- [ ] No secret in the client bundle
- [ ] Fresh-user sign-up tested in incognito
- [ ] README's nine sections complete
- [ ] `docs/03-prompt-log.md` has 5–10 entries with all four parts each
- [ ] `docs/04-debugging-log.md` has ≥2 full trails
- [ ] Video ≤3 minutes, recorded against production, all eight beats covered
