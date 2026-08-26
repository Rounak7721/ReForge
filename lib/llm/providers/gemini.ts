import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

import {
  LLMEmptyResponseError,
  LLMRateLimitError,
  LLMUpstreamError,
} from "@/lib/llm/errors";
import type { LLMProvider, StructuredRequest } from "@/lib/llm/types";

/**
 * The ONLY file in the codebase allowed to import `@google/genai`.
 *
 * If you are about to call a model SDK from a route, a component or a prompt
 * module, stop — go through `generateStructured` from `@/lib/llm` instead.
 */

/**
 * Wall-clock ceiling for a single generation.
 *
 * Sized so the worst case fits Vercel Hobby's 60s function ceiling:
 * 8s site fetch + 20s first call + 20s stricter retry = 48s, with headroom.
 * Observed latency is 3-5s, so this is generous rather than tight.
 */
const REQUEST_TIMEOUT_MS = 20_000;

type JsonSchema = Record<string, unknown>;

/**
 * Gemini's `responseJsonSchema` accepts a subset of JSON Schema. `$schema` and
 * `additionalProperties` — both of which zod emits by default — are not part of
 * it and cause a 400, so they are stripped recursively.
 *
 * `propertyOrdering` is Google's own recommendation: without it the model may
 * emit keys in an arbitrary order, which measurably degrades output quality on
 * the Flash models.
 */
function toGeminiSchema(schema: z.ZodType<unknown>): JsonSchema {
  const jsonSchema = z.toJSONSchema(schema, { io: "output" }) as JsonSchema;
  return sanitize(jsonSchema) as JsonSchema;
}

function sanitize(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitize);
  if (node === null || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$schema" || key === "additionalProperties") continue;
    out[key] = sanitize(value);
  }

  const properties = out["properties"];
  if (properties !== undefined && typeof properties === "object" && properties !== null) {
    out["propertyOrdering"] = Object.keys(properties as Record<string, unknown>);
  }
  return out;
}

/**
 * Pull the quota scope out of a 429.
 *
 * `ApiError.message` is the JSON-stringified Google error body, so this reads
 * `error.details[].violations[].quotaId` structurally rather than matching on
 * message text. It matters: a `...PerDay...` violation never clears on retry,
 * while a per-minute one clears within the minute, and the UI must say which.
 */
const quotaBodySchema = z.object({
  error: z.object({
    details: z
      .array(
        z.object({
          violations: z.array(z.object({ quotaId: z.string().optional() })).optional(),
          retryDelay: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

function readQuotaDetails(message: string): {
  scope: "per-minute" | "per-day" | "unknown";
  retryAfterSeconds?: number;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return { scope: "unknown" };
  }

  const body = quotaBodySchema.safeParse(parsed);
  if (!body.success) return { scope: "unknown" };

  const details = body.data.error.details ?? [];
  const quotaIds = details.flatMap(
    (detail) => detail.violations?.map((violation) => violation.quotaId ?? "") ?? [],
  );

  const scope = quotaIds.some((id) => id.includes("PerDay"))
    ? "per-day"
    : quotaIds.some((id) => id.includes("PerMinute"))
      ? "per-minute"
      : "unknown";

  const retryDelay = details.find((detail) => detail.retryDelay !== undefined)?.retryDelay;
  const seconds = retryDelay === undefined ? Number.NaN : Number.parseFloat(retryDelay);

  return {
    scope,
    retryAfterSeconds: Number.isFinite(seconds) ? Math.ceil(seconds) : undefined,
  };
}

export function createGeminiProvider(apiKey: string, model: string): LLMProvider {
  const client = new GoogleGenAI({ apiKey });

  return {
    name: "gemini",
    model,
    // Every Gemini Flash model in the 3.x line is multimodal, which is what
    // makes the screenshot analysis free: the image is one more part on a call
    // that was already being made.
    supportsImages: true,

    async generateJson(request: StructuredRequest<unknown>): Promise<string> {
      // Held so the catch block can tell "we timed out" from any other abort.
      // The SDK forwards cancellation through its own AbortController and calls
      // `abort()` with no reason, so our TimeoutError never reaches the caller —
      // checking the signal we own is the only reliable test.
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

      let response;
      try {
        response = await client.models.generateContent({
          model,
          // A bare string is shorthand for a single text part. As soon as there
          // is an image the parts have to be spelled out — text first, so the
          // model reads the instructions before the picture.
          contents:
            request.image === undefined
              ? request.prompt
              : [
                  {
                    role: "user",
                    parts: [
                      { text: request.prompt },
                      {
                        inlineData: {
                          mimeType: request.image.mimeType,
                          data: request.image.data,
                        },
                      },
                    ],
                  },
                ],
          config: {
            ...(request.system === undefined ? {} : { systemInstruction: request.system }),
            responseMimeType: "application/json",
            responseJsonSchema: toGeminiSchema(request.schema),
            maxOutputTokens: request.maxOutputTokens,
            temperature: request.temperature ?? 0.4,
            // Not a portable "disable thinking" switch — flash-lite still emits
            // ~100 thought tokens with this set, the inverse of 3.6-flash. The
            // real protection is the token floor in generate.ts.
            // See docs/DEBUGGING.md entry 2.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: timeout,
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 429) {
            const { scope, retryAfterSeconds } = readQuotaDetails(error.message);
            throw new LLMRateLimitError(scope, retryAfterSeconds, { cause: error });
          }
          throw new LLMUpstreamError(
            `Gemini request failed with status ${error.status}.`,
            error.status,
            { cause: error },
          );
        }
        if (timeout.aborted) {
          throw new LLMUpstreamError("The model took too long to respond.", undefined, {
            cause: error,
          });
        }
        throw new LLMUpstreamError("Could not reach the model provider.", undefined, {
          cause: error,
        });
      }

      // Never index into `parts` blind. On MAX_TOKENS Gemini returns HTTP 200
      // with `content: {}` and no `parts` array at all, so the SDK-example
      // accessor `parts[0].text` throws a TypeError rather than yielding
      // undefined. docs/DEBUGGING.md entry 2.
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts;
      if (parts === undefined || parts.length === 0) {
        throw new LLMEmptyResponseError(candidate?.finishReason);
      }

      const text = parts
        .filter((part) => part.thought !== true)
        .map((part) => part.text ?? "")
        .join("")
        .trim();

      if (text.length === 0) {
        throw new LLMEmptyResponseError(candidate?.finishReason);
      }

      return text;
    },
  };
}
