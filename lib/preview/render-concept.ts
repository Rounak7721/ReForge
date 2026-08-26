import type { Concept, PaletteEntry } from "@/lib/prompts/builder";

/**
 * Concept → a complete, self-contained HTML document.
 *
 * This is bonus #2 ("generate actual UI") and #5 ("live preview") with **zero
 * model calls**: everything a page needs is already in the concept object.
 * `pages[].sections[].{headline, body}` is real copy, `uiDirection.palette[]`
 * is real hex, `uiDirection.typography` is a concrete typeface direction. It is
 * a renderer over data we already paid for, not a generation step.
 *
 * The output is deliberately a whole `<!doctype html>` document rather than a
 * fragment, because that is what an `<iframe srcdoc>` takes — and an iframe is
 * what keeps the concept's own colours and fonts from colliding with the app's
 * design system. Phase 2 swaps model-generated HTML into the same iframe, so
 * the substrate is shared and neither side has to know which produced it.
 *
 * Pure and synchronous: same concept in, same string out. That makes it free to
 * call on every render and trivial to check (see `render-concept.check.ts`).
 */

/**
 * Every piece of model text passes through here before it reaches the document.
 *
 * The iframe is sandboxed without `allow-same-origin`, so a `<script>` smuggled
 * into a headline could not reach the app's cookies or Supabase session anyway.
 * That is containment, not correctness: unescaped copy containing `<` or `&`
 * also silently corrupts the layout, which is the far more likely outcome.
 * Escape at the boundary and neither problem exists.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Hex values are interpolated into a `<style>` block, where escaping does
 * nothing — `#fff;} body{display:none` is a valid string and a broken page.
 * The concept schema only requires `.min(1)` on `hex`, so this is the only
 * thing standing between a hallucinated colour and a mangled stylesheet.
 */
