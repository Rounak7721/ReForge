import { apiError } from "@/lib/api/errors";
import { isLLMError, LLMEmptyResponseError, LLMInvalidOutputError, LLMRateLimitError, LLMUpstreamError } from "@/lib/llm";
import { SiteFetchError } from "@/lib/scrape/fetch-site";

/**
 * Maps a pipeline failure onto our API envelope. Shared by /api/analyze,
 * /api/build and /api/refine so all three degrade identically.
 *
 * Branches on the error class, never on message text — same reasoning as
 * `fromAuthError`.
 */
export function fromPipelineError(error: unknown, context: string) {
  if (error instanceof SiteFetchError) {
    // The message is written for the user and names the cause, so pass it
    // through rather than flattening every fetch failure to one string.
    return apiError("site_unreachable", error.message);
  }

  if (error instanceof LLMRateLimitError) {
    if (error.scope === "per-day") {
      // A daily quota does not clear on retry. Telling the user to try again
      // in a moment would waste their time — say what is actually true.
      return apiError(
        "quota_exhausted",
        "Reforge has used its free AI quota for today. It resets at midnight Pacific time — saved projects still open normally in the meantime.",
      );
    }

    const wait =
      error.retryAfterSeconds === undefined
        ? "a few seconds"
        : `about ${error.retryAfterSeconds} seconds`;
    return apiError(
      "rate_limited",
      `Too many AI requests at once. Wait ${wait} and try again.`,
    );
  }

  if (error instanceof LLMEmptyResponseError) {
    console.error(`[${context}] empty model response`, { finishReason: error.finishReason });
    return apiError("upstream_error", "The AI returned an empty response. Please try again.");
  }

  if (error instanceof LLMInvalidOutputError) {
    console.error(`[${context}] model output failed validation after retry`, {
      issues: error.issues,
      rawText: error.rawText.slice(0, 2000),
    });
    return apiError(
      "upstream_error",
      "The AI returned a malformed result. Please try again.",
    );
  }

  if (error instanceof LLMUpstreamError) {
    console.error(`[${context}] upstream failure`, {
      status: error.status,
      message: error.message,
      cause: error.cause,
    });
    return apiError("upstream_error", "The AI service is unavailable right now. Please try again.");
  }

  // Unmapped. Log it — a silent catch-all is where the next bug hides.
  console.error(`[${context}] unmapped error`, {
    isLLM: isLLMError(error),
    error,
  });
  return apiError("internal_error", "Something went wrong. Please try again.");
}
