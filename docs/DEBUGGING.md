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
