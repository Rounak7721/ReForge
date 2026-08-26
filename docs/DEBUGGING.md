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
