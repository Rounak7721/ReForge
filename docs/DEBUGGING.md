# Debugging Log

Deliverable: **at least 2 examples** where AI-generated code failed. The brief marks this "This is important." Worth 10 points.

Maintained by Claude, logged at the moment of failure — not reconstructed afterward.

Required format for every entry:

```
## N. <Short title>

**Phase:** <which MVP phase> · **Date:** <YYYY-MM-DD>

### Problem
<the observed symptom — error text, wrong behaviour, what the user saw>

### AI prompt
> <the prompt that produced the broken code>

### Attempted solution
<what the AI generated and why it looked correct>

### Debugging
<how the real cause was found — the actual steps, dead ends included>

### Final solution
<the fix, and the underlying reason it works>
```

Log the failure **before** fixing it. A fixed bug with no record is a lost point.

Likely candidates for this stack: malformed LLM JSON surviving into `JSON.parse`, a 429 storm from the un-debounced chat box, an RLS policy blocking a legitimate read, the service-role client reaching a Client Component, or a Next.js 15 async-API change.

---

<!-- entries appended below -->

## 1. Geist font silently falling back to serif — a circular CSS variable

**Phase:** Phase 0a (bootstrap) · **Date:** 2026-08-25

### Problem

The placeholder landing page built and rendered with a clean console — 0 errors, 0 warnings — but every glyph on the page was **serif**. Expected Geist (the sans-serif shipped by `create-next-app` and assumed by the shadcn `nova` preset).

Nothing surfaced it. `pnpm lint` was clean, `pnpm build` was clean, the browser console was clean. CSS custom properties that fail to resolve do not raise errors — the declaration is simply dropped and the browser falls back. It was only caught by taking a screenshot and looking at it.

### AI prompt

Not a single prompt — this came from **composing two code generators**, which is the more interesting failure mode:

```bash
npx create-next-app@15 reforge --typescript --tailwind --eslint --app ...
pnpm dlx shadcn@latest init --base radix --preset nova --yes
```

Each tool is correct on its own. `create-next-app` writes `app/layout.tsx` and `app/globals.css` as a matched pair; `shadcn init` then **overwrites `globals.css`** with its preset and leaves `layout.tsx` untouched. Neither tool knows the other ran.

### Attempted solution

The first read of the damage looked obvious. `globals.css` referenced `--font-sans`:

```css
@theme inline {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
}
```

while `layout.tsx` declared the font under a different name:

```ts
const geistSans = Geist({ variable: "--font-geist-sans" });
```

Diagnosis: a name mismatch — shadcn wants `--font-sans`, Next named it `--font-geist-sans`. Fix: rename in `layout.tsx` so both sides agree on `--font-sans`.

This was plausible, it made the two files consistent, and it was **wrong**. It also *looked* like it worked, because the page had been serif before the change and was still serif after — no new symptom to notice.

### Debugging

The rename didn't help, which was the useful signal: if a pure name mismatch were the cause, aligning the names would have fixed it.

Ruled out first, cheaply:

- **Geist failing to download.** Ruled out — `next/font/google` self-hosts at build time; a fetch failure fails the build, and the build was green.
- **A stale Turbopack cache.** Ruled out — the serif survived a fresh `pnpm build`, not just dev.
- **shadcn's preset intentionally being serif.** Ruled out by grepping the emitted CSS: the preset targets `--font-sans`, it does not define a serif stack.

Then tracing what actually applies to the page:

```bash
grep -n "font" app/globals.css
```

```
10:  --font-sans: var(--font-sans);
128:    @apply font-sans;
```

Line 128 is `html { @apply font-sans }` — the whole document resolves `font-family: var(--font-sans)`. Line 10 looked like a smoking gun: after my rename, `@theme inline` was emitting `--font-sans: var(--font-sans)`, **a variable defined as itself**. That is a cycle under the CSS custom-property spec, so the property computes to the guaranteed-invalid value and `font-family` is dropped.

So I un-did the rename — `layout.tsx` back to `--font-geist-sans`, `globals.css` mapping `--font-sans: var(--font-geist-sans)`. One direction, no cycle.

**Still serif.** Second dead end.

At that point I stopped reasoning about the CSS and asked the browser what it had actually computed, via Playwright:

```js
const cs = getComputedStyle(document.documentElement);
const bs = getComputedStyle(document.body);
({
  htmlFontFamily:      cs.fontFamily,                              // "Times New Roman"
  varOnHtml_geistSans: cs.getPropertyValue('--font-geist-sans'),   // ""  <-- empty
  varOnBody_geistSans: bs.getPropertyValue('--font-geist-sans'),   // "Geist", "Geist Fallback"
  bodyClass:           document.body.className,                   // geist_..._variable ...
  htmlClass:           document.documentElement.className,         // ""
})
```

There it was, and it had nothing to do with naming. `create-next-app` puts the `next/font` variable classes on **`<body>`**. shadcn's preset applies `font-sans` to **`<html>`**. CSS custom properties inherit *downward* — `<html>` cannot see a variable defined on its own child. So on `<html>`, `--font-geist-sans` is empty, `--font-sans` resolves to nothing, `font-family` is dropped, and the browser applies its default serif. `<body>` then inherits that broken `font-family` from `<html>`, which is why the *entire* page was serif even though `<body>` had the variable all along.

Both earlier hypotheses were about *what the variables were called*. The actual fault was *where they were declared*. The name-matching theory was seductive precisely because the names genuinely didn't match — it just wasn't why the page was serif.

### Final solution

Move the font variables up to `<html>`, so the element that consumes them can see them:

```tsx
// app/layout.tsx
<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
  <body className="antialiased">{children}</body>
</html>
```

with `globals.css` keeping the one-directional mapping:

```css
@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

Verified by computed style rather than by eye — `getComputedStyle(document.documentElement).fontFamily` now returns `Geist, "Geist Fallback"` instead of `"Times New Roman"`.

**Three lessons worth carrying forward:**

1. **A broken CSS variable is invisible to every gate we have.** Lint, type-check, build and console were all clean, because dropping an unresolvable declaration is specified behaviour, not an error. Only rendering the page and looking at it caught this. `pnpm build` passing is necessary, not sufficient — visual verification is now part of the phase checklist.
2. **Two plausible fixes in a row can both be wrong.** Both of mine were coherent stories about variable *names*; neither was tested against what the browser had actually computed. Reading `getComputedStyle` at the start would have cost thirty seconds and skipped both dead ends. Inspect the runtime before theorising about the source.
3. **When two scaffolding tools write into the same files, the seam is where the bugs live.** `shadcn init` overwrites `globals.css` and leaves `layout.tsx` untouched; neither tool knows the other ran. That seam deserves a deliberate check rather than a green build's benefit of the doubt.

## 2. Gemini returns HTTP 200 with no content — thinking tokens eat the output budget

**Phase:** Phase 2 prep (model selection) · **Date:** 2026-08-25

### Problem

Probing candidate models with a minimal structured-output call, two of them came back **HTTP 200 with an empty result**:

```
gemini-3.5-flash   http=200  bad payload: Expecting value: line 1 column 1 (char 0)
gemini-3.6-flash   http=200  bad payload: Expecting value: line 1 column 1 (char 0)
```

No error status, no error message, no malformed JSON to catch. A 200 with nothing in it.

Worse than the symptom is the shape of the response:

```json
{ "candidates": [ { "content": {}, "finishReason": "MAX_TOKENS", "index": 0 } ] }
```

`content` is an empty object — there is no `parts` array at all. The obvious accessor, `response.candidates[0].content.parts[0].text`, does not return `undefined` here; it throws `TypeError: Cannot read properties of undefined`. Every SDK example writes it exactly that way.

### AI prompt

Not a prompt to a coding model — this is a **project constraint colliding with model behaviour**. `CLAUDE.md` states, as a hard cost rule:

> **Set `maxOutputTokens` on every call.** Keep prompts lean.

The probe followed that rule literally, with a deliberately tight budget:

```json
"generationConfig": { "maxOutputTokens": 300, "responseMimeType": "application/json", "responseSchema": { ... } }
```

### Attempted solution

The first read was that the schema was at fault — that `responseSchema` with a nested `ARRAY` of `STRING` was rejected, and the model returned nothing rather than violate it. Plausible: the same call against `gemini-2.5-flash` had failed a moment earlier, so "something about this request is malformed" was the live hypothesis.

It was wrong, and it would have sent me to rewrite the schema — which is the part of the design we had just deliberately locked as *structured, not prose* (see `docs/PROMPTS.md` entry 1). A wrong diagnosis here would have unwound a good decision.

### Debugging

`finishReason: "MAX_TOKENS"` was the thread to pull. A schema rejection would not report a token limit. So the model hadn't refused — it had run out of room.

But the budget was 300 tokens and the expected answer was roughly 20. Dumping the full response body explained it:

```json
"usageMetadata": {
  "promptTokenCount": 14,
  "totalTokenCount": 298,
  "thoughtsTokenCount": 284
}
```

**284 of the 300 tokens went to thinking.** Gemini 3.x flash models reason before answering, and `maxOutputTokens` is the ceiling on *thinking + output combined*, not on output alone. The model thought until it hit the cap, then had nothing left to emit — so it returned a candidate with no `parts`.

Confirmed by controlled comparison, holding everything else fixed:

| model | config | thoughts | output | result |
|---|---|---|---|---|
| `gemini-3.6-flash` | `max=300` | 284 | 0 | **empty** |
| `gemini-3.6-flash` | `max=2000` | 291 | 21 | valid JSON |
| `gemini-3.6-flash` | `max=300`, `thinkingLevel: "low"` | **0** | 16 | valid JSON |

Two independent fixes, which confirms the diagnosis: raise the ceiling above the thinking cost, or stop the thinking.

A useful negative result came out of the same sweep — `thinkingLevel: "low"` is **not** uniformly honoured:

| model | `thinkingLevel: "low"` → thoughts |
|---|---|
| `gemini-3.6-flash` | 0 |
| `gemini-3.5-flash` | 291 |
| `gemini-3.1-flash-lite` | 101 |

So the parameter cannot be treated as a portable "disable thinking" switch across the family. That matters directly for `lib/llm`, whose entire premise is that swapping the model is an env change: a budget that is safe on one Flash model silently returns nothing on its sibling.

### Final solution

Three changes, all in the provider layer rather than in feature code:

1. **Pin `gemini-3.6-flash` with `thinkingConfig: { thinkingLevel: "low" }`.** Thinking goes to zero, so `maxOutputTokens` means what the cost rule assumes it means, and the budget can stay lean without risking an empty response.
2. **Floor the token budget.** `generateStructured` enforces a minimum `maxOutputTokens` well above any plausible thinking cost, so that a future model swap that ignores `thinkingLevel` degrades to "slower and pricier" rather than "silently returns nothing".
3. **Never index into `parts` blind.** The provider treats a missing `content.parts` as a typed error carrying `finishReason`, before zod ever sees the payload:

```ts
const parts = response.candidates?.[0]?.content?.parts;
if (!parts?.length) {
  throw new LLMEmptyResponseError(response.candidates?.[0]?.finishReason);
}
```

`finishReason: "MAX_TOKENS"` then surfaces as a *distinct* error from a rate limit or a schema-validation failure, which is what makes it debuggable in production instead of a generic 500.

**Why this was worth catching now rather than in Phase 2:** every gate we have would have passed it. The HTTP status is 200. There is no error object. `tsconfig` has `noUncheckedIndexedAccess`, which forces the optional chaining above — but only if the code is written to expect absence, and no SDK example is. This would have shipped as an intermittent crash that appears only under a tight token budget, which is exactly the configuration the cost rules push us toward.

**The general lesson, and it echoes entry 1:** the project's own constraint was the trigger. "Keep `maxOutputTokens` lean" is correct for cost and wrong for reasoning models, and nothing in the rule as written flags the interaction. Constraints inherited from an older model generation need re-testing against the model actually being used, not assumed forward.

## 3. Signup returns 502 "Something went wrong" — and Supabase's email limit makes it worse

**Phase:** Phase 1 (Database & Auth) · **Date:** 2026-08-25

### Problem

Driving the signup form with Playwright against `localhost:3000`, submitting a valid-looking email and an 17-character password:

```
POST /api/auth/signup  ->  502 Bad Gateway
UI:  "Something went wrong. Please try again."
```

The generic message is the symptom, not the bug. Something upstream failed and our error mapper had no idea what it was, so it fell through to its catch-all. A user seeing this has no idea whether to fix their input, wait, or give up — and neither did I.

### AI prompt

The mapper was written from this instruction in `CLAUDE.md`:

> Every API route: validate input, wrap the LLM call in try/catch, return typed error JSON with a proper status.

I implemented `lib/api/supabase-auth-error.ts` to translate Supabase `AuthError`s into our own envelope, matching on lowercased message substrings — `"invalid login credentials"`, `"already registered"`, `"rate limit"` — with `upstream_error` (502) as the fallback.

### Attempted solution

The fallback looked like good defensive design: never leak an unrecognised upstream message to the browser, always return *something* typed. It passed review, passed the build, and passed lint.

The flaw is that a catch-all fallback is indistinguishable from a bug. Every unmapped case silently becomes "502, something went wrong" — which is exactly what happened, and which tells the user and the developer nothing.

### Debugging

The UI could not say what went wrong, so I stopped reading our code and asked Supabase directly, bypassing the whole Next.js layer:

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"phase1-signup2@reforge.test","password":"reforge-test-8899"}'
```

