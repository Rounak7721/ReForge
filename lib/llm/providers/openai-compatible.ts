import "server-only";

import { z } from "zod";

import {
  LLMEmptyResponseError,
  LLMRateLimitError,
  LLMUpstreamError,
} from "@/lib/llm/errors";
import type { LLMProvider, LLMProviderName, StructuredRequest } from "@/lib/llm/types";

/**
 * One provider for every vendor that speaks the OpenAI Chat Completions wire
 * format. Today that is OpenAI itself and Groq.
 *
 * Groq is not "OpenAI-like", it is OpenAI-shaped on purpose: its endpoint is
 * literally `https://api.groq.com/openai/v1/chat/completions`, it takes the
 * same `response_format: {type: "json_schema"}`, and it answers with the same
 * `choices[0].message.content`. Writing two files would have been two copies of
 * this one differing only in a base URL.
 *
 * Deliberately `fetch` rather than the `openai` SDK. The endpoint is documented
 * and stable, the request is twenty lines, and every dependency with an install
 * script is a live risk in this repo — `pnpm-workspace.yaml`'s `allowBuilds`
 * has broken `pnpm install` here twice (docs/04-debugging-log.md 4 and its addendum).
 * A dependency that buys nothing is not worth that.
 */

const REQUEST_TIMEOUT_MS = 30_000;

const BASE_URLS: Partial<Record<LLMProviderName, string>> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
};

type JsonSchema = Record<string, unknown>;

/**
 * OpenAI's `strict: true` is the strongest guarantee available here, but it
 * demands that EVERY property appear in `required` and that every object set
 * `additionalProperties: false`. A zod schema with an `.optional()` field —
 * `analysisSchema.visualImpression` is exactly that — cannot satisfy it without
 * being rewritten as a nullable, which zod would then reject on the way back.
 *
 * So strictness is decided per schema rather than assumed: fully-required
 * schemas (the code generator's `{ html }`, the concept) get the hard
 * constraint, and anything with an optional field falls back to non-strict.
 * Non-strict still sends the schema and still guides the model — and zod
 * validation plus the stricter retry in `generate.ts` remain either way, so
 * the fallback loses a wire guarantee, never a correctness one.
 *
 * Note this is the mirror image of Gemini, which *rejects* `additionalProperties`
 * outright. Same zod schema, opposite translations — which is the clearest
 * evidence that this abstraction is doing real work rather than decorating one
 * vendor's API.
 */
export function canBeStrict(node: unknown): boolean {
  if (Array.isArray(node)) return node.every(canBeStrict);
  if (node === null || typeof node !== "object") return true;

  const record = node as Record<string, unknown>;
  const properties = record["properties"] as Record<string, unknown> | undefined;

  if (properties !== undefined) {
    const required = new Set((record["required"] as string[] | undefined) ?? []);
    if (Object.keys(properties).some((key) => !required.has(key))) return false;
  }

  return Object.values(record).every(canBeStrict);
}

/** Add `additionalProperties: false` to every object, as strict mode requires. */
export function sealObjects(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sealObjects);
  if (node === null || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$schema") continue;
    out[key] = sealObjects(value);
  }
  if (out["properties"] !== undefined) out["additionalProperties"] = false;
  return out;
}

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().optional(),
        message: z.object({ content: z.string().nullable().optional() }).optional(),
      }),
    )
    .optional(),
});

const errorBodySchema = z.object({
  error: z.object({ message: z.string().optional(), code: z.string().nullable().optional() }).optional(),
});

/**
 * Groq publishes its limits in response headers, and the daily and per-minute
 * buckets are reported separately. Which one was hit decides whether the UI
 * says "try again in a moment" or "that's it until tomorrow", so it is read
 * structurally rather than guessed.
 *
 * Measured on the free tier: 1000 requests/day, but only 8000 tokens/minute —
 * the token bucket is what a burst of code generation actually exhausts.
 */
function readRateLimit(response: Response): {
  scope: "per-minute" | "per-day" | "unknown";
  retryAfterSeconds?: number;
} {
  const retryAfter = Number(response.headers.get("retry-after") ?? Number.NaN);
  const seconds = Number.isFinite(retryAfter) ? Math.ceil(retryAfter) : undefined;

  // Both buckets are checked. Tokens are the binding constraint on this tier,
  // so looking only at the requests bucket reported a daily token exhaustion —
  // which never clears by waiting a minute — as a per-minute limit, and told
  // the user to retry something that could not succeed.
  const exhausted = (["requests", "tokens"] as const).find(
    (bucket) => response.headers.get(`x-ratelimit-remaining-${bucket}`) === "0",
  );
  if (exhausted !== undefined) {
    const reset = response.headers.get(`x-ratelimit-reset-${exhausted}`) ?? "";
    // A reset measured in hours, or in minutes-and-seconds, is a daily window.
    // A per-minute bucket refills in seconds.
    if (/\d+h/.test(reset) || /\d+m\d+/.test(reset)) {
      return { scope: "per-day", retryAfterSeconds: seconds };
    }
  }
  return { scope: "per-minute", retryAfterSeconds: seconds };
}

