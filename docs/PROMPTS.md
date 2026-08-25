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

## 2. Running the review gates on my own code, and acting on what they said

**Phase:** Phase 1 (Database & Auth) · **Date:** 2026-08-25

### What I asked

Two skill invocations against the finished Phase 1 diff, per the working agreement in `CLAUDE.md` ("After a phase, run the `code-review` skill on your own diff and surface its findings"):

> /security-review

> /code-review medium

### Why I structured it that way

The interesting choice is *when*, not *what*. Both gates ran **after** the feature worked end to end in a browser but **before** the commit — the point where the code is complete enough to review honestly and still cheap to change. Running them earlier reviews a strawman; running them after commit turns findings into follow-up work that competes with the next phase.

Splitting security from general review also matters. `security-review` is told to hunt exploitable vulnerabilities and suppress style noise; `code-review` is told to find correctness bugs. Asking one reviewer for both tends to produce a list sorted by *ease of spotting* rather than by *impact*. Run separately, the security pass surfaced an auth-adjacent issue that a general review would likely have filed under "minor input validation".

### What the AI produced

**`security-review`** found one genuine vulnerability I had written and not noticed — an open redirect in `components/auth/auth-form.tsx`:

```ts
router.replace(next && next.startsWith("/") ? next : "/dashboard");
```

`startsWith("/")` reads as "same-origin path only" and isn't. `//evil.com` starts with a slash and is a *protocol-relative URL*, so the browser navigates off-origin. The attack is nasty precisely because everything legitimate about it is real: the victim gets `https://<our-domain>/login?next=//evil.com`, authenticates successfully on the genuine site, and is then handed to an attacker page styled as our dashboard asking them to re-enter their password.

**`code-review`** found four more, three in `lib/supabase/middleware.ts`:

- Both redirect branches returned a fresh `NextResponse.redirect`, **discarding the rotated auth cookies** `getUser()` had just written. A user whose token refreshed while hitting `/login` would be silently logged out on their next request. The file's own header comment warned about this exact failure mode — and the code below it did the thing the comment warned against.
- The unauthenticated branch never cleared `url.search`, so a deep link's own query string was lost across login.
- The seven `create policy` statements were the only non-idempotent lines in an otherwise re-runnable migration; a re-apply would abort partway and leave later policies unapplied.

### What I changed / fixed afterward

All five fixed, but two decisions went beyond applying the suggestions.

1. **I generalised the redirect fix rather than patching the reported string.** The review flagged `//evil.com`. I extracted `lib/safe-redirect.ts` covering the whole class — protocol-relative forms, backslash variants (`/\evil.com`, which browsers normalise to forward slashes), absolute URLs, `javascript:` schemes, and control-character smuggling (a tab or newline after the leading slash, which browsers strip before parsing) — then re-resolved through `new URL()` against a throwaway origin and asserted the origin hadn't changed. Then I wrote 19 test cases, including the legitimate paths that must still pass, and ran them. A fix for one payload is a patch; a fix for the class, with evidence, is a fix.

2. **I applied it in a second place the review didn't mention.** `lib/supabase/middleware.ts` builds the `next` parameter from `request.nextUrl.pathname` — and a request to `https://host//evil.com` has pathname `//evil.com`. The sink was reported; the *other source feeding it* wasn't. Reviews find instances, not necessarily every reachable path to them.

3. **On the migration, I went further than idempotency.** The reviewer noted `create policy` would fail on re-run. Fixing that exposed a worse latent problem: migration `0001` created `set_updated_at()` as `SECURITY DEFINER` (Supabase's own advisor had flagged it as anon-callable via `/rest/v1/rpc/`, and `0002` remediated the live project). Making `0001` re-runnable would have meant a file that is safe to replay *and* reintroduces a fixed vulnerability when replayed. So I corrected `0001` in place and documented why — accepting a small divergence from strict historical fidelity in exchange for a migration set that is safe to run from scratch.

**What I'd take from this:** the most valuable finding was in code whose own comment described the bug it contained. I had written the warning about discarding rotated cookies, and then discarded them nine lines later. Self-review does not catch that — the comment reads as evidence the case is handled, so the eye moves on. An independent pass with a different objective does.
