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

---

## 7. Naming the reference class instead of describing the aesthetic

**Date:** 2026-08-26 · **Phase:** frontend redesign

### What I asked

After I offered three named design-skill options and asked which to use, the
answer deliberately refused all three and deferred:

> wait for me to tell you and provide you with some referencing designs to work on.

then, an hour later:

> I want it to look something like v0, Lovable, Replit. Current UI is too simple.
> If we are intending to make this a startup page we should have it look like an
> actual good startup page with all the UI enhancements, loaders, animations, to
> make it attractive and feel like a real product instead of just some plain old
> generic demo. We should consider adding bg images, logos, gradients, stylish
> buttons. […] Make the app light and dark theme toggleable and it should be able
> to take up the default system theme as well as have a toggle option. You have
> full autonomy so do not stop in between.

### Why I structured it that way

I had asked the wrong question. My options were *"which skill should drive
this"* — an implementation detail — when the answer that actually constrains the
work is *"what should it look like"*. Three named products carry more usable
information than any adjective I could have offered: they fix the surface
treatment (gradients, glass, depth), the motion budget, the density, and the
tone, all at once and without ambiguity.

The refusal to pick from my list was the most useful part. It is also why the
right response to "which of A/B/C" is sometimes "none, here is the real input".

### What the AI produced

Reading the references rather than the adjectives changed two decisions that
the literal wording would have gotten wrong:

1. **"Gradients" did not mean a purple/blue gradient.** The `redesign-existing-projects`
   skill flags the purple-blue AI gradient as *the* fingerprint of generated
   design, and every generic AI SaaS demo uses it — so following the word
   literally would have produced exactly the "generic demo" look the request was
   trying to escape. I used an **ember/copper** accent instead: semantically
   tied to the name (*Re-forge*), warm like Lovable, and distinct from v0's
   monochrome. One accent, used sparingly.
2. **"Background images" had no source.** No image generation was available, no
   asset pipeline exists, and zero recurring cost is a hard project constraint,
   which rules out CDN-hosted stock. Rather than block on it or ship broken
   `<img>` tags, I built the depth out of CSS: a fixed three-orb radial mesh, an
   SVG `feTurbulence` grain overlay, and masked hairline grids. Zero bytes, zero
   dependencies, no asset to go missing.

Ten surfaces were rebuilt on a dual-theme token system with a three-state
(light/system/dark) control, plus a visual diff for refinements.

### What I changed / fixed afterward

Three things the model got wrong that only showed up when driven in a browser:

- **`ButtonIcon` was themed to the page, not the button.** It used
  `bg-black/8 dark:bg-white/12`, but the primary button *inverts* with the theme —
  so in dark mode it rendered a white well on a white button and vanished. Fixed
  by tinting from `currentColor`, which is correct for every variant at once.
- **White-on-ember measured 2.23:1.** `--ember` is dark in light mode and light
  in dark mode, so a hardcoded `text-white` could only ever pass in one of them.
  Added an `--ember-contrast` token that flips with the theme; now 5.06 / 8.61.
- **The `.safe-top` class silently deleted `pt-24`** — see `DEBUGGING.md` entry 7.

The pattern across all three: each was invisible in one theme or one viewport
and perfectly fine in the other, which is precisely the class of bug that a
single-theme design process never surfaces. Asking for both themes was what made
them findable.

---

## 8. Making the verification prove itself before trusting it

**Date:** 2026-08-26 · **Phase:** frontend redesign

### What I asked

Twice during the redesign, a check reported failure and I asked for the cause
rather than applying a fix:

> 11 of 19 never revealed. Let me find the actual reason rather than assume.

> Five failures, all the same element — and the ratio of exactly 1.0 is
> suspicious. My parser only handles `rgb()`, but these compute to `oklch()`.
> Let me resolve colours properly before trusting this.

### Why I structured it that way

`HANDOFF.md` carries a standing warning from an earlier session: three separate
times, **the verification step was wrong rather than the thing being verified** —
and it is trusted precisely when it says what you hoped to hear. A failing
result deserves the same suspicion as a passing one; the difference is that a
false failure costs you a fix you did not need, while a false pass ships a bug.

Both suspicious results had a tell. "11 of 19 hidden" was too many to be a real
regression when the visible ones worked. A contrast ratio of *exactly* 1.0 means
foreground and background resolved to the same value, which almost always means
a parser returned a default rather than a measurement.

### What the AI produced

Both were verification bugs, and both would have caused real damage if believed:

- **The scroll-reveal check** used `window.scrollTo` while `html` had
  `scroll-behavior: smooth`, so every step queued an animated scroll that never
  landed and the page never reached the lower sections. Re-run with
  `behavior: 'instant'`: **19/19**. Had I "fixed" this, I would have removed the
  `IntersectionObserver` for a broken-by-design always-visible fallback and lost
  the entry animation across the whole site.
- **The contrast audit** matched only `rgb()`/`rgba()` with a regex, but the
  design system is authored in `oklch()`. Unparseable colours fell through to a
  white default, producing ratio 1.0 against white text. Rewritten to resolve
  any CSS colour through a 1×1 canvas.

The corrected audit then found a **real** failure that the broken one had buried
in noise: white-on-ember at 2.23:1.

### What I changed / fixed afterward

I kept the canvas-based resolver as the standard method for the rest of the
pass and re-ran it across both themes and all three surfaces (page, shell,
core), reporting the *worst* ratio per token rather than a spot check. That
turned up a second genuine failure the first version missed — `--faint` at 4.37
against the raised surface in light mode — which a single-surface check would
have passed.

