# AI Prompt Log

Deliverable 5 (see `project_guidelines/06-deliverables.md`). **5–10 best prompts**, each answering all four questions the brief requires.

Maintained by Claude, continuously. Entries are appended the moment a prompt proves notable — typos fixed, all four sections filled in at write time. Nothing here is left for a later manual pass.

Format for every entry:

```
## N. <Short title>

**Phase:** <which MVP phase> · **Date:** <YYYY-MM-DD>

### What I asked
> <the prompt, verbatim, typos corrected>

### Why I structured it that way
<the reasoning — constraints stated up front, output shape pinned, why this framing over the obvious one>

### What the AI produced
<what came back, including anything wrong or over-scoped>

### What I changed / fixed afterward
<the edit, and why. This is the section that shows judgment — never leave it as "nothing">
```

---

<!-- entries appended below -->

## 1. Verifying scope by restating it back, before writing any code

**Phase:** Phase 0 (pre-bootstrap) · **Date:** 2026-08-25

### What I asked

> Before starting any code I want some clarification — tell me if I got it right:
> 1. User wants to create a similar product to what actually exists. So he pastes in the reference website URL and provides the description of the product he wants and the target consumers or users.
> 2. These 3 are then sent to the AI analyzer layer which parses through the HTML code that is scraped off the URL entered, to understand the structure of the website, and gets the textual data off it.
> 3. Then again sends all of this to an LLM that takes this information and the description provided by the user and creates a plan? And displays it to the user for confirming the building of the product.
> 4. Once confirmed it should actually write the code, test the outputs and provide the user with the website in an iframe but ability to export the entire codebase? Or just textual data, or screenshots, etc.
> 5. After that open up a user chat panel where the user can interact and provide instructions for adjustments.

Followed by:

> OK got it, so the MVP is completely text based, no real website or any kind of visuals, just a simple web scraper and chat bot? If we view it from a bird's eye view. But we should build it in a way that even if we wanted to render some visual output later on if time provides, we can do that with minimal changes and refactoring.

### Why I structured it that way

Numbered restatement rather than "explain the requirements to me." Asking the model to *explain* the brief produces a summary that agrees with itself and hides nothing. Asking it to *check a specific wrong understanding* forces a per-step verdict, and disagreement becomes visible.

The five steps were deliberately stated as beliefs, including the one I was least sure about (step 4). Committing to a claim gives the model something to falsify. A neutral question would have gotten a neutral answer.

The follow-up added the real constraint — *build so visual rendering is cheap later* — as a separate turn, after scope was settled. Mixing "what is it" and "how should it be built" in one prompt tends to get one of them answered properly and the other hand-waved.

### What the AI produced

A per-step verdict against `project_guidelines/02-functional-requirements.md`, confirming steps 1, 2, 3 and 5 and rejecting step 4 outright: the required MVP produces a **structured product concept** (6 fields), not a codebase. Code generation, iframe preview, test execution and export are bonuses #2/#3/#5/#6 in `05-bonus-features.md` — the expensive ones, and out of scope until the required flow is deployed.

Two corrections I had not asked for and did not expect:

- **Two display gates, not one.** I had assumed analysis → confirm → build. In fact the analysis renders as a finished artifact the user reads, and "Build My Product" is a *separate* action producing a second artifact. Getting this wrong would have collapsed two graded requirements into one screen.
- **The analyzer does not parse DOM structure.** It fetches HTML, strips to text, truncates to a token budget. The seven fields describe the *product*, not the site. Understanding the UI is the vision bonus.

It also pushed back on my "web scraper and chat bot" framing: Reforge itself has substantial visual surface (a 9-section landing page, auth, dashboard), and the chat is an editing control over a typed object, not a message stream — building it as a transcript would lose points on requirement 3.

On the refactor-safety question it named one load-bearing decision: **the concept schema must be structured data, not prose.** If the builder returns `navigation: "Home, Features, Pricing"`, that renders as a paragraph forever; returning `[{label, path}]` means the MVP renders a real nav list and the preview bonus becomes one new component on the same object — no schema change, no migration, no route change.

### What I changed / fixed afterward

I accepted the scope correction and locked the structured schema, then made three edits so the decision survives past this conversation:

1. Added an `[OUR DECISION]` block to `02-functional-requirements.md` §3 with the concrete shape (`features[]`, `navigation[]`, `pages[].sections[]`, `uiDirection` as design tokens rather than a sentence) — because a decision that lives only in chat history is a decision the next session relitigates.
2. Bounded it. The model presented structured JSON as straightforwardly better; it is not free. Deeper nesting is measurably less reliable from Flash, and this project has no paid-tier fallback. I recorded the tradeoff explicitly and capped it at *moderate* structure — structured nav and pages, tokenised UI direction, **no full component tree in the MVP**. The reliability cost is paid by zod validation plus one stricter retry, which was already planned.
3. Rejected the implied ordering. Building toward the preview bonus is only correct if it costs nothing now. I kept the constraint as "render as a pure function of the concept object, keep DB changes additive" and left every bonus behind the deployed-MVP gate in `05-bonus-features.md`. Cheap future-proofing is judgment; building for it at 48 hours is how the required flow ships late.

The genuinely valuable output here was not the confirmation of the four steps I had right — it was the rejection of the one I had wrong. Step 4 as I described it is several days of work that the brief never asks for.
