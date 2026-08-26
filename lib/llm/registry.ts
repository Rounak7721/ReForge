import "server-only";

import { llmEnv } from "@/lib/env";
import { LLMUpstreamError } from "@/lib/llm/errors";
import { createGeminiProvider } from "@/lib/llm/providers/gemini";
import type { LLMProvider, LLMProviderName } from "@/lib/llm/types";

/**
 * Provider selection. Switching vendor or model is an env change only —
 * `LLM_PROVIDER` plus that vendor's `*_API_KEY` / `*_MODEL` — with zero edits
 * to the analyzer, builder or editor.
 *
 * Adding a vendor is one new file in `providers/` and one line below.
 *
 * `gemini` is the only provider that is enabled: the project's cost rule says
 * runtime inference is free-tier Gemini. The other two entries are deliberate —
 * they keep the swap contract honest and make the missing piece a single
 * `createXProvider` call rather than a refactor.
 */
const FACTORIES: Record<LLMProviderName, () => LLMProvider> = {
  gemini: () => {
    const env = llmEnv();
    return createGeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  },
  openai: () => {
    throw new LLMUpstreamError(
      "LLM_PROVIDER=openai is not enabled. Add lib/llm/providers/openai.ts and wire it here.",
    );
  },
  anthropic: () => {
    throw new LLMUpstreamError(
      "LLM_PROVIDER=anthropic is not enabled. Add lib/llm/providers/anthropic.ts and wire it here.",
    );
  },
};

let cached: LLMProvider | undefined;

/**
 * The active provider, memoised for the lifetime of the server process so the
 * vendor client is constructed once rather than per request.
 */
export function getLLM(): LLMProvider {
  cached ??= FACTORIES[llmEnv().LLM_PROVIDER]();
  return cached;
}
