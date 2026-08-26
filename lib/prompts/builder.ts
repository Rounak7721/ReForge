import { z } from "zod";

import type { Analysis } from "@/lib/prompts/analyzer";

/**
 * The Builder: step 2 of the pipeline. Analysis → product concept.
 *
 * **Array minimums are 1, not 3, and that is deliberate.** This schema is shared
 * with the Editor, and "remove the pricing page" is a first-class instruction —
 * a built-in suggestion chip. A `min(3)` on `pages` means the third removal is
 * unsatisfiable: zod rejects the model's correct answer, the stricter retry
 * rejects it again, and the user hits a permanent dead end having spent two
 * requests. Validity and richness are different concerns: the schema enforces
 * what is *structurally valid*, and `buildBuilderPrompt` asks for 4-6 pages to
 * get a *good first draft*.
 *
 * The six fields below are the six bullets in
 * `project_guidelines/02-functional-requirements.md` §3, one for one.
 *
 * **This shape was chosen by measurement, not preference.** Three candidate wire
 * formats (nested JSON / XML / flat JSON with string sections) were run head to
 * head over 42 live Gemini calls — build, narrow edit, structural edit and a
 * depth-stress build. All three scored 100%, so nesting is not the reliability
 * risk it was assumed to be. Nested JSON won on two secondary grounds: Gemini
 * enforces `responseJsonSchema` on the wire (XML has no equivalent), and
 * `sections[]` is already the shape a visual preview or a code generator needs.
 * See `docs/PROMPTS.md` entry 3.
 *
 * **Extending this is additive.** `concept` is a `jsonb` column, so new optional
 * fields need no migration. Add them as `.optional()` here first so existing
 * rows keep validating, and render them behind a presence check in ConceptView.
 */

/**
 * One colour in the product's palette.
 *
 * `role` exists so the UI can still paint a realistic mock — it needs to know
 * which colour is the page and which is the type — without constraining how
 * many colours there are. Exactly one surface and one text are expected;
 * everything beyond primary is an accent, and there can be as many as the
 * product calls for.
 */
const paletteEntrySchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("What this colour is called, e.g. 'Deep Crimson' or 'Antique Gold'."),
  hex: z.string().min(1).describe("The colour as a hex code, e.g. '#8C1C2B'."),
  role: z
    .enum(["primary", "surface", "text", "accent"])
    .describe(
      "'surface' is the page background, 'text' is body copy, 'primary' is the main " +
        "brand colour. Every additional colour is an 'accent'.",
    ),
});

const featureSchema = z.object({
  name: z.string().min(1).describe("Short feature name, 2-4 words. No marketing adjectives."),
  description: z
    .string()
    .min(1)
    .describe("One sentence on what it does for the user, not how it is built."),
});

const navigationSchema = z.object({
  label: z.string().min(1).describe("The link text as it appears in the nav bar."),
  path: z
    .string()
    .min(1)
    .describe("Root-relative path starting with '/', e.g. '/pricing'. Must match a page's path."),
});

/**
 * `type` is a soft vocabulary, deliberately a string rather than a zod enum: an
 * enum would fail validation on a reasonable section the list didn't anticipate,
 * costing a retry. A future visual renderer switches on these values and falls
 * back to a generic block for anything unrecognised.
 */
const sectionSchema = z.object({
  type: z
    .string()
    .min(1)
    .describe(
      "Section kind, lowercase. Prefer one of: hero, features, how-it-works, testimonial, pricing, faq, cta, form, list, table, stats, footer.",
    ),
  headline: z.string().min(1).describe("The section's visible heading."),
  body: z.string().min(1).describe("One or two sentences of the section's actual copy."),
});

const pageSchema = z.object({
  name: z.string().min(1).describe("Page name as a person would say it, e.g. 'Pricing'."),
  path: z.string().min(1).describe("Root-relative path starting with '/'. '/' for the home page."),
  sections: z
    .array(sectionSchema)
    .min(1)
    .max(6)
    .describe("The page's sections, in the order they appear top to bottom."),
});

