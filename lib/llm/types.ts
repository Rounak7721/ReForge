import type { z } from "zod";

/**
 * The vendor-neutral contract every provider implements.
 *
 * Feature code never sees this file's types directly — it calls
 * `generateStructured` from `@/lib/llm` and gets back a validated object. The
 * contract exists so that adding a vendor is one new file in `providers/` plus
 * one line in `registry.ts`, with zero edits to the analyzer/builder/editor.
 */

export type LLMProviderName = "gemini" | "openai" | "anthropic";

export type StructuredRequest<T> = {
  /**
   * The zod schema is the single source of truth. It is converted to the
   * vendor's native schema format so the model is constrained on the wire, and
   * it validates the response afterwards — the two can never drift apart.
   *
   * Field-level `.describe()` text reaches the model, so put prompt guidance
   * for an individual field on the field rather than in the prompt body.
   */
  schema: z.ZodType<T>;
  /** Some vendors require the schema to be named (OpenAI, Anthropic tools). */
  schemaName: string;
  system?: string;
  prompt: string;
  /**
   * A ceiling on THINKING + OUTPUT combined, not on output alone, for every
   * reasoning model in the Gemini 3.x family. `generateStructured` raises this
   * to a floor before it reaches a provider — see `generate.ts`.
   */
  maxOutputTokens: number;
  temperature?: number;
  /**
   * An optional image for the model to look at alongside the prompt.
   *
   * Optional rather than a separate method on purpose: a vendor that cannot
   * accept images simply ignores the field, and every caller that does not
   * send one is unchanged. Adding `generateJsonWithImage` would have forced
   * every provider and the retry policy in `generate.ts` to grow a parallel
   * path for one extra request part.
   *
   * `data` is base64 with no `data:` prefix.
   */
  image?: { data: string; mimeType: string };
};

export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly model: string;
  /**
   * Whether this provider's configured model can read `StructuredRequest.image`.
   *
   * Callers must branch on this, not assume it. The analyzer prompt states in
   * words that a screenshot is attached, so pairing it with a provider that
   * silently drops the image does not merely lose the picture — it invites the
   * model to invent a description of a page it never saw, which is precisely
   * what the optional `visualImpression` field exists to prevent.
   *
   * A property rather than a lookup table because it depends on the MODEL, not
   * the vendor: the same provider file serves vision and text-only models.
   */
  readonly supportsImages: boolean;
  /**
   * Returns the model's raw JSON text. Providers own transport, the vendor's
   * schema dialect, and error mapping; they do NOT parse or validate, so that
   * the retry policy lives in one place for every vendor.
   */
  generateJson(request: StructuredRequest<unknown>): Promise<string>;
}