```json
{"code":400,"error_code":"email_address_invalid",
 "msg":"Email address \"phase1-signup2@reforge.test\" is invalid"}
```

**First finding:** Supabase rejects `.test` domains outright. My test address was the problem — but our mapper turned a clear, actionable HTTP 400 ("that email is invalid") into an opaque HTTP 502 ("something went wrong"), which is a genuine defect in our code regardless of the test address.

Retrying with a plausible domain to confirm the mapping theory produced something much worse:

```json
{"code":429,"error_code":"over_email_send_rate_limit",
 "msg":"email rate limit exceeded"}
```

**Second finding, and the serious one.** Supabase's built-in email service is rate-limited to a handful of messages per hour on the free tier. With email confirmation enabled, **every signup sends an email**, so once that tiny limit is spent, signup stops working entirely for everyone — returning 429 with no path forward.

`02-functional-requirements.md` notes the grader "will sign up with their **own** account". If they arrive after a few test signups have consumed the hourly allowance, the very first thing they touch fails. That is requirement 5 — sign up / login / logout — failing outright, on the graded deployment, for a reason invisible in our logs.

Both findings share a root: `error_code` was sitting in the response the whole time. The mapper was matching on `message` substrings — brittle, locale-dependent, and blind to the machine-readable field right next to it.

### Final solution

Two changes, one to the code and one to project configuration.

**1. Match on `error_code`, not message substrings.** `AuthApiError` carries a stable `code` field; the human-readable `message` is not an API contract. The mapper now switches on `error_code` first and falls back to substring matching only for older errors that lack it:

```ts
switch (error.code) {
  case "email_address_invalid":    return apiError("invalid_input", "That email address isn't valid.");
  case "over_email_send_rate_limit":
  case "over_request_rate_limit":  return apiError("rate_limited", "…");
  case "user_already_exists":      return apiError("email_taken", "…");
  …
}
```

**2. The catch-all now logs.** `console.error` with the code and status on every unmapped error, so the *next* unknown case is diagnosable from server logs instead of requiring a curl session against the upstream API. The user still gets a safe generic message; we get the detail.

**3. Email confirmation must be off.** This was already on the checklist as a UX nicety — "avoid a confirmation dead end". It is not a nicety. With it on, the free tier's email allowance is a hard cap on how many people can ever sign up per hour, and it fails closed. Turning it off means `signUp` returns a session immediately, sends no email, and touches no rate limit.

**What this changes about how I write error mappers:** a fallback branch that returns a generic message *and* logs nothing is a place where bugs go to hide. It converts a specific, fixable upstream error into an indistinguishable blob, and it does so silently — passing every gate we have. If a catch-all exists, it must record what it caught.

## 4. Installing the Gemini SDK broke `pnpm lint` and `pnpm build` — and would have broken the deploy

**Phase:** Phase 2 (analyzer) · **Date:** 2026-08-26

### Problem

The first command of Phase 2 was `pnpm add @google/genai node-html-parser`. It
reported success:

```
dependencies:
+ @google/genai 2.19.0
+ node-html-parser 9.0.1
```

and then, four lines later:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @google/genai@2.19.0, protobufjs@7.6.5
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

The packages were installed and importable, so this read as advisory. It was
not. Every subsequent script died before running:

```
$ pnpm lint
[ERROR] Command failed with exit code 1: ... pnpm.mjs install
pnpm: Command failed with exit code 1
```

`pnpm` runs a dependency-status check before any script, that check re-runs
`install`, and `install` exits 1 while an ignored build is undeclared. So
`pnpm lint` and `pnpm build` were both dead — and the same would have happened
inside Vercel's build step, turning a green local session into a failed deploy.

