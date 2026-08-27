import "server-only";

import type { z } from "zod";

import { LLMInvalidOutputError } from "@/lib/llm/errors";
import { getLLM } from "@/lib/llm/registry";
import type { LLMProviderName, StructuredRequest } from "@/lib/llm/types";

/**
 * The one entry point feature code uses to talk to a model.
 *
 * Owns two things every caller would otherwise re-implement: the token floor,
 * and the single stricter retry on malformed output.
 */

/**
 * Lower bound on `maxOutputTokens`, applied regardless of what the caller asks
 * for.
 *
 * `maxOutputTokens` caps THINKING + OUTPUT combined on the Gemini 3.x models,
 * and `thinkingLevel: "low"` is not honoured uniformly across the family —
 * flash-lite still spends ~100 tokens reasoning with it set. A budget tuned to
 * one model therefore returns HTTP 200 with an empty `content` on its sibling.
 *
 * The floor is the portable defence: a model swap that ignores the thinking
 * hint degrades to "slower and pricier" instead of "silently returns nothing".
 * See docs/04-debugging-log.md entry 2.
 */
const MIN_OUTPUT_TOKENS = 2048;

const STRICT_RETRY_PREAMBLE = [
  "Your previous response did not match the required JSON schema.",
  "Return ONLY a single JSON object that satisfies the schema exactly.",
  "No markdown, no code fences, no commentary, no trailing text.",
  "Every required field must be present and non-empty.",
  "Schema violations from the previous attempt:",
].join(" ");

export type GenerateStructuredOptions<T> = Omit<StructuredRequest<T>, "maxOutputTokens"> & {
  maxOutputTokens?: number;
  /**
   * Run on a specific provider instead of `LLM_PROVIDER`.
   *
   * Exists for one real case, not for symmetry: code generation runs on Groq
   * while analysis, build and refine stay on Gemini. Keeping the two on
   * separate vendors keeps their daily quotas separate, so generating pages
   * cannot exhaust the budget the rest of the pipeline depends on.
   */
  provider?: LLMProviderName;
};

/**
 * Prompt the active provider and return a zod-validated object.
 *
 * Nothing unvalidated ever escapes this function — callers get `T` or a typed
 * `LLMError`, so no route has to defend against a malformed model payload.
 */
export async function generateStructured<T>(
  options: GenerateStructuredOptions<T>,
): Promise<T> {
  const provider = getLLM(options.provider);
  const maxOutputTokens = Math.max(options.maxOutputTokens ?? 0, MIN_OUTPUT_TOKENS);

  // `provider` selects the vendor; it is not part of the wire request, so it
  // is stripped rather than passed on to `generateJson`.
  const wire = { ...options };
  delete wire.provider;
  const request: StructuredRequest<T> = { ...wire, maxOutputTokens };

  const first = await attempt(provider.generateJson.bind(provider), request, options.schema);
  if (first.ok) return first.value;

  // One retry only. Each attempt spends a request from a 500/day budget shared
  // with whoever is evaluating this, so a retry loop is a real cost, not a
  // free safety net.
  //
  // ponytail: on Groq the retry usually cannot succeed. That tier reserves
  // prompt + max_completion_tokens against a single 8000 tokens-per-minute
  // bucket, and the first attempt has already spent most of it, so a second
  // request in the same minute is rejected with 413 — surfaced to the user as
  // a rate limit. The behaviour is still SAFE: the truncation guard in
  // `generatedSiteSchema` refuses to persist a half-written page either way,
  // and retrying a minute later works. Fixing it properly means either
  // per-call "don't retry" opt-out or waiting out the bucket inside the
  // request, and neither is worth it while one attempt succeeds in practice.
  const retryRequest: StructuredRequest<T> = {
    ...request,
    prompt: [
      request.prompt,
      "",
      STRICT_RETRY_PREAMBLE,
      describeIssues(first.error.issues),
    ].join("\n"),
  };

  const second = await attempt(
    provider.generateJson.bind(provider),
    retryRequest,
    options.schema,
  );
  if (second.ok) return second.value;

  throw second.error;
}

type Attempt<T> = { ok: true; value: T } | { ok: false; error: LLMInvalidOutputError };

async function attempt<T>(
  generateJson: (request: StructuredRequest<unknown>) => Promise<string>,
  request: StructuredRequest<T>,
  schema: z.ZodType<T>,
): Promise<Attempt<T>> {
  // Transport and empty-response errors propagate: they are not schema
  // problems, and re-prompting for stricter JSON would not fix them.
  const raw = await generateJson(request as StructuredRequest<unknown>);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch (cause) {
    return { ok: false, error: new LLMInvalidOutputError(undefined, raw, { cause }) };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: new LLMInvalidOutputError(result.error.issues, raw) };
  }

  return { ok: true, value: result.data };
}

/**
 * `responseMimeType: "application/json"` should make this unnecessary, but
 * models still occasionally wrap JSON in a fenced block, and one `replace` is
 * cheaper than burning a retry on it.
 */
function stripCodeFence(text: string): string {
  // The newline after the opening fence is optional: models emit single-line
  // fenced JSON often enough that requiring it would burn the one retry this
  // helper exists to save.
  const fenced = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/.exec(text);
  return fenced?.[1] ?? text;
}

function describeIssues(issues: readonly z.core.$ZodIssue[] | undefined): string {
  if (issues === undefined || issues.length === 0) {
    return "- the response was not valid JSON at all";
  }
  return issues
    .slice(0, 10)
    .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}
