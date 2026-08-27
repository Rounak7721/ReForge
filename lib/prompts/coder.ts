import { z } from "zod";

import type { Concept } from "@/lib/prompts/builder";

/**
 * The code generator: concept → a real, self-contained web page, and then
 * natural-language edits to that page.
 *
 * ## Why the HTML is wrapped in JSON
 *
 * The provider contract is `generateJson`, validated by zod with one stricter
 * retry on malformed output. Returning `{ html: "..." }` keeps every bit of
 * that — schema validation on the wire, the retry, typed errors — with no
 * interface change anywhere. A `generateText` method would have to be added to
 * every provider and would throw the retry policy away for this one caller.
 *
 * ## Why one file rather than three
 *
 * A single document is both the iframe `srcdoc` and the download, so there is
 * no bundling step and no ZIP writer. It is also markedly more reliable: a
 * model asked for three files that reference each other gets the references
 * wrong, and the failure is silent — a page that renders unstyled.
 */

export const generatedSiteSchema = z.object({
  html: z
    .string()
    .min(200)
    .describe(
      "A complete HTML document beginning with <!doctype html>. All CSS in a single <style> tag and all JS in a single <script> tag, both inline. No external files.",
    )
    // Truncation is the failure mode that actually happens here, and it is
    // silent: a document cut off mid-tag is still a valid JSON string, so
    // nothing downstream notices until a half-rendered page appears in the
    // frame. Groq's JSON-schema decoder caps string values at 10240 characters
    // and closes the JSON cleanly around the stump — `finish_reason` still says
    // "stop". Checking the closing tag is the only reliable signal, and failing
    // here routes into the existing stricter retry rather than saving a broken
    // page. See docs/04-debugging-log.md.
    .refine((html) => html.trimEnd().endsWith("</html>"), {
      message: "The document is incomplete — it must end with a closing </html> tag.",
    }),
});

export type GeneratedSite = z.infer<typeof generatedSiteSchema>;

/**
 * Constraints that come from where this HTML actually runs, not from taste.
 *
 * The page is rendered in an iframe sandboxed with `allow-scripts` and
 * deliberately WITHOUT `allow-same-origin`, which gives it an opaque origin.
 * In an opaque origin `localStorage` does not return null — **accessing it
 * throws a SecurityError**, which kills the script that touched it. A model
 * writing a "save your preferences" demo will reach for it by reflex, so this
 * has to be stated rather than hoped for.
 */
/**
 * Rough token count. Four characters per token is the usual English
 * approximation and is close enough for a budget that already carries a safety
 * margin — the alternative is shipping a tokenizer to avoid a 413.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const RUNTIME_RULES = [
  "Output ONE complete HTML document. Inline every style in a single <style> tag and every script in a single <script> tag.",
  "No external files, no build step, no frameworks, no CDN scripts. Google Fonts via a <link> is the only external resource allowed.",
  "NEVER use localStorage, sessionStorage, cookies, or IndexedDB. The page runs in a sandboxed frame with an opaque origin where touching them throws a SecurityError and kills your script. Hold state in JavaScript variables.",
  "Do not use fetch, XMLHttpRequest or WebSockets — there is no backend. Any data must be hard-coded in the page.",
  "EVERY <a> must link to a section of THIS document: href=\"#some-id\", matching an id you actually put on that section. There is exactly one page, so a path like href=\"/pricing\" has nothing to point at — and inside the preview frame it navigates away from the page entirely. Give each nav item a real section to scroll to.",
  "The page must be responsive and must not scroll horizontally at any width.",
  // Phrased as "finish it" rather than as a character cap. A cap made the
  // model spend its budget and stop mid-tag when it ran out; asking for a
  // focused page that ENDS correctly gets a shorter complete document instead
  // of a longer broken one. Size still matters — an edit has to fit the whole
  // document through an 8000 tokens-per-minute budget in both directions — but
  // economy is the means, not the instruction.
  "Be economical: reuse CSS classes, avoid repeated declarations, and do not pad the page with filler sections. A focused page beats a long one.",
  "ALWAYS finish the document. The last characters you write must be the closing </html> tag. A page that stops partway is worse than a shorter page.",
  "Use semantic HTML and keep it accessible: real headings in order, labels on inputs, visible focus styles, and sufficient colour contrast.",
].join("\n- ");

const SYSTEM = [
  "You are a senior frontend engineer who writes clean, modern, production-quality HTML and CSS.",
  "You write real, specific copy — never lorem ipsum and never placeholder brackets.",
  "Your pages look designed, not templated: considered type scale, deliberate spacing, and restraint.",
  "Respond with a single JSON object matching the schema. The entire page goes in the `html` field. No prose outside the JSON.",
].join(" ");

/**
 * Build the starter site from the concept.
 *
 * The whole concept goes in, not just one page: the model needs the feature
 * list and the navigation to write a landing page that is actually about this
 * product. The generated artifact is a single landing page rather than the
 * whole multi-page site — one document is what the iframe and the download
 * both take, and a landing page is the page that has to be convincing.
 */