### AI prompt

No prompt produced this. It came from the approved plan's own dependency line:

> `pnpm add @google/genai@^2.19.0 node-html-parser@^9.0.1`

which is the failure worth recording: the plan specified the *right* packages
and said nothing about the package manager's policy gate, because nothing in
the previous phases had tripped it. `create-next-app` had pre-declared `sharp`
and `unrs-resolver` in `pnpm-workspace.yaml`, so the mechanism existed from day
one and had simply never been exercised by a hand-added dependency.

### Attempted solution

The obvious move is the one the error message names: `pnpm approve-builds`.
That is wrong here for two reasons, neither visible from the error text.

It is interactive — a TUI checklist — so it cannot run in this environment at
all. And more importantly it decides the question by clicking rather than by
looking: it would have approved both scripts sight-unseen, which is exactly the
posture a supply-chain gate exists to prevent. "Make the error go away" and
"decide whether this package should execute code on my machine" are different
tasks, and the CLI's suggested fix conflates them.

`pnpm` had also already written placeholders into `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  '@google/genai': set this to true or false
  protobufjs: set this to true or false
```

That literal string is not a boolean, so the file stayed in a failing state
until answered — the gate is deliberately un-ignorable.

### Debugging

The first hypothesis was that the two packages genuinely needed their build
steps and that `false` would break them at runtime — `protobufjs` in particular
sounds like something that compiles. Guessing either way was unacceptable, so
the question became: *what do these scripts actually do?*

Reading them directly was harder than expected. `require('@google/genai/package.json')`
throws `ERR_PACKAGE_PATH_NOT_EXPORTED` — the package's `exports` map does not
expose its own manifest — and `protobufjs` is a transitive dependency, so it has
no top-level `node_modules` entry either; it lives under
`node_modules/.pnpm/protobufjs@7.6.5/`. Reading the files off disk by path
rather than through the module resolver:

```
@google/genai   {'preinstall': "echo 'preinstall: no-op'"}
protobufjs      {'postinstall': 'node scripts/postinstall'}
```

The Gemini SDK's script is a literal no-op — an `echo`. It exists to satisfy
tooling, and blocking it changes nothing. `protobufjs`'s postinstall is its CLI
convenience step, which matters for `pbjs`/`pbts` codegen; nothing in this
project imports either, and the runtime library works without it.

So the hypothesis was inverted: the risk was never that `false` breaks these
packages, it was that reflexively approving them normalises running arbitrary
install-time code to silence an error.

### Final solution

Declare both explicitly as `false` in `pnpm-workspace.yaml`, with the reasoning
recorded next to the decision rather than in a commit message:

```yaml
# @google/genai — its only install script is a literal `echo 'preinstall: no-op'`.
# protobufjs — postinstall is a CLI convenience step; nothing we import needs it.
# Leaving any of these unset makes `pnpm install` exit 1, which breaks every script.
allowBuilds:
  '@google/genai': false
  protobufjs: false
  sharp: false
  unrs-resolver: false
```

`pnpm lint` and `pnpm build` went green immediately.

**Why this works rather than merely passing:** the gate is not asking whether
the package is trustworthy, it is asking whether its *install script* is load-
bearing. For a library consumed only through its runtime API, the answer is
almost always no, and `false` is both the safer and the correct answer — not a
workaround for it.

**The lesson, and it is a deploy lesson more than a dependency one:** a warning
printed *after* a success line is easy to read as advisory, and this one silently
disabled the two commands that gate every commit. The tell was that `pnpm lint`
failed with an error about `install`, not about ESLint. When a script fails
citing a different command than the one invoked, the problem is upstream of the
script — and here that upstream sits between a green local session and a failing
Vercel build.

### Addendum, 2026-08-26 — the same gate, the opposite answer

Adding `tsx` in Phase 6 pulled in `esbuild` and tripped this identically:
`pnpm seed:demo` died with the same `install` error, and I had silenced the
`pnpm add` output so the warning went unseen a second time.

The interesting part is that the conclusion above — "for a library consumed
through its runtime API the answer is almost always `false`" — looked wrong
here. `esbuild`'s postinstall is `node install.js`, which fetches and links its
**native binary**. Blocking that sounds like breaking the tool.

Rather than reason about it, I set `false` and ran `tsx`:

```
$ pnpm exec tsx -e 'console.log("tsx works:", 1+1)'
tsx works: 2
```

It works because pnpm installs the platform package (`@esbuild/linux-x64`) as an
optional dependency, so the binary is already present and `install.js` is
redundant. `false` is both correct and safer.

**Why this is worth appending rather than filing separately:** the original
entry's rule of thumb would have produced the right answer for the wrong reason,
and a rule that happens to be right is indistinguishable from one that is right
until it isn't. The rule is not "libraries don't need their install scripts" —
it is "check what the script actually does, then verify by blocking it". The
second half is what made this one safe.


## 5. The retry hint lied — a loading state that silently emptied the form

**Phase:** Phase 2 (analyzer UI) · **Date:** 2026-08-26

### Problem

Submitting an unreachable URL correctly produced a 422 and the intended error
state:

> **Couldn't read that site**
> We couldn't reach that site. Check the URL and try again.
> *Your answers are still here — press Analyze to try again.*

The last line was false. The accessibility snapshot taken immediately after the
failure shows all three inputs empty:

```yaml
- textbox "Website URL" [ref=f3e31]:
- textbox "What do you want to build?" [ref=f3e35]:
- textbox "Who is it for?" [ref=f3e38]:
- paragraph [ref=f3e42]: Your answers are still here — press Analyze to try again.
```

