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

## 3. Testing three output formats before committing to one

**Phase:** Phase 3 (builder/editor) · **Date:** 2026-08-26

### What I asked

> Before starting Phase 3, tell me what you have planned in simple flow diagrams
> and important details. Tell me what it takes in, what it does and what it
> should output exactly. Then stop for my confirmation.

and then, after reviewing it:

> 1. Test if we get a proper, reliable nested JSON response from Flash.
> 2. Also try out XML outputs, see if XML parsing performs better than JSON. If not —
> 3. Use the string-based method.
> Run the tests first, then give me the results. I will confirm which one to move
> forward with.
>
> NOTE: Keep in mind we are likely to add actual starter code and visuals later
> on if time permits, so keep it modular and easy to add on.

### Why I structured it that way

Two separate pieces of leverage, and the second is the one that mattered.

**Demanding the I/O contract before any code.** "What it takes in, what it does,
what it should output exactly" is a request for the interface, not the
implementation. Interfaces are where the expensive mistakes live — if
`/api/refine` returned a patch instead of the full concept, that decision would
have propagated into the route, the persistence, the undo story and the render
path before anyone noticed. Reviewing three short contracts costs minutes;
reversing them costs a phase.

**Refusing to accept a guess as an answer.** I had flagged deep nesting as the
main risk and offered to probe it. The instruction came back as a *ranked
fallback chain* — nested JSON, else XML, else flat strings — with the explicit
sequencing "run the tests first, then give me the results". That framing is what
made the outcome useful: it converted an architectural coin-flip into an
experiment with a pre-declared decision rule, so the result could not be
rationalised after the fact.

The trailing NOTE about starter code and visuals looked incidental and turned
out to be decisive. See below.

### What the AI produced

A three-variant harness (`.probe/`) holding model, temperature, thinking level,
token budget, prompt and zod validation constant, varying only the wire format.
Two rounds, 42 live calls.

**Round 1 produced a false pass.** All three variants scored 2/2 on "remove the
pricing page" — but the diagnostic line read `hadPricing=false`. The generated
concepts had never contained a pricing page, so the instruction removed nothing
and the check passed vacuously. A green summary row was measuring nothing at all.

Round 2 fixed it by seeding a fixture concept that definitely contained a pricing
page and nav item, and added the additive case ("add a dashboard") plus a
depth-stress build. Final result: **42/42, no failures, no format distinguishable
on correctness.**

### What I changed / fixed afterward

**Caught and re-ran the vacuous test.** This is the part worth keeping. The
harness reported success, and the reported number was true — 2/2 trials passed.
It was the *test* that was wrong, not the result, and nothing in a pass rate can
tell you that. Only the `hadPricing=false` field printed alongside it could.
Round 1's structural numbers were discarded.

**The decision moved off the measured axis entirely.** The experiment was
designed to find a reliability difference and found none. Rather than declaring
the tie meaningless, the tiebreak came from the NOTE about future starter code
and visuals: nested `sections: {type, headline, body}[]` renders directly as
visual blocks and maps onto generated components, whereas flat `sections:
string[]` would need re-parsing or a schema migration to do the same. XML was
eliminated on a different ground — Gemini enforces `responseJsonSchema` on the
wire and offers no equivalent for XML, so its clean sweep was unguarded luck
rather than a guarantee, and it emitted 2.2x the characters of flat JSON.

**One real caveat surfaced and was not smoothed over:** under depth stress the
nested variant returned 5 pages where XML and flat returned 7. n=1, so it is a
signal rather than a finding, and it is fixable in the prompt — but it is the
only asymmetry in 42 calls and it argued *against* the recommendation, so it went
into the report rather than being dropped.

## 4. Ordering the review before the code that would depend on it

**Phase:** Phase 2 (analyzer) · **Date:** 2026-08-26

### What I asked

After the analyzer's server half was built and I had offered either to review it
or to carry straight on to the UI:

> Run code review first, then move towards the frontend.

### Why I structured it that way

The whole content of this prompt is the word **first**, and it overrides the
option I had leaned toward.

The server half was the load-bearing part: `lib/llm`, the site fetcher and
`/api/analyze`. The frontend was about to be written against all three. Reviewing
after the UI existed would mean any structural finding — a changed error shape, a
different route contract — invalidates work that already depends on it. Reviewing
at the seam means findings are still free.