export function createOpenAICompatibleProvider(
  name: LLMProviderName,
  apiKey: string,
  model: string,
): LLMProvider {
  const baseUrl = BASE_URLS[name];
  if (baseUrl === undefined) {
    throw new LLMUpstreamError(`No OpenAI-compatible base URL is configured for "${name}".`);
  }

  return {
    name,
    model,
    // Both configured defaults are text-only. Left explicit rather than
    // computed: `supportsImages` gates whether the analyzer claims a screenshot
    // is attached, and getting it wrong makes the model describe a page it
    // never saw. A vision model here would flip this to true deliberately.
    supportsImages: false,

    async generateJson(request: StructuredRequest<unknown>): Promise<string> {
      const jsonSchema = sealObjects(
        z.toJSONSchema(request.schema, { io: "output" }) as JsonSchema,
      ) as JsonSchema;
      const strict = canBeStrict(jsonSchema);

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          body: JSON.stringify({
            model,
            messages: [
              ...(request.system === undefined
                ? []
                : [{ role: "system", content: request.system }]),
              { role: "user", content: request.prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: request.schemaName, strict, schema: jsonSchema },
            },
            max_completion_tokens: request.maxOutputTokens,
            temperature: request.temperature ?? 0.4,
            // The gpt-oss family are REASONING models, and reasoning tokens are
            // billed against `max_completion_tokens` — the same trap Gemini set
            // with `thinkingLevel` (docs/04-debugging-log.md entry 2), in a different
            // vendor's clothing.
            //
            // Measured: without this, an edit spent its budget thinking and the
            // constrained JSON decoder ran out mid-document, returning HTTP 400
            // "Failed to generate JSON" rather than anything that names the
            // real cause. With it, the same request used 70 reasoning tokens
            // and finished cleanly.
            //
            // Gated on the model name, not the provider: `reasoning_effort` is
            // rejected outright by non-reasoning models like gpt-4o-mini, so
            // sending it unconditionally would break the OpenAI path.
            ...(model.includes("gpt-oss") || /(^|\/)(o[1-9])(-|$)/.test(model)
              ? { reasoning_effort: "low" }
              : {}),
          }),
        });
      } catch (cause) {
        throw new LLMUpstreamError(
          `Could not reach ${name}.`,
          undefined,
          { cause },
        );
      }

      // 413 is a rate limit wearing a different status code. Groq charges the
      // prompt AND `max_completion_tokens` against one tokens-per-minute
      // budget before generating anything, so a request whose *reservation*
      // exceeds what the bucket has left is rejected as "too large" even
      // though nothing was consumed. Mapping it to LLMUpstreamError would tell
      // the user their request was malformed; it was not, it was early.
      if (response.status === 429 || response.status === 413) {
        const { scope, retryAfterSeconds } = readRateLimit(response);
        throw new LLMRateLimitError(scope, retryAfterSeconds);
      }

      if (!response.ok) {
        // The body carries the actionable part — an invalid key, a withdrawn
        // model — and a bare status code would send the reader to the wrong
        // place entirely.
        const detail = errorBodySchema.safeParse(await response.json().catch(() => null));
        const message = detail.success ? detail.data.error?.message : undefined;
        throw new LLMUpstreamError(
          `${name} request failed with status ${response.status}${
            message === undefined ? "" : `: ${message}`
          }`,
          response.status,
        );
      }

      const body = responseSchema.safeParse(await response.json().catch(() => null));
      if (!body.success) {
        throw new LLMUpstreamError(`${name} returned a response in an unexpected shape.`);
      }

      const choice = body.data.choices?.[0];
      const text = choice?.message?.content?.trim() ?? "";
      // Same failure mode as Gemini's empty `parts`: a length-capped response
      // comes back HTTP 200 with nothing usable in it, and must be a typed
      // error rather than a JSON parse failure three frames later.
      if (text.length === 0) throw new LLMEmptyResponseError(choice?.finish_reason);

      return text;
    },
  };
}
