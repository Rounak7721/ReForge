/**
 * Self-check for the concept renderer. `pnpm check:preview`.
 *
 * Not a test suite — the project has none and none is planned. This is the one
 * runnable assertion that fails if the renderer's non-obvious parts break: the
 * escaping boundary, the hex guard that protects the `<style>` block, the
 * typeface parser, and the page clamp. All four are things a reader would
 * otherwise have to take on faith.
 */
import assert from "node:assert/strict";

import { parseFonts, renderConceptPage } from "./render-concept";
import type { Concept } from "../prompts/builder";

const concept: Concept = {
  name: "Ember",
  description: "A coffee subscription.",
  features: [{ name: "Fresh roasts", description: "Roasted the day it ships." }],
  navigation: [
    { label: "Home", path: "/" },
    { label: "Pricing", path: "/pricing" },
  ],
  pages: [
    {
      name: "Home",
      path: "/",
      sections: [
        { type: "hero", headline: "Coffee, considered", body: "Roasted to order." },
        { type: "features", headline: "Why Ember", body: "Three reasons." },
        { type: "wildcard-type", headline: "Unknown", body: "Falls back." },
      ],
    },
    { name: "Pricing", path: "/pricing", sections: [{ type: "pricing", headline: "Plans", body: "Two tiers." }] },
  ],
  uiDirection: {
    style: "Editorial",
    mood: "Warm",
    typography: "Instrument Serif headings, Inter body",
    palette: [
      { name: "Paper", hex: "#FFFDF8", role: "surface" },
      { name: "Ink", hex: "#1A1512", role: "text" },
      { name: "Ember", hex: "#C2410C", role: "primary" },
    ],
  },
};

/* --- typeface parsing ----------------------------------------------------- */
assert.deepEqual(parseFonts("Instrument Serif headings, Inter body"), {
  display: "Instrument Serif",
  body: "Inter",
});
// A category is not a family: nothing capitalised and meaningful means fall
// back to the CSS stack rather than requesting a font called "Clean Sans".
assert.deepEqual(parseFonts("clean sans-serif throughout"), { display: undefined, body: undefined });
// One family named once should be used for both roles, not leave body unset.
assert.deepEqual(parseFonts("Inter for everything"), { display: "Inter", body: "Inter" });

/* --- escaping ------------------------------------------------------------- */
const hostile: Concept = {
  ...concept,
  name: '<script>alert(1)</script>',
  pages: [
    {
      name: "Home",
      path: "/",
      sections: [{ type: "hero", headline: 'a"b<i>c</i>', body: "Tom & Jerry" }],
    },
  ],
};
const escaped = renderConceptPage(hostile);
assert.ok(!escaped.includes("<script>alert(1)</script>"), "model text must not reach the document as markup");
assert.ok(escaped.includes("&lt;script&gt;"), "angle brackets must be entity-encoded");
assert.ok(escaped.includes("Tom &amp; Jerry"), "ampersands must be entity-encoded");

/* --- the hex guard on the <style> block ----------------------------------- */
const injected = renderConceptPage({
  ...concept,
  uiDirection: {
    ...concept.uiDirection,
    palette: [{ name: "Bad", hex: "#fff; } body { display: none", role: "surface" }],
  },
});
assert.ok(!injected.includes("display: none"), "a malformed hex must never reach the stylesheet");
assert.ok(injected.includes("--surface: #ffffff"), "a rejected hex falls back to the default");

// Alpha hex is valid CSS and the builder does emit it. It used to pass the
// guard and then break `luminance`/`mix`, which read fixed channel offsets and
// produced `#dedbNaN` — an invalid custom property that deletes every border
// in the document. Alpha must be normalised away before it reaches them.
const alpha = renderConceptPage({
  ...concept,
  uiDirection: {
    ...concept.uiDirection,
    palette: [
      { name: "Paper", hex: "#fffa", role: "surface" },
      { name: "Ink", hex: "#1A1512FF", role: "text" },
      { name: "Ember", hex: "#C2410C", role: "primary" },
    ],
  },
});
assert.ok(!alpha.includes("NaN"), "no derived colour may contain NaN");
assert.ok(alpha.includes("--surface: #fff"), "4-digit alpha hex keeps its colour, minus the alpha");
assert.ok(alpha.includes("--text: #1A1512"), "8-digit alpha hex keeps its colour, minus the alpha");

/* --- page selection ------------------------------------------------------- */
assert.ok(renderConceptPage(concept, 1).includes("Plans"), "pageIndex selects the page");
// Clamped, not thrown: a stale ?page= in a shared link should show a page.
assert.ok(renderConceptPage(concept, 99).includes("Plans"), "out-of-range index clamps to the last page");
assert.ok(renderConceptPage(concept, -5).includes("Coffee, considered"), "negative index clamps to the first page");

/* --- section fallback ----------------------------------------------------- */
const home = renderConceptPage(concept, 0);
assert.ok(home.includes("Roasted the day it ships."), "a features section pulls in the concept's features");
assert.ok(home.includes("wildcard-type"), "an unrecognised section type renders rather than disappearing");
assert.ok(home.startsWith("<!doctype html>"), "output is a complete document, ready for srcdoc");

console.log("render-concept: all checks passed");
