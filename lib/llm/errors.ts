import type { z } from "zod";

/**
 * Typed LLM failures.
 *
 * Route handlers branch on `code`, never on a message substring — the same
 * discipline as `lib/api/supabase-auth-error.ts`. The distinctions here are not
 * cosmetic: a per-minute rate limit clears on retry and a per-day one never
 * does, and telling the user the wrong one wastes their time.
 */

export type LLMErrorCode =
  | "rate_limit"
  | "empty_response"
  | "invalid_output"
  | "upstream";

export abstract class LLMError extends Error {
  abstract readonly code: LLMErrorCode;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export function isLLMError(error: unknown): error is LLMError {
  return error instanceof LLMError;
}

/**
 * 429 from the vendor. `scope` is the whole point of this class: the free tier
 * is 15 requests/minute AND 500 requests/day, and only the first is worth
 * retrying.
 */
export class LLMRateLimitError extends LLMError {
  readonly code = "rate_limit" as const;

  constructor(
    readonly scope: "per-minute" | "per-day" | "unknown",
    readonly retryAfterSeconds?: number,
    options?: { cause?: unknown },
  ) {
    super(`Rate limited by the model provider (${scope}).`, options);
  }
}

/**
 * HTTP 200 with no usable content. Gemini returns `content: {}` with no `parts`
 * array when thinking consumes the entire token budget; `finishReason` is what
 * makes that diagnosable rather than a mystery 500.
 *
 * See docs/DEBUGGING.md entry 2.
 */
export class LLMEmptyResponseError extends LLMError {
  readonly code = "empty_response" as const;

  constructor(
    readonly finishReason?: string,
    options?: { cause?: unknown },
  ) {
    super(
      `The model returned no content (finishReason: ${finishReason ?? "unknown"}).`,
      options,
    );
  }
}

/** The model replied, but the payload was not JSON matching the schema. */
export class LLMInvalidOutputError extends LLMError {
  readonly code = "invalid_output" as const;

  constructor(
    readonly issues: readonly z.core.$ZodIssue[] | undefined,
    readonly rawText: string,
    options?: { cause?: unknown },
  ) {
    super("The model returned output that did not match the expected schema.", options);
  }
}

/** Anything else the vendor did: 4xx, 5xx, network failure, timeout. */
export class LLMUpstreamError extends LLMError {
  readonly code = "upstream" as const;

  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