A user who mistypes a domain — the single most likely failure in this flow —
loses a URL, a paragraph of product description and a target customer, and is
told by the UI that they didn't. The message actively discourages them from
noticing before they click.

### AI prompt

Self-inflicted, from the approved plan's own wording for this component:

> **`components/analyze/analyze-form.tsx`** (client) — the three fields,
> mirrored validation, submit disabled while in flight, and four distinct
> result states: loading, generic error with retry, **rate-limited**, **quota
> exhausted**.

"Four distinct result states" is the phrase that caused it. Read literally, it
suggests a state machine that renders one branch at a time — which is what got
written.

### Attempted solution

An early return for the pending branch, which is idiomatic React and reads
perfectly well:

```tsx
if (pending) {
  return (
    <div className="space-y-6">
      <StatusBanner />
      <AnalysisSkeleton />
    </div>
  );
}

return <form onSubmit={onSubmit}>…</form>;
```

Nothing about this looks wrong in review. It type-checks, it lints, the loading
state is a proper skeleton rather than a spinner, and every state is visually
correct **in isolation** — which is exactly how a component gets reviewed.

### Debugging

The failure was not visible from reading the component, and would not have been
visible from clicking through the happy path either: on success the page
redirects to `/dashboard/[projectId]`, so the form's contents stop mattering
before anyone could notice. It only surfaced because the error path was driven
in a real browser and the snapshot was read field by field rather than skimmed
for "an error appeared".

The first hypothesis was a stray `event.currentTarget.reset()` or a controlled
component defaulting to `""`. Both were wrong — there is no reset call, and the
inputs are uncontrolled with no `value` prop.

The actual cause is the early return. `if (pending) return <div>…</div>`
replaces the form with a structurally different tree, so React unmounts the
`<form>` and its three `<input>` nodes. Uncontrolled inputs keep their state in
the DOM node itself; destroy the node and the value is gone. When `pending` flips
back to `false`, a *new* form mounts with empty defaults.

The tell, in hindsight: the component held no state for the field values, yet
the error copy promised they would survive a round trip. Nothing was keeping
that promise — the claim and the mechanism were written minutes apart and never
checked against each other.

### Final solution

Keep the form mounted for the whole lifecycle and hide it instead of replacing
it. The `hidden` attribute leaves the DOM nodes — and therefore the values — in
place:

```tsx
<div className="space-y-6">
  {pending ? <StatusBanner /> : null}
  <div hidden={pending}>
    <form onSubmit={onSubmit}>…</form>
  </div>
  {pending ? <AnalysisSkeleton /> : null}
</div>
```

The fields are also `disabled` while in flight, so the hidden form cannot be
submitted or tabbed into.

**Why this works rather than merely appearing to:** it removes the promise's
dependence on anything remembering the values. Lifting them into `useState`
would also have worked, but it adds three pieces of state and a re-render per
keystroke to solve a problem that only exists because the node was being thrown
away.

**The lesson:** an early return is a *remount*, and remounting is invisible in
every gate this project has — types, lint, build, and reading the diff. The
copy claimed a behaviour the structure could not deliver, and only driving the
failure path in a browser and reading the resulting DOM caught it. Testing the
happy path would never have found this, because on success the form is
discarded anyway.

## 6. `.gitignore` silently swallowed an entire API route

**Phase:** Phase 3 (builder & editor) · **Date:** 2026-08-26

### Problem

Phase 3 was finished and verified in a browser — analyze, build, four
refinements, persistence, all working. Staging the diff:

```
$ git add -A && git status --short
M  app/(app)/dashboard/[projectId]/page.tsx
A  app/api/refine/route.ts
A  components/concept/concept-view.tsx
A  components/concept/product-studio.tsx
A  lib/api/project.ts
A  lib/prompts/builder.ts
A  lib/prompts/editor.ts
```

`app/api/refine/route.ts` is there. **`app/api/build/route.ts` is not.** The file
exists on disk, is 2873 bytes, compiles, and had just served a working request
seven minutes earlier.

Had this been committed and pushed, the deploy would have gone out **without the
build endpoint**. "Build My Product" — the single action requirement 3 is named
after — would have returned 404 in production, on a URL a grader opens cold.

### AI prompt

No prompt produced this. The route was created with a plain `mkdir -p
app/api/build app/api/refine`, which is correct, and the file was written
correctly. The bug predates Phase 3 entirely: it was installed in Phase 0 by
`create-next-app`, which generates a `.gitignore` containing

```
build/
```

That line has been in the repo since the first commit and had never mattered,
because no directory named `build` existed until now.

### Attempted solution

The instinct was that `git add -A` had raced something, or that the file was
written after staging. Both wrong — `ls -la` showed the file present with an
earlier mtime than the `git add`.

The second instinct, that it was a permissions or encoding problem, was also
wrong and would have wasted real time. Neither hypothesis explains why the
*sibling* route staged fine from the same command.

### Debugging

The sibling was the clue. `refine` staged, `build` did not, and the only
difference between them is the directory name. That reframes the question from
"what is wrong with this file" to "what is special about the word *build*".

```
$ git check-ignore -v app/api/build/route.ts
.gitignore:9:build/	app/api/build/route.ts
```

A gitignore pattern containing no slash, or a trailing slash only, is matched
against **every path component at every depth** — not anchored to the repository
root. So `build/` means "any directory named build, anywhere", and
`app/api/build/` is a direct hit. `/build/` would have meant the root-level
directory the rule was actually written for.

The genuinely dangerous property is that **every gate this project has would
have passed it.** `tsc --noEmit` reads the filesystem, not the index, so it type
checks. `pnpm lint` passes. `pnpm build` compiles the route and prints
`ƒ /api/build` in the route table. The browser test passes because dev serves
from disk. `git status` does not list ignored files, so nothing appears missing —
the absence is only visible if you know which files you expect and count them.