There is a second reason specific to this diff, and it is the one that paid off.
The site fetcher takes an arbitrary user-supplied URL and requests it from inside
our own infrastructure. That is the highest-risk code in the project, and it is
the kind of risk that does not announce itself in a passing test — the feature
works perfectly whether or not the guard is correct.

### What the AI produced

Seven findings, all real. Two were genuine security holes:

- **`redirect: "follow"` defeated the SSRF guard entirely.** `assertPublicUrl`
  validated only the URL the user typed; `fetch` then followed a 302 anywhere it
  liked. A public URL redirecting to `169.254.169.254` would have been fetched,
  sent to Gemini and persisted.
- **The private-range check only matched dotted-quad IPv4.** `http://2130706433/`,
  `http://127.1/` and `http://0x7f000001/` are all 127.0.0.1 and all passed.

Plus five correctness bugs, including a `maxDuration` of 60s sitting below the
handler's own 78s worst case, and a `name === "TimeoutError"` branch that was
dead code because the Gemini SDK aborts with no reason.

### What I changed / fixed afterward

All seven fixed — but the part worth recording happened while **verifying** the
fixes, not while applying them.

I rewrote the guard to resolve the hostname and check the resolved addresses
rather than pattern-match the literal, then re-ran the attack list. Every case
came back `BLOCK`. It would have been entirely reasonable to stop there.

Reading the *reasons* rather than the verdicts, one line did not fit:

```
BLOCK v4-mapped v6 metadata
      That site took too long to respond.
```

Every other case said `That host can't be analyzed.` — the guard's message. This
one said the fetch had timed out, which meant **the request had actually gone
out**. The guard had failed and a network timeout was impersonating a block.

The cause: the WHATWG URL parser canonicalises `::ffff:169.254.169.254` into hex
as `::ffff:a9fe:a9fe`, so the dotted-quad regex I had written for v4-mapped
addresses never matched. I replaced spelling-matching with an actual IPv6
byte-parser, which removed the entire class rather than that one encoding.

I then added a case the review had not raised and my own list had missed: a
**public hostname whose DNS resolves to a private address** (`169.254.169.254.nip.io`).
That is the realistic version of this attack, and only the resolve-then-check
design catches it. It passes now.

**Two things I would carry forward.** First, a fix is not verified by the fixes
passing — it is verified by the *right thing* causing them to pass, and only the
failure reason distinguishes those. A pass rate cannot tell you that a block was
really a timeout. Second, the residual gap got written into the source rather
than quietly left: this is resolve-then-fetch, not resolve-then-pin, so DNS
rebinding is still open, and closing it needs a pinned-IP connection that `fetch`
does not expose. An honest comment about a known limit is worth more than silence
that reads like full coverage.

## 5. "Keep nothing from testing" — cleanup as a first-class instruction

**Phase:** Phase 2 → 3 boundary · **Date:** 2026-08-26

### What I asked

> OK push it. Also we will create a demo account later on, no need to keep
> anything from testing right now. What's the next step?

### Why I structured it that way

Three instructions compressed into two lines, and the middle one is the
interesting one.

It is a *pre-authorisation for a destructive action* — deleting live rows from
the production database — issued before the action came up, which is exactly
when such permission is cheap to grant and safe to reason about. It also settles
a question I had raised the turn before (whether to promote the test account into
the required demo account) by deciding the opposite: build the demo account
deliberately later, don't inherit one by accident. Test data that survives into a
graded submission looks like carelessness even when it is harmless.

### What the AI produced

A push to `main`, an auto-deploy, and a production smoke test as a brand-new
user: signup → analyze → seven fields → reopen with zero `/api/` calls → logout →
deep-link redirect preserving `next`.

Two things went wrong on the way, and neither was in the application code.

**A probe of mine reported a deploy that it had not actually verified.** I polled
`/dashboard/new` expecting a redirect to prove the new route existed. It printed
`DEPLOY LIVE` after 15 seconds — but middleware guards `/dashboard/*` and
redirects whether or not the page exists, so the probe would have said the same
thing against the old build. I discarded it and confirmed the deploy from the
browser instead, where the old code was distinguishable by a disabled button.

**Two Playwright screenshots had been committed to the repo root.** 365KB of test
artifacts in a repo whose cleanliness is itself graded. They surfaced only
because `security-review` prints the file list of the diff it is reviewing, and
`loading.png` and `project.png` were sitting in it.

### What I changed / fixed afterward

