# UI audit — pre-refactor baseline

Run 2026-08-26 with the `web-design-guidelines` skill (vercel-labs Web Interface
Guidelines) across `app/**/*.tsx` and `components/**/*.tsx`, before the
v0/Lovable/Replit-direction refactor.

This is the defect baseline. Items marked **[keep]** are real bugs that must be
fixed under any visual direction; items marked **[folds in]** disappear when the
surface is rebuilt anyway.

---

## app/layout.tsx

- `:43` — no `color-scheme` on `<html>`. App is `forcedTheme="light"`, so native
  inputs and scrollbars render dark for a visitor on OS dark mode. **[keep]**
- `:43` — no `<meta name="theme-color">`. **[keep]**
- `:48` — no skip link to main content, app-wide. **[keep]**
- `:29` — no `viewport` export.

## app/(app)/dashboard/layout.tsx

- `:33` — `<main>` has no `id` to serve as a skip-link target. **[keep]**
- `:27` — email span lacks `truncate`/`min-w-0`; a long address pushes the
  header layout. **[folds in]**

## app/(app)/dashboard/page.tsx

- `:86` — `new URL(project.url)` called in render. One malformed row throws and
  takes out the entire project list. **[keep]**
- `:73` — unbounded `.map()`, no virtualization past 50 projects.

## app/(app)/dashboard/[projectId]/page.tsx

- `:80` — `←` sits inside the link text without `aria-hidden`; screen readers
  announce "left arrow Projects". **[keep]**
- `:98` — same `new URL()` throw risk as above. **[keep]**
- `:84` — `<h1>` followed directly by AnalysisView's `<h3>`; `<h2>` skipped.
  **[keep]**

## components/analysis/analysis-view.tsx

- `:24` — sections use `<h3>` under a page `<h1>` with no intervening `<h2>`.
  Heading hierarchy is broken. **[keep]**

## components/concept/product-studio.tsx

- `:197` — submit disabled until `instruction.length >= 3`. Guideline: the
  submit button stays enabled until the request starts; validate on submit.
  **[keep]**
- `:187` — refine input has no `name` and no `autoComplete="off"`, so password
  managers offer to fill it. **[keep]**
- `:191` — placeholder does not end with `…`. **[folds in]**
- `:245` — the concept swaps silently; needs `aria-live="polite"` and
  `aria-busy`. **[keep]**
- `:245` — `pointer-events-none opacity-50` leaves the dimmed concept tabbable;
  needs `inert`. **[keep]**
- `:227` — `<details>` open state is not URL-synced.
- `:42`, `:83` — straight apostrophes in `didn't` / `Couldn't`. **[folds in]**

## components/analyze/analyze-form.tsx

- `:94` — `animate-spin` with no `prefers-reduced-motion` variant. **[keep]**
- `:111` — errors are form-level only. Guideline wants them inline next to the
  offending field, with focus moved to the first error on submit. **[keep]**
- `:132`, `:146` — description and targetCustomer lack `autoComplete="off"`.
  **[keep]**
- `:110` — long free-text form with no unsaved-changes guard on navigation.
- `:78`, `:171` — straight apostrophes. **[folds in]**

## components/auth/auth-form.tsx

- `:128` — email input missing `spellCheck={false}`. **[keep]**
- `:153` — error not inline next to the field; no focus-first-error. **[keep]**
- `:30`, `:92` — straight apostrophes. **[folds in]**

## app/(marketing)/page.tsx

- `:248` — `text-white/60` on `--ink`; likely under 4.5:1. **[keep]**
- `:237` — `bg-white/15` badge with white text; low contrast. **[keep]**
- `:256`, `:271` — `text-white/70`, `text-white/90` on the featured tier;
  contrast unverified. **[keep]**
- `:109` — no skip link. **[keep]**
- `:36`, `:57`, `:61`, `:65` — straight apostrophes in body copy. **[folds in]**

## components/marketing/marketing-header.tsx

- `:24`, `:30` — nav links are `hidden sm:inline-block` with no mobile
  alternative, so navigation is unreachable on phones. **[keep]**
- `:17` — sticky header without `env(safe-area-inset-top)`. **[keep]**

## Global

- `app/globals.css` — no `touch-action: manipulation` and no
  `-webkit-tap-highlight-color` anywhere. **[keep]**
- "Reforge" is never wrapped in `translate="no"`, so auto-translation garbles
  the brand name. **[keep]**

---

## Passing, and worth preserving through the refactor

- `components/marketing/teardown-panel.tsx` — the `data-rise` stagger is
  correctly gated behind `@media (prefers-reduced-motion: no-preference)` in
  `app/globals.css`. Decorative dots are `aria-hidden`.
- No `transition: all` anywhere — every transition names its property.
- No `outline-none` without a replacement; `.marketing` defines an explicit
  `:focus-visible` rule.
- `…` used consistently in copy and loading states; no literal `...`.
- `scroll-mt-16` present on both anchor targets.
- `Intl.DateTimeFormat` used rather than a hardcoded date format.

## The pattern

The marketing surface is in good shape. Defects cluster in the app shell —
heading hierarchy, form error handling, and the refine control — which are
exactly the three areas the refactor rebuilds. Roughly a third are pure
accessibility bugs that need fixing regardless of visual direction; carry the
**[keep]** list into the new components rather than re-introducing them.