Auditing the rest of the file for the same class of error:

```
$ find app lib components -type f \( -name "*.ts" -o -name "*.tsx" \) \
    | while read f; do git check-ignore -q "$f" && echo "IGNORED: $f"; done
IGNORED: app/api/build/route.ts
```

One file today. But `out/` and `dist/` on lines 8 and 10 are unanchored in
exactly the same way, so `app/api/out/` or `lib/dist/` would vanish just as
quietly in future.

### Final solution

Anchor the three build-output patterns to the repository root, which is what
they were always meant to mean:

```diff
-.next/
-out/
-build/
-dist/
+/.next/
+/out/
+/build/
+/dist/
```

`node_modules/` is deliberately left unanchored — a nested `node_modules`
genuinely should be ignored at any depth. The distinction is whether the name
describes *generated output at the project root* or *a kind of directory*.

Then `git add -f` was **not** used. Forcing the add would have committed the file
while leaving the rule that hides it in place, so the next `build` directory —
or a fresh clone running `git add -A` — would reintroduce the same gap. Fixing
the pattern fixes every future instance; forcing the add fixes one file and
leaves a trap.

**The lesson, and it is about verification rather than gitignore:** every check
in this project reads the working tree, and the thing being shipped is the
*index*. Those are different objects, and nothing in lint, typecheck, build or a
browser test compares them. The only reason this was caught is that I read the
staged file list and noticed a name I expected was missing — which is a habit,
not a gate. Worth adding a real one: comparing the route directories on disk
against the routes in the commit is a five-line check.

---

## 7. A custom CSS class silently zeroed a Tailwind utility — and hid the mobile menu

**Date:** 2026-08-26 · **Phase:** frontend redesign

### Problem

On the redesigned landing page at 375px, opening the mobile menu showed
"Capabilities" and "Pricing" but not "How it works" — the first link was sitting
*underneath* the floating nav bar. The overlay's container was explicitly
written as:

```tsx
<div className="safe-top flex h-full flex-col px-6 pt-24 pb-10">
```

`pt-24` is 96px, the nav's bottom edge is at 76px, so it should have cleared it
with room to spare. Nothing in lint, typecheck or the build flagged anything,
and on desktop the menu is `md:hidden` so it never appeared at all.

### AI prompt

Rather than adjusting the padding until it looked right, I asked for the
measurement first:

> Content is sitting under the nav. Let me confirm why before changing anything.
> Report the panel's class list, its **computed** paddingTop, the first link's
> bounding-rect top, and the nav's bottom.

### Attempted solution

The obvious guesses were all wrong and all would have "worked" by accident:
bump `pt-24` to `pt-32`, or add a `mt-` to the list, or set `top` on the links.
Each would have papered over the real cause and left the same trap armed for
every other element in the codebase.

### Debugging

The measurement came back:

```
panelClasses:             "safe-top flex h-full flex-col px-6 pt-24 pb-10"
panelComputedPaddingTop:  "0px"
firstLinkTop:             0
navBottom:                76
```

`pt-24` was in the class list and the computed padding was **zero**. Something
was overriding it. The culprit was my own utility, defined in `app/globals.css`:

```css
.safe-top { padding-top: max(0px, env(safe-area-inset-top)); }
```

`@import "tailwindcss"` sits at the top of that file, so Tailwind's utilities
are defined *before* anything I write below them. Equal specificity (both are a
single class), so source order decides — and my class always wins. In a desktop
browser `env(safe-area-inset-top)` resolves to `0px`, so `.safe-top` was
resolving to `padding-top: 0` and silently deleting `pt-24`.

The same trap was armed on `.safe-bottom` + `pb-*`, which the sticky command bar
was one edit away from hitting.

### Final solution

Deleted both custom classes and moved safe-area handling into Tailwind's own
arbitrary-value syntax, so everything lives in one cascade layer and cannot
collide:

```tsx
// header
className="... pt-[env(safe-area-inset-top)]"
// overlay — composes instead of competing
className="... pt-[calc(6rem+env(safe-area-inset-top))]"
```

**The generalisable lesson:** a hand-written class in the same stylesheet as a
utility framework is not "adding a utility", it is *shadowing* one, and it wins
by source order without any warning. The symptom appears at a call site that
looks obviously correct, which is exactly why reading the **computed** value
rather than the class list was the step that found it. Guessing at padding
numbers would have fixed the page and left the bug.

---

## 8. The mobile menu covered the button that closes it

**Date:** 2026-08-26 · **Phase:** frontend redesign

### Problem

With the full-screen mobile menu open, the floating nav island — including the
hamburger that had just morphed into an X — was gone from the screen. The menu
could only be dismissed with the Escape key or by tapping a navigation link.
Phones do not have an Escape key, so on the target device the menu was a
one-way door.

### AI prompt

The screenshot was ambiguous (the nav might simply have been styled away), so
the check had to be about hit-testing, not appearance:

> Is the close button the element the browser would actually hit at its own
> centre, or is the overlay sitting on top of it? Use `elementFromPoint` at the
> button's centre and report what comes back.

### Attempted solution

My first instinct was to add a separate close button inside the overlay. That
would have worked, but it abandons the hamburger→X morph — which is the entire
affordance telling the user the control they just pressed is the control that
undoes it. Two different close controls for one menu is worse design, not
better.

### Debugging

`elementFromPoint` returned the overlay, not the button. The cause was in my own
z-index scale in `globals.css`:

```css
.z-nav     { z-index: 40; }   /* the header      */
.z-overlay { z-index: 60; }   /* the menu itself */
```

The overlay is a child of the same stacking root and outranks the header, so a
`fixed inset-0` panel at 60 necessarily paints over a `sticky` header at 40.
This is not a bug in either value — it is a missing case: the scale had no entry
for *"the nav, while its own overlay is open"*.