export const conceptSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("The product's name. Inventive and pronounceable, not a description."),
  description: z
    .string()
    .min(1)
    .describe("Two or three sentences positioning the product. Written for the target customer."),
  features: z.array(featureSchema).min(1).max(8),
  navigation: z
    .array(navigationSchema)
    .min(1)
    .max(7)
    .describe("The primary nav. Every entry must point at a page defined in `pages`."),
  pages: z
    .array(pageSchema)
    .min(1)
    .max(8)
    .describe("Every page in the product. Every page should be reachable from `navigation`."),
  uiDirection: z.object({
    style: z.string().min(1).describe("The visual style in a short phrase, e.g. 'Editorial and spacious'."),
    mood: z.string().min(1).describe("How it should feel, e.g. 'Confident, quiet, unhurried'."),
    typography: z
      .string()
      .min(1)
      .describe("Concrete typeface direction, e.g. 'Instrument Serif headings, Inter body'."),
    palette: z
      .array(paletteEntrySchema)
      .min(1)
      .max(10)
      .describe(
        "The product's colours. Include at least a surface, a text and a primary; " +
          "add as many accents as the product genuinely needs. If the user names " +
          "specific colours, return one entry for EVERY colour they named.",
      ),
  }),
});

export type Concept = z.infer<typeof conceptSchema>;
export type PaletteEntry = z.infer<typeof paletteEntrySchema>;

/**
 * Reader for a `concept` column, tolerant of the pre-2026-08-26 palette.
 *
 * The palette used to be a fixed `{primary, surface, text}` object, which meant
 * the *schema itself* capped the product at three colours — asking for "red,
 * gold, black and white" could not succeed no matter how the prompt was worded.
 * It is now an open list.
 *
 * Rows written before that change still hold the old object, and the demo seed
 * is one of them. This upgrades them on read rather than migrating the table:
 * `concept` is `jsonb` with no schema to alter, a migration would rewrite rows
 * we can regenerate for free, and a read-time shim keeps working for any row
 * restored from an old backup later.
 *
 * Kept separate from `conceptSchema` on purpose. `conceptSchema` is converted
 * to JSON Schema and sent to Gemini on the wire, so it has to stay a clean
 * single shape — a union or a preprocess there would either fail to convert or
 * describe two contradictory formats to the model.
 */
const legacyPaletteSchema = z.object({
  primary: z.string().min(1),
  surface: z.string().min(1),
  text: z.string().min(1),
});

export const storedConceptSchema = conceptSchema.extend({
  uiDirection: conceptSchema.shape.uiDirection.extend({
    palette: z.union([
      z.array(paletteEntrySchema).min(1).max(10),
      legacyPaletteSchema.transform((old): PaletteEntry[] => [
        { name: "Primary", hex: old.primary, role: "primary" },
        { name: "Surface", hex: old.surface, role: "surface" },
        { name: "Text", hex: old.text, role: "text" },
      ]),
    ]),
  }),
});

const SYSTEM = [
  "You are a senior product designer turning a competitive analysis into a concrete, buildable product concept.",
  "Be specific and opinionated. Name real sections with real copy, not placeholders.",
  "Keep pages and navigation consistent: every navigation item must point at a page you defined, and every page should be reachable from the navigation.",
  "Use realistic hex colours that work together. Choose as many as the product actually needs — a restrained brand may want three, a richer one six or more. Never trim a palette to hit a number.",
  "Respond with a single JSON object matching the schema. No prose outside it.",
].join(" ");

export function buildBuilderPrompt(input: {
  analysis: Analysis;
  description: string;
  targetCustomer: string;
}): { system: string; prompt: string } {
  const { analysis, description, targetCustomer } = input;

  const prompt = [
    "=== ANALYSIS OF THE EXISTING PRODUCT (context, not the thing to build) ===",
    JSON.stringify(analysis, null, 2),
    "",
    "=== THE PRODUCT TO DESIGN ===",
    description,
    "",
    "=== TARGET CUSTOMER ===",
    targetCustomer,
    "",
    // Stated explicitly rather than left to the schema's min/max. Under a
    // depth-stress probe the model treated the schema bounds as permission to
    // under-deliver, returning 5 pages where a stated count returned 7.
    "Design the new product. Propose exactly 4 to 6 pages, each with 2 to 4 sections,",
    "a matching navigation entry for every page, and 4 to 6 features.",
    "The MVP feature list in the analysis is the strongest signal for what to include.",
  ].join("\n");

  return { system: SYSTEM, prompt };
}