export function buildCoderPrompt(concept: Concept): { system: string; prompt: string } {
  const palette = concept.uiDirection.palette
    .map((entry) => `${entry.hex} (${entry.role}, "${entry.name}")`)
    .join(", ");

  const home = concept.pages[0];

  const prompt = [
    "Build the landing page for this product as a single HTML document.",
    "",
    "=== PRODUCT ===",
    `Name: ${concept.name}`,
    `Description: ${concept.description}`,
    "",
    "=== FEATURES (use these, with their real names and descriptions) ===",
    ...concept.features.map((f) => `- ${f.name}: ${f.description}`),
    "",
    "=== NAVIGATION (render it as a nav bar; see the link rule below) ===",
    concept.navigation.map((n) => n.label).join(" · "),
    "",
    "=== SECTIONS TO INCLUDE, IN ORDER ===",
    ...(home?.sections ?? []).map(
      (s) => `- ${s.type}: "${s.headline}" — ${s.body}`,
    ),
    "",
    "=== VISUAL DIRECTION (follow this closely) ===",
    `Style: ${concept.uiDirection.style}`,
    `Mood: ${concept.uiDirection.mood}`,
    `Typography: ${concept.uiDirection.typography}`,
    `Palette: ${palette}`,
    "",
    "=== HARD RULES ===",
    `- ${RUNTIME_RULES}`,
    "",
    "Expand the section copy into a full page — the headlines and body text above are the starting point, not the entire content.",
    "Add a footer. Finish the page; do not stop partway.",
  ].join("\n");

  return { system: SYSTEM, prompt };
}

/**
 * Apply one natural-language instruction to the page.
 *
 * Exactly the Editor pattern from `editor.ts`: current artifact plus
 * instruction returns the *complete* new artifact, not a patch. That is what
 * makes it idempotent and what makes the caller's job a single assignment. For
 * a single-page loop it is also all the "memory" that is needed — the current
 * HTML is the entire conversation state, which is why this feature needed no
 * agent framework and no message history.
 */
export function buildCodeEditorPrompt(
  currentHtml: string,
  instruction: string,
): { system: string; prompt: string } {
  const prompt = [
    "Here is the current page:",
    "",
    currentHtml,
    "",
    "=== THE CHANGE THE USER ASKED FOR ===",
    instruction,
    "",
    "=== HOW TO APPLY IT ===",
    "- Return the COMPLETE updated document, not a diff, not a fragment.",
    "- Change what the instruction asks for and leave everything else byte-for-byte alone.",
    "- If the instruction is vague, interpret it in the spirit of the existing design rather than redesigning the page.",
    `- ${RUNTIME_RULES}`,
  ].join("\n");

  return { system: SYSTEM, prompt };
}