**I enumerated before deleting.** Rather than issuing the `delete` the
instruction authorised, I first listed every account with its project count. Two
rows, both mine, one project each, no third-party data. Only then did the delete
run, and it was followed by a count query confirming `users 0, projects 0,
refinements 0` — proving the cascade had worked rather than assuming it. Blanket
permission to delete is not permission to delete without looking; the enumeration
is what makes the deletion safe rather than merely authorised.

**I removed the screenshots and closed the hole that let them in.** `.playwright-mcp/`
was already git-ignored, but I had passed bare filenames to the screenshot tool,
so they landed in the working directory instead. Deleting them fixes today; a
`/*.png` ignore rule fixes the next time, since the same mistake is easy to
repeat.

**The lesson is about my own instrumentation.** Both failures were in code I
wrote to *check* things, not in the thing being checked — a probe that measured
the wrong signal and a screenshot call that wrote to the wrong place. Verification
tooling gets no review and no tests, and it is trusted precisely when it says
what you were hoping to hear.

## 6. Handing over a design task with full autonomy — and three quality bars

**Phase:** Phase 5 (landing page) · **Date:** 2026-08-26

### What I asked

> OK, proceed with Phase 5. It's a designing task, so proceed with full
> autonomy. Make sure everything fits exactly in its place, looks clean and
> professional, and is secure.

Earlier in the same thread, a constraint that turned out to decide the schema:

> Keep in mind we are likely to add actual starter code and visuals later on if
> time permits, so make sure to keep it modular and easy to add on.

### Why I structured it that way

"Full autonomy" on a *design* task is a different instruction from full autonomy
on an implementation task, and it is the right call here. Design is where
round-tripping is most expensive: describing a layout in prose and waiting for
approval costs more than building it and looking at it, because neither party
can evaluate a landing page from a description. Handing over the whole decision
— palette, type, structure, copy — and reviewing the artifact is strictly faster
than approving a plan for one.

But autonomy without a bar produces something plausible and generic. So the
prompt carries three, and they are deliberately different in kind:

- **"fits exactly in its place"** — a *measurable* bar. Not "looks tidy" but
  something that can be checked with numbers, which is what made it actionable.
- **"clean and professional"** — a taste bar, unavoidably subjective.
- **"is secure"** — a bar that does not obviously apply to a static marketing
  page, which is exactly why stating it was useful.

### What the AI produced

A spec-sheet direction derived from the product itself: Reforge emits typed,
labelled, structured data, so the page is built the same way — mono keys, visible
rules, one accent, and section markers written as paths (`/how`, `/pricing`)
because paths are literally part of the product's output. Three type roles
(Archivo display, Geist body, Geist Mono data) and no more.

The signature element is the hero panel, and it is the honest choice: not a stock
mockup but the product's **real output in its real shape** — a `linear.app`
teardown becoming a solo issue tracker. It doubles as the required "product
demo/mockup", which means the demo cannot drift from what the product does.

All nine required sections, verified present on the deployed URL.

### What I changed / fixed afterward

**The measurable bar did the most work.** "Fits exactly in its place" converted
into an actual assertion — every pricing card's label, price and CTA must share a
pixel top — and three rounds of screenshot critique found real faults that
reading the code would not have: the headline orphaned "pieces." on a line of its
own, the CTAs failed to bottom-align because the tiers have different item
counts, and the "POPULAR" badge pushed the featured card's content down 2px
against its neighbours. All three were invisible in the markup and obvious in a
screenshot.

**The security bar found the one real risk.** A static marketing page has almost
no attack surface — but the header is auth-aware, and an auth-aware page that
gets statically cached serves one visitor's session state to another. Checking
the build output confirmed `ƒ /` (dynamic), so Next had correctly opted out.
Worth noting that this is a *tradeoff I made and would flag*, not a free win: the
landing page now costs a server render per visit to gain that behaviour.

**I deliberately spent the freedom against the defaults.** AI design clusters
around cream-and-terracotta serif, black-with-acid-green, and broadsheet
hairlines. Naming those upfront and refusing all three is what stopped the
"clean and professional" bar from resolving to "templated".

**The throwaway constraint outranked the explicit ones.** The note about starter
code and visuals was appended almost as an afterthought, and it decided the
concept schema: nested `sections: {type, headline, body}[]` renders directly as
visual blocks, whereas the flat `string[]` alternative — which was *faster and
smaller in every measurement* — would have needed a migration to do the same. The
measured winner lost to a stated future requirement, which is the correct
ordering and would not have happened if that sentence had been treated as
incidental.