function safeHex(value: string, fallback: string): string {
  const hex = value.trim();
  if (!/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return fallback;

  // Alpha is dropped rather than passed through. `luminance` and `mix` both
  // read fixed channel offsets, so a 4- or 8-digit value reached them as a
  // NaN blue channel — which emitted `--hairline: #dedbNaN`, silently deleting
  // every border in the document and defaulting the contrast check to white.
  // Normalising here keeps that impossible for every consumer at once, rather
  // than teaching each of them about alpha.
  if (hex.length === 5) return hex.slice(0, 4);
  if (hex.length === 9) return hex.slice(0, 7);
  return hex;
}

/** First palette entry with the given role, or undefined. */
function byRole(palette: PaletteEntry[], role: PaletteEntry["role"]): string | undefined {
  return palette.find((entry) => entry.role === role)?.hex;
}

type Theme = {
  surface: string;
  text: string;
  primary: string;
  accent: string;
  /** Text on top of `primary`, picked for contrast rather than guessed. */
  onPrimary: string;
  muted: string;
  hairline: string;
};

/**
 * Relative luminance per WCAG, used only to decide whether text on the primary
 * colour should be black or white.
 *
 * A fixed choice fails half the time: the builder is free to return a pale
 * yellow primary or a near-black one, and white-on-yellow is unreadable in
 * exactly the same way black-on-navy is. Computing it costs six lines and makes
 * the preview legible for any palette the model invents.
 */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const channel = (i: number) => {
    const v = parseInt(full.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** Blend two hex colours, used to derive muted text and hairlines from the palette. */
function mix(a: string, b: string, weight: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
    return [0, 1, 2].map((i) => parseInt(full.slice(i * 2, i * 2 + 2), 16));
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const chan = (x: number, y: number) =>
    Math.round(x * (1 - weight) + y * weight)
      .toString(16)
      .padStart(2, "0");
  return `#${chan(ar!, br!)}${chan(ag!, bg!)}${chan(ab!, bb!)}`;
}

function toTheme(palette: PaletteEntry[]): Theme {
  const surface = safeHex(byRole(palette, "surface") ?? "#ffffff", "#ffffff");
  const text = safeHex(byRole(palette, "text") ?? "#111111", "#111111");
  const primary = safeHex(byRole(palette, "primary") ?? text, text);
  const accent = safeHex(byRole(palette, "accent") ?? primary, primary);

  return {
    surface,
    text,
    primary,
    accent,
    onPrimary: luminance(primary) > 0.5 ? "#0b0b0b" : "#ffffff",
    muted: mix(text, surface, 0.42),
    hairline: mix(text, surface, 0.86),
  };
}

/**
 * Pull typeface names out of the builder's free-text direction.
 *
 * `typography` is a sentence like "Instrument Serif headings, Inter body", not
 * structured data, so this takes the capitalised runs and treats the first two
 * as display and body. Generic words are dropped so "Clean Sans" doesn't ask
 * Google for a family called "Clean Sans".
 *
 * Deliberately not validated against a font list. An unknown family makes
 * Google Fonts return 400, the stylesheet fails to apply, and the CSS fallback
 * stack renders — which is the same outcome a lookup table would produce, minus
 * the table and minus the maintenance.
 */
const GENERIC_FONT_WORDS = new Set([
  "headings", "heading", "body", "text", "display", "copy", "ui", "type",
  "bold", "light", "regular", "medium", "semibold", "black", "thin",
  "serif", "sans", "sans-serif", "monospace", "mono", "clean", "modern",
  "for", "and", "with", "the", "a", "an",
]);

export function parseFonts(typography: string): { display?: string; body?: string } {
  const candidates = (typography.match(/[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*/g) ?? [])
    .map((name) => name.trim())
    .filter((name) => {
      const words = name.toLowerCase().split(/\s+/);
      // A run is a font name only if it still says something after the generic
      // vocabulary is removed — "Serif" alone is a category, "Instrument Serif"
      // is a family.
      return words.some((word) => !GENERIC_FONT_WORDS.has(word));
    });

  return { display: candidates[0], body: candidates[1] ?? candidates[0] };
}

/**
 * One `<link>` per family rather than one combined request.
 *
 * Google Fonts rejects the *whole* stylesheet if any `family=` in it is
 * unknown, so combining them means one hallucinated name loses both faces.
 * Separate links fail independently.
 *
 * No `:wght@` axis on purpose: many display families ship a single weight and
 * asking for 700 turns a working request into a 400. Hierarchy here comes from
 * size and letter-spacing instead, which suits the look anyway.
 */
function fontLinks(fonts: { display?: string; body?: string }): string {
  const families = [...new Set([fonts.display, fonts.body].filter((f): f is string => !!f))];
  if (families.length === 0) return "";

  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    ...families.map(
      (family) =>
        `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          family,
        ).replace(/%20/g, "+")}&display=swap">`,
    ),
  ].join("\n");
}

function stack(name: string | undefined, fallback: string): string {
  return name === undefined ? fallback : `'${name.replace(/'/g, "")}', ${fallback}`;
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `section.type` is an open string, not an enum — the builder is told to prefer
 * a vocabulary but is free to invent. So types are grouped into four layouts
 * with a default, rather than given a renderer each: twelve near-identical
 * renderers would be more code and would still fall over on the thirteenth type.
 *
 * Sections carry only `{type, headline, body}`, so richness has to come from
 * elsewhere in the concept — a `features` section pulls in the top-level
 * `features[]`, which is the one place cross-referencing genuinely pays.
 */
function renderSection(
  section: { type: string; headline: string; body: string },
  concept: Concept,
  index: number,
): string {
  const type = section.type.toLowerCase().trim();
  const headline = esc(section.headline);
  const body = esc(section.body);

  if (type === "hero" || (index === 0 && type.includes("hero"))) {
    return `<section class="hero">
  <h1>${headline}</h1>
  <p class="lede">${body}</p>
  <div class="actions"><span class="btn">Get started</span><span class="btn ghost">Learn more</span></div>
</section>`;
  }

  if (type === "footer") {
    return `<footer class="footer">
  <div><strong>${esc(concept.name)}</strong><p>${body}</p></div>
  <nav>${concept.navigation
    .map((item) => `<span>${esc(item.label)}</span>`)
    .join("")}</nav>
</footer>`;
  }

  if (type === "features" || type === "benefits") {
    return `<section class="block">
  <h2>${headline}</h2>
  <p class="lede">${body}</p>
  <div class="grid">
    ${concept.features
      .map(
        (feature) => `<article class="card">
      <h3>${esc(feature.name)}</h3>
      <p>${esc(feature.description)}</p>
    </article>`,
      )
      .join("\n    ")}
  </div>
</section>`;
  }

  if (type === "cta" || type === "testimonial" || type === "quote") {
    return `<section class="band">
  <h2>${headline}</h2>
  <p>${body}</p>
</section>`;
  }

  // The first section of a page is its header, not a card. Boxing it left a
  // single-section page — "Pricing" is usually exactly one — as a small panel
  // adrift in an empty viewport, which reads as a rendering failure rather
  // than as a short page.
  if (index === 0) {
    return `<section class="block pagehead">
  <span class="eyebrow">${esc(section.type)}</span>
  <h2>${headline}</h2>
  <p class="lede">${body}</p>
</section>`;
  }

  return `<section class="block">
  <div class="panel">
    <span class="eyebrow">${esc(section.type)}</span>
    <h2>${headline}</h2>
    <p class="lede">${body}</p>
  </div>
</section>`;
}

/* -------------------------------------------------------------------------- */
/*  Document                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Render one page of the concept as a standalone document.
 *
 * `pageIndex` is clamped rather than validated: the caller is a tab strip built
 * from the same array, but a stale `?page=` in a shared URL should show the home
 * page, not an error.
 */
export function renderConceptPage(concept: Concept, pageIndex = 0): string {
  const pages = concept.pages;
  const index = Math.min(Math.max(pageIndex, 0), Math.max(pages.length - 1, 0));
  const page = pages[index];
  const theme = toTheme(concept.uiDirection.palette);
  const fonts = parseFonts(concept.uiDirection.typography);

  const rendered =
    page === undefined
      ? ['<section class="block"><div class="panel"><h2>This page has no sections yet.</h2></div></section>']
      : page.sections.map((section, i) => renderSection(section, concept, i));

  // The builder only emits a footer section on some pages, which left the
  // others ending in mid-air. This is presentational chrome built from the
  // concept's own name and navigation — it invents no product content.
  const hasFooter = (page?.sections ?? []).some(
    (section) => section.type.toLowerCase().trim() === "footer",
  );
  if (!hasFooter) {
    rendered.push(`<footer class="footer">
  <div><strong>${esc(concept.name)}</strong></div>
  <nav>${concept.navigation.map((item) => `<span>${esc(item.label)}</span>`).join("")}</nav>
</footer>`);
  }

  const sections = rendered.join("\n");

  // The in-page nav is presentational: links would navigate the iframe away
  // from the srcdoc document, and there is nothing to navigate to. Switching
  // pages is the app's job, in chrome outside the frame.
  const nav = concept.navigation
    .map(
      (item) =>
        `<span class="${page !== undefined && item.path === page.path ? "here" : ""}">${esc(
          item.label,
        )}</span>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(concept.name)}</title>
${fontLinks(fonts)}
<style>
  *, *::before, *::after { box-sizing: border-box; }
  :root {
    --surface: ${theme.surface};
    --text: ${theme.text};
    --primary: ${theme.primary};
    --accent: ${theme.accent};
    --on-primary: ${theme.onPrimary};
    --muted: ${theme.muted};
    --hairline: ${theme.hairline};
  }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    color: var(--text);
    font-family: ${stack(fonts.body, "system-ui, -apple-system, 'Segoe UI', sans-serif")};
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 {
    font-family: ${stack(fonts.display, "Georgia, 'Times New Roman', serif")};
    font-weight: 400;
    letter-spacing: -0.02em;
    line-height: 1.12;
    margin: 0;
    text-wrap: balance;
  }
  p { margin: 0; }

  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px; padding: 20px 40px;
    border-bottom: 1px solid var(--hairline);
    position: sticky; top: 0; background: var(--surface); z-index: 5;
  }
  .brand { font-family: ${stack(fonts.display, "Georgia, serif")}; font-size: 20px; letter-spacing: -0.01em; }
  .topbar nav { display: flex; gap: 22px; flex-wrap: wrap; font-size: 14px; color: var(--muted); }
  .topbar nav .here { color: var(--primary); }

  section { padding: 72px 40px; }
  /* Sized so the hero and the section under it both fall inside the preview
     frame's viewport. A full-bleed hero is correct on a real site and wrong
     here, where it would be the only thing anyone sees without scrolling. */
  .hero { text-align: center; padding: 92px 40px 76px; }
  .hero h1 { font-size: clamp(34px, 5vw, 54px); max-width: 18ch; margin: 0 auto; }
  .lede { color: var(--muted); font-size: 18px; max-width: 60ch; margin: 22px auto 0; text-wrap: pretty; }
  .actions { display: flex; gap: 12px; justify-content: center; margin-top: 36px; flex-wrap: wrap; }
  .btn {
    display: inline-block; padding: 13px 26px; border-radius: 999px;
    background: var(--primary); color: var(--on-primary); font-size: 14px;
  }
  .btn.ghost { background: transparent; color: var(--text); border: 1px solid var(--hairline); }

  .block h2 { font-size: clamp(26px, 3.2vw, 38px); max-width: 20ch; }
  /* The lede is centred for the hero. Anywhere it sits under a left-aligned
     heading it has to be left-aligned too, or the block reads as two
     unrelated fragments. .panel needs its own rule: the lede is nested
     inside it, so a child combinator on .block does not reach it. */
  .block > .lede, .panel .lede { margin-left: 0; margin-right: 0; text-align: left; }
  .grid {
    display: grid; gap: 18px; margin-top: 44px;
    grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
  }
  .card { border: 1px solid var(--hairline); border-radius: 16px; padding: 26px; }
  .card h3 { font-size: 18px; }
  .card p { color: var(--muted); font-size: 14.5px; margin-top: 10px; }

  .panel { border: 1px solid var(--hairline); border-radius: 22px; padding: 40px; }
  .pagehead { padding-top: 76px; padding-bottom: 40px; }
  .pagehead h2 { font-size: clamp(30px, 4vw, 46px); }
  .eyebrow {
    display: inline-block; margin-bottom: 18px; font-size: 11px;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent);
  }

  .band { background: var(--primary); color: var(--on-primary); text-align: center; }
  .band h2 { font-size: clamp(25px, 3vw, 36px); max-width: 24ch; margin: 0 auto; }
  .band p { margin-top: 16px; opacity: 0.86; max-width: 56ch; margin-inline: auto; }

  .footer {
    margin-top: auto;
    display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap;
    padding: 52px 40px; border-top: 1px solid var(--hairline);
    color: var(--muted); font-size: 14px;
  }
  .footer nav { display: flex; gap: 18px; flex-wrap: wrap; }

  @media (max-width: 640px) {
    section { padding: 64px 22px; }
    .hero { padding: 84px 22px 68px; }
    .topbar { padding: 16px 22px; }
    .panel { padding: 30px; }
  }
</style>
</head>
<body>
<header class="topbar">
  <span class="brand">${esc(concept.name)}</span>
  <nav>${nav}</nav>
</header>
${sections}
</body>
</html>`;
}
