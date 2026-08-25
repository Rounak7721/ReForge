# 02 — Minimum Functional Requirements

Seven required areas. These are **literal checklists from the PDF** — each bullet is a gradeable item. Do not paraphrase them away; a missing bullet is a missing point.

Legend: `[ ]` not built · `[~]` partial · `[x]` done and deployed.

---

## 1. Landing Page

A polished landing page **for our own product** (Reforge), not for the generated concept.

> "It should look like a real startup, not a coding assignment."

Required sections — all nine:

- [ ] Product name / logo
- [ ] Clear value proposition
- [ ] Hero section
- [ ] Product demo / mockup
- [ ] Features
- [ ] How it works
- [ ] CTA
- [ ] Pricing (or sample pricing)
- [ ] Footer

Notes:
- "Pricing **or sample pricing**" — fake but plausible tiers are explicitly acceptable. Don't build billing.
- "Product demo/mockup" can be a screenshot, an embedded loop, or a static mock of the dashboard. It does not have to be live.
- This is the first thing the grader sees. It carries a disproportionate share of the 15 Product-quality points.

---

## 2. AI Product Analyzer

An interface where the user enters:

- [ ] Website URL
- [ ] Product description
- [ ] Target customer

The AI must return **all seven** of these fields:

- [ ] What the existing product does
- [ ] Target users
- [ ] Core problem
- [ ] Key features
- [ ] Business model
- [ ] Suggested improvements
- [ ] Proposed MVP features

> "Use an actual LLM API."

**[OUR DECISION]** These seven fields are the exact shape of the `analysis` zod schema and the analyzer prompt's required JSON keys. Lock the schema to this list.

---

## 3. AI Product Builder

After analysis, a **"Build My Product"** action. The system generates a proposed:

- [ ] Product name
- [ ] Product description
- [ ] Feature list
- [ ] Navigation structure
- [ ] Page structure
- [ ] UI direction

Then the user modifies it through **natural-language instructions**. Verbatim examples from the brief — use these as the demo script and as test cases:

- "Make the design more premium."
- "Add a dashboard."
- "Remove the pricing page."
- "Make it suitable for enterprise customers."

> "The AI should update the proposed product accordingly."

**[OUR DECISION]** These six fields are the exact `concept` zod schema. The Editor returns the **full updated concept object**, not a diff — idempotent and easy to persist.

**[OUR DECISION] The concept schema is structured data, not prose.** `navigation`, `pages` and `uiDirection` are objects/arrays, never sentences. Approximate shape:

```ts
name:        string
description: string
features:    { name, description }[]
navigation:  { label, path }[]
pages:       { name, path, sections: { type, headline, body }[] }[]
uiDirection: { style, mood, palette: { primary, surface, text }, typography }
```

**Why:** prose renders as a paragraph and nothing else, ever. Structured data renders as a nav list, a page outline and a swatch row in the MVP — which already looks better than a field dump — and makes the visual-preview bonus (`05-bonus-features.md` #2/#5) a *new component reading the same object*: no schema change, no migration, no route change.

**The tradeoff:** deeper nested JSON is somewhat less reliable from Flash. Mitigated by zod validation + one stricter retry, which we're building regardless. Stop short of a full component tree in the MVP — moderate structure only.

---

## 4. Backend

A proper backend with:

- [ ] API endpoints
- [ ] Database
- [ ] User/project data
- [ ] AI requests
- [ ] Error handling
- [ ] Environment variables / secrets

Permitted DBs: Supabase / PostgreSQL / Firebase / MongoDB / equivalent.

Note that **error handling and secrets management are named as first-class requirements**, not implied. Every route needs input validation, a try/catch around the LLM call, and a typed error response with a real status code.

---

## 5. Authentication

- [ ] Sign up
- [ ] Login
- [ ] Logout
- [ ] Protected dashboard

Permitted: Supabase Auth / Clerk / Auth0 / equivalent.

Logout is listed explicitly — it's easy to skip and it's a graded bullet. Put it somewhere visible in the dashboard chrome.

---

## 6. Dashboard

Users can:

- [ ] Create a project
- [ ] Enter a website
- [ ] Analyze it
- [ ] View AI-generated results
- [ ] Modify the product concept
- [ ] Save projects
- [ ] Reopen previous projects

"Save projects" + "reopen previous projects" is the persistence requirement — and the thing that makes caching both a cost rule and a graded feature. Reopening must render from the DB.

---

## 7. Deployment

- [ ] Publicly accessible URL

> "We should be able to open a URL and test it **without setting up your development environment**."

Permitted: Vercel / Railway / Render / AWS / GCP / Cloudflare.

Critical consequence: the grader will sign up with their **own** account and run the full flow on our free-tier LLM quota. Two implications:
1. Sign-up must work without email-confirmation friction, or confirmation must be disabled/instant.
2. Rate-limit handling must degrade gracefully — a 429 during their evaluation must show a retry state, not a crash.

Consider seeding a demo account with a pre-analyzed project so there is something to look at even if quota is exhausted.

---

## Coverage check before submitting

Every unchecked box above is a lost point. Walk this file top to bottom against the deployed URL — not against localhost — before recording the video.