Final state: every text token ≥ 4.5:1 against every surface in both themes,
worst case 4.69.

**The lesson, restated:** a broken checker does not fail loudly — it produces
*plausible* numbers. The defence is not more checks, it is asking "what would
this look like if the checker itself were wrong?" before acting on a result.

---

## 9. "Did I break this, or was it already broken?"

**Phase:** Bonus phases · **Date:** 2026-08-27

### What I asked

After a refine request started failing during a routine regression walk, in the
middle of a diff that had touched the Gemini provider:

> Before debugging this: did I break it, or was it already broken? Check out the
> commit before tonight's work in a separate worktree and run the same probe
> against the same API key. Tell me which.

### Why I phrased it that way

The failing request was `400 Request contains an invalid argument` — a message
that names neither the offending field nor its path. The diff in flight had
edited exactly the file that builds that request, adding an optional `image`
part. Every instinct, mine and the model's, pointed at the new code.

The prompt exists to **refuse the plausible explanation until it is tested**.
"Did I break this" is a cheap question with a binary answer, and answering it
wrong costs an hour of debugging the wrong file. A git worktree makes the test
almost free: the previous commit is still on disk, the API key is the same, and
the probe is ten lines.

The phrasing matters in one more way. It does not ask "is my change correct" —
which invites the model to review the diff and find something plausible to
blame. It asks for a *measurement against a control*.

### What the AI produced

A worktree at `a2c9dc5`, symlinked `node_modules`, the same probe:

```
PRE-PHASE conceptSchema: FAILED {"error":{"code":400,...,"status":"INVALID_ARGUMENT"}}
```

Identical failure on code that predated every line written that night. The new
`image` branch was innocent. Google had tightened `responseJsonSchema`
validation server-side, so `/api/build` and `/api/refine` had been broken in
production for hours with no deploy, no commit, and no alert.

### What I changed and why

Nothing about the answer — but the investigation that followed had to be
redirected twice more, and both redirects came from the same instinct.

The next four hypotheses (schema size, `propertyOrdering`, the wrong response
field, API flakiness) were all wrong, and the fifth round produced *apparently
inconsistent* results: the same trivial schema failed once and then passed three
times. That looked like a flaky API and nearly ended the investigation there.

It was not flaky. The probes were rebuilding sub-schemas with fresh
`z.object({...})` calls, which emit different JSON than slicing the real schema
— so "the same test twice" never was. **When results look non-deterministic,
suspect the test before the system** is now written into `HANDOFF.md` next to
the older lesson it rhymes with.

What finally worked was abandoning hypotheses entirely and enumerating: dump
every JSON Schema keyword actually present, then remove them a group at a time.
Two keywords each "fixed" it alone, which is the whole shape of the bug —
Gemini rejects `minItems`/`maxItems` **when the same schema also contains an
`enum`**. Full trail in `docs/DEBUGGING.md` entry 9.

---

## 10. Rejecting the model's own explanation because a number was too round

**Phase:** Bonus phase 2 (code generation) · **Date:** 2026-08-27

### What I asked

A generated page rendered fine and then ended mid-attribute. The first
explanation offered was that the model had simply stopped — `finish_reason` did
say `"stop"`. The prompt that broke it open:

> `finish_reason` says stop and the document is exactly 10240 characters. That
> is 10 × 1024 — too round to be a model choice. Test whether other models on
> the same tier truncate at the same number, with the same prompt.

### Why I phrased it that way

The evidence genuinely supported the wrong conclusion. HTTP 200, valid JSON, a
schema-conformant string, `finish_reason: "stop"` — every signal available said
the request succeeded and the model chose to end there. Accepting that would
have led to prompt tuning, which is exactly what I tried first and which made
things *worse*: instructing "keep the document under 11000 characters" produced
a longer broken page, because a cap phrased as a limit makes the model spend its
budget and stop mid-tag.

`10240` is what refused to fit. Models do not stop on power-of-two boundaries;
buffers do. The prompt names the specific observation that contradicts the
explanation, and then asks for a **comparison across models** rather than an
opinion — because if it is a platform cap, other models on the same platform
will hit the same wall, and if it is a model choice, they will not.

### What the AI produced

```
qwen/qwen3.8-27b     out_tok=3338  chars=10240  ends_with_</html>=false
openai/gpt-oss-20b   out_tok=3000  chars=2979   ends_with_</html>=true
openai/gpt-oss-120b  out_tok=2390  chars=3757   ends_with_</html>=true
```

Groq's JSON-schema decoder caps a string value at 10240 characters, closes the
JSON cleanly around the stump, and still reports `"stop"`. A platform limit
wearing a model's clothes.

### What I changed and why

Two things, because the model choice alone would have been a fix that expires.

Pinned `openai/gpt-oss-120b` — complete documents in a third of the output
tokens, which also leaves room for an edit inside the same per-minute budget.

But a model choice is not a guarantee, so the *schema* now enforces the
property that was silently violated:

```ts
.refine((html) => html.trimEnd().endsWith("</html>"), {
  message: "The document is incomplete — it must end with a closing </html> tag.",
})
```

A truncated page now fails validation and routes into the existing stricter
retry rather than being persisted. The generalisable rule, and the reason this
entry is here: **for anything generated in one shot, assert on the closing
condition** — every other signal will tell you it worked.

The instruction changed too, from a character cap to *"the last characters you
write must be the closing `</html>` tag"*. Asking for a shorter page produced a
longer broken one; asking for a finished page produced a shorter complete one.