### Final solution

Added the missing rung rather than reaching for an arbitrary `z-[9999]`:

```css
/* The nav while its own overlay is open. It MUST outrank .z-overlay, or the
   full-screen menu covers the hamburger that closes it. */
.z-nav-open { z-index: 65; }
```

and made the header swap classes with the open state:

```tsx
className={`... ${open ? "z-nav-open" : "z-nav"}`}
```

Re-ran the hit test: `reachable: true`.

**The generalisable lesson:** a z-index scale is a list of *layers*, but the
thing that actually needs a slot is a *state* — "nav" and "nav while its overlay
is open" are two different layers wearing the same name. And a screenshot cannot
tell "invisible" from "covered": only hit-testing distinguishes an element that
is not drawn from one that is drawn and unclickable.

---

## 9. Gemini started rejecting our concept schema — `/api/build` and `/api/refine` were down in production

**Phase:** Bonus phases · **Date:** 2026-08-27

### Problem

A routine regression walk after the bonus work: open the demo project, click
"Remove the pricing page." The request failed.

```
[refine] upstream failure {
  status: 400,
  cause: {"error":{"code":400,"message":"Request contains an invalid argument.","status":"INVALID_ARGUMENT"}}
}
POST /api/refine 502 in 2864ms
```

Every refine failed. Every build would too — both routes send `conceptSchema`.
The last session had verified refine working on production and nothing about
it had been deployed since.

Two things made this worse than it looked. The message names **neither the
offending keyword nor its path** — "an invalid argument" is the entire
diagnostic. And it arrived in the middle of a diff that had touched
`lib/llm/types.ts` and `lib/llm/providers/gemini.ts`, so the obvious hypothesis
was that the new optional `image` field had broken the request builder.

### AI prompt

No prompt caused this, and that was the first thing worth establishing rather
than assuming. The question asked was deliberately narrow:

> Did I break this, or was it already broken? Test the same schema against the
> commit before any of tonight's work.

```bash
git worktree add /tmp/.../pre a2c9dc5
# same probe, pre-phase code, same API key
PRE-PHASE conceptSchema: FAILED {"error":{"code":400,...,"status":"INVALID_ARGUMENT"}}
```

Identical failure on untouched code. **Google had tightened
`responseJsonSchema` validation server-side.** Code that was verified working
on production had stopped working with no deploy, no commit, and no warning.

### Attempted solution

The first four hypotheses were all wrong, and each was disproved cheaply:

1. *The new `image` branch in the request builder.* Disproved by the worktree.
2. *Schema size.* `analysisSchema` passed and `conceptSchema` failed, so size
   looked plausible — until trimming every field description from 3748 chars
   down to 1574 still failed. Not size.
3. *`propertyOrdering` being an unsupported key.* Removing it changed nothing.
4. *`responseJsonSchema` being the wrong field.* The older `responseSchema`
   was rejected identically.

A fifth round — probing individual fields — produced **inconsistent** results:
the same three-string schema failed once and passed three times in a row later.
That looked like non-determinism and nearly sent the investigation toward
"flaky API". It was not flaky. Those probes were rebuilding sub-schemas with
fresh `z.object({...})` calls, which emit different JSON than slicing the real
schema, so "the same" test was not the same test twice.

### Debugging

The mistake in rounds 2-5 was probing instead of looking. The step that worked
was dumping every JSON Schema keyword the emitted document actually contains,
then removing them a group at a time:

```
drop[nothing]              FAILED
drop[minItems,maxItems]    OK
drop[minLength]            FAILED
drop[enum]                 OK
drop[all constraints]      OK
```

Two keywords each "fix" it alone, which is the whole shape of the bug:

**Gemini rejects `minItems`/`maxItems` when the same schema also contains an
`enum`.** Either keyword alone is accepted. Together they are not.

That is exactly why `analysisSchema` kept passing while `conceptSchema` kept
failing, and why the difference looked like size: the analysis has bounded
arrays but no enum, while the concept has both — `palette[].role` is an enum
and nearly every array is bounded. The one structural difference between the
two schemas was invisible unless you were looking for a *pair*.

Re-run against the full concept, five times: 0 ok / 5 failed. Deterministic
after all.

### Final solution

Strip `minItems` and `maxItems` from the wire schema. Keep the enum.

```ts
if (key === "$schema" || key === "additionalProperties" ||
    key === "minItems" || key === "maxItems") continue;
```

The enum is worth keeping — it constrains the model to valid `role` values.
The bounds cost nothing to drop, because they were never the thing enforcing
them: `generateStructured` validates every response against the **full** zod
schema afterwards, bounds included, with a stricter retry when it does not
match. The wire schema shapes the model's output; zod decides whether the
output is acceptable. Only zod was ever load-bearing.

Verified: refine succeeds 3/3 and removes the pricing page; analysis still
succeeds and still omits `visualImpression` when there is no screenshot.

`pnpm check` now asserts the sanitiser strips both keywords and keeps `enum`,
`minLength` and `propertyOrdering`. A unit check cannot ask Google what its
dialect is — but it fails loudly when someone tidies the keywords back in,
which is the realistic way this regresses, and which no type check or lint
would catch.

**The generalisable lesson:** a dependency you do not deploy can still break
you. "Verified working on production" has an expiry date when the verification
depends on someone else's server-side validation. And when a failure looks
non-deterministic, suspect the test before the system — three of the five
probing rounds here were measuring something other than what they claimed to.

---

## 10. Three different ways a free-tier code generator returns a broken page

**Phase:** Bonus phase 2 (code generation) · **Date:** 2026-08-27

### Problem

Three separate failures in one feature, each of which produced *something* that
looked like success.

**(a)** The first generation request died instantly:

```
groq request failed with status 413: Request too large for model
`qwen/qwen3.8-27b` ... on tokens per minute (TPM): Limit 8000, Requested 8894
```

Nothing had been generated. The request was rejected for exceeding a budget it
had not spent.

**(b)** With the budget fixed, generation returned HTTP 200 and a page that
rendered — until you scrolled. The stored document ended:

```
<body>
<header class="nav">
  <div class="wrap">
    <a class="brand" href
```

Cut off mid-attribute, at exactly **10240 characters**, with
`finish_reason: "stop"`. Valid JSON, valid database row, broken page.

**(c)** Editing a working page returned:

```
groq request failed with status 400: Failed to generate JSON.
Please adjust your prompt.
```

Which names nothing at all.

### AI prompt

The prompt that mattered was not to the code generator but the framing of the
investigation, after (b) was mistakenly attributed to the model "deciding to
stop":

> `finish_reason` says stop and the character count is exactly 10240. That is
> 10 × 1024 — too round to be a model choice. Test whether other models on the
> same tier truncate at the same number.

### Attempted solution

For (b), the first fix was to instruct the model: *"Keep the entire document
under 11000 characters."* This made it **worse** — the model spent its budget
and stopped mid-tag when it ran out, rather than planning a shorter page. A cap
phrased as a limit produced a longer broken page; the instruction that worked
was *"the last characters you write must be the closing `</html>` tag."*

For (c), the instinct was to raise the token budget. That was the right family
of fix for the wrong reason, and would have masked the cause.

### Debugging

Each one came down to measuring rather than reasoning.

**(a) Groq reserves `max_completion_tokens` up front.** Prompt tokens *plus*
the requested output ceiling are both charged against one 8000-tokens-per-minute
bucket before generation starts. Asking for 8192 output on a 700-token prompt
is an instant 413. Budgets are now sized from measured need, and 413 is mapped
to `LLMRateLimitError` rather than an upstream error — it is a rate limit
wearing a different status code, and calling it a malformed request would send
the reader somewhere useless.

**(b) The 10240 is a platform cap, not a model choice.** Comparing three models
on the same tier with the same prompt:

```
qwen/qwen3.8-27b     out_tok=3338  chars=10240  ends_with_</html>=false
openai/gpt-oss-20b   out_tok=3000  chars=2979   ends_with_</html>=true
openai/gpt-oss-120b  out_tok=2390  chars=3757   ends_with_</html>=true
```

Groq's JSON-schema decoder caps a string value at 10240 characters, closes the
JSON cleanly around the stump, and still reports `finish_reason: "stop"`. Every
downstream check passes: valid JSON, valid string, non-empty, schema-conformant.
The truncation is invisible to everything except a human scrolling the page.

**(c) `gpt-oss` are reasoning models, and reasoning bills to
`max_completion_tokens`.** Probing the same request with and without a
reasoning cap:

```
current      HTTP 400 Failed to generate JSON
low-effort   out=1918  reasoning=70  finish=stop
```

This is **the same trap as entry 2 in this file**, in a different vendor's
clothing. Gemini's `maxOutputTokens` caps thinking + output combined; Groq's
`max_completion_tokens` does the same. In entry 2 the symptom was HTTP 200 with
an empty `parts` array. Here it is HTTP 400 "Failed to generate JSON", because
the constrained decoder ran out of budget mid-document and could not close the
object. Different symptom, identical cause.

### Final solution

Three changes, one per failure:

1. Budgets sized from measured output rather than from the ceiling, and 413
   mapped to a rate limit.
2. `openai/gpt-oss-120b` pinned as the code generation model — it returns
   complete documents in a third of qwen's output tokens, which also leaves
   room for an edit inside the same per-minute budget. And, because a model
   choice is not a guarantee, `generatedSiteSchema` now *requires* the closing
   tag:

   ```ts
   .refine((html) => html.trimEnd().endsWith("</html>"), {
     message: "The document is incomplete — it must end with a closing </html> tag.",
   })
   ```

   A truncated page now fails validation instead of being persisted silently.
3. `reasoning_effort: "low"` for reasoning models, gated on the model name
   because non-reasoning models reject the parameter outright.

**The generalisable lesson:** every one of these returned a success-shaped
result. A 413 before any work, a valid JSON string containing half a document,
and a 400 whose text describes the symptom rather than the cause. The check
that caught (b) was not a status code or a schema — it was asking whether the
artifact *ends the way that kind of artifact ends*. For anything generated in
one shot, assert on the closing condition, because every other signal will
tell you it worked.

---

## 11. A backtick in a CSS comment turned a stylesheet into JavaScript

**Phase:** Bonus phase 1 (concept preview) · **Date:** 2026-08-27

### Problem

`lib/preview/render-concept.ts` builds a whole HTML document inside a template
literal. Adding an explanatory comment to the CSS produced:

```
TypeError: esc(...)fontLinks(...)theme.surfacetheme.text...stack(...).lede is not a function
```

### AI prompt

None — this was a self-inflicted edit while documenting a layout fix. The
comment read ``/* `.lede` is centred for the hero... */``, and the backticks
around `.lede` were the ordinary markdown habit of quoting a CSS selector.

### Attempted solution

None needed. The error message names the cause once you notice it is a
concatenation of every interpolated expression in the template — the backtick
had terminated the string, and everything after it was being parsed as JS.

### Final solution

No backticks inside the CSS block; the comment says `.lede` unquoted.

Worth recording for one reason: the failure was caught in under five seconds by
`pnpm check`, on the check's **first ever run**, before the file was opened in a
browser. The self-check was written to protect the escaping and hex-guard logic
and it caught something entirely unrelated — a syntax error in a documentation
comment. A test that only ever catches what it was written for is not earning
much.
