import { z } from "zod";

import type { SiteContent } from "@/lib/scrape/fetch-site";

/**
 * The Analyzer: step 1 of the three-call pipeline.
 *
 * The seven fields below are the seven bullets in
 * `project_guidelines/02-functional-requirements.md` §2, one for one. Do not
 * add an eighth "for completeness" and do not merge two — each one is a
 * gradeable item.
 *
 * Field descriptions are not documentation. `z.toJSONSchema` carries them onto
 * the wire, so the model reads them; keep them written as instructions.
 */
export const analysisSchema = z.object({
  whatItDoes: z
    .string()
    .min(1)
    .describe(
      "2-4 sentences on what the existing product actually does today, in plain language. Describe only what the evidence supports; do not invent capabilities.",
    ),
  targetUsers: z
    .array(z.string().min(1))
    .min(2)
    .max(6)
    .describe(
      "The distinct groups of people this product currently serves. One short phrase each, e.g. 'Freelance designers billing hourly'.",
    ),
  coreProblem: z
    .string()
    .min(1)
    .describe(
      "2-3 sentences naming the single most important problem the product solves for those users, and why it matters to them.",
    ),
  keyFeatures: z
    .array(z.string().min(1))
    .min(3)
    .max(8)
    .describe(
      "The product's most important existing capabilities. One short phrase each, no marketing adjectives.",
    ),
  businessModel: z
    .string()
    .min(1)
    .describe(
      "2-3 sentences on how the product makes money — pricing shape, tiers, who pays. If the site does not say, state your best inference and label it as an inference.",
    ),
  suggestedImprovements: z
    .array(z.string().min(1))
    .min(3)
    .max(6)
    .describe(
      "Concrete, specific improvements to the existing product. Each is one sentence naming the change and the benefit. No generic advice like 'improve the UX'.",
    ),
  mvpFeatures: z
    .array(z.string().min(1))
    .min(4)
    .max(8)
    .describe(
      "The smallest feature set for a NEW product built from the user's description for their target customer. One short phrase each, ordered most essential first.",
    ),

  /**
   * What the page LOOKS like. Present only when a screenshot was captured.
   *
   * Optional, and that is load-bearing in two directions. Rows analysed before
   * this field existed still validate, so no migration and no backfill. And a
   * text-only analysis — microlink timed out, or rate-limited us — simply
   * omits it instead of failing schema validation and burning the retry.
   *
   * These are deliberately three things the scraped text cannot answer. Adding
   * a field the text already covers would spend vision tokens to duplicate
   * what we have.
   */
  visualImpression: z
    .object({
      style: z
        .string()
        .min(1)
        .describe(
          "The visual style in one or two sentences, as a designer would describe it — not what the page says, what it looks like.",
        ),
      layoutDensity: z
        .string()
        .min(1)
        .describe(
          "How the page uses space: sparse and editorial, dense and utilitarian, or somewhere between. One sentence, with what in the screenshot shows it.",
        ),
      colourTreatment: z
        .string()
        .min(1)
        .describe(
          "The palette and how colour is used — dominant colours, where accent colour is spent, light or dark. One or two sentences.",
        ),
    })
    .optional()
    .describe(
      "Fill this in ONLY if you were given a screenshot. If you were given text alone, omit it entirely — never guess at appearance from copy.",
    ),
});

export type Analysis = z.infer<typeof analysisSchema>;

const SYSTEM = [
  "You are a senior product strategist reviewing a company's website on behalf of a founder who wants to build something adjacent to it.",
  "You are given text scraped from the site — it is partial, unordered, and may include navigation fragments — and sometimes a screenshot of the page. Reason from what you are given, but never claim a capability it does not evidence.",
  "The founder's own description and target customer are ground truth about what THEY want to build; the site is evidence about what ALREADY exists. Keep the two straight.",
  "Be specific and concrete. Generic consulting language is a failure.",
  "Respond with a single JSON object matching the schema. No prose outside it.",
].join(" ");

export function buildAnalyzerPrompt(input: {
  site: SiteContent;
  description: string;
  targetCustomer: string;
  /** True when a screenshot is attached to the same call. */
  hasScreenshot?: boolean;
}): { system: string; prompt: string } {
  const { site, description, targetCustomer, hasScreenshot = false } = input;

  const siteBlock = site.thin
    ? [
        "The site is client-rendered and returned almost no readable text.",
        "All you have is its metadata, so lean harder on the founder's description and say what you infer.",
        `URL: ${site.finalUrl}`,
        `Title: ${site.title || "(none)"}`,
        `Meta description: ${site.description || "(none)"}`,
      ].join("\n")
    : [
        `URL: ${site.finalUrl}`,
        `Title: ${site.title || "(none)"}`,
        `Meta description: ${site.description || "(none)"}`,
        "",
        "Page text:",
        site.text,
      ].join("\n");

  const prompt = [
    "=== EXISTING PRODUCT (analyze this) ===",
    siteBlock,
    "",
    "=== WHAT THE FOUNDER WANTS TO BUILD ===",
    description,
    "",
    "=== THEIR TARGET CUSTOMER ===",
    targetCustomer,
    "",
    "Analyze the existing product across the six descriptive fields, then propose an MVP feature set for the founder's product in `mvpFeatures`.",
    "`suggestedImprovements` is about the EXISTING product. `mvpFeatures` is about the FOUNDER'S new product. Do not confuse them.",
    // Stated as an explicit instruction rather than left to the field
    // description alone: the schema marks `visualImpression` optional, and an
    // optional field with no prompt pressure behind it gets skipped.
    ...(hasScreenshot
      ? [
          "",
          "A SCREENSHOT of the page is attached. Use it for `visualImpression`, and let it inform the rest where it disagrees with the text.",
          "The screenshot is the only evidence of appearance — describe what you can actually see in it, not what the copy implies.",
        ]
      : [
          "",
          "No screenshot is available. Omit `visualImpression` entirely rather than inferring appearance from the text.",
        ]),
  ].join("\n");

  return { system: SYSTEM, prompt };
}
