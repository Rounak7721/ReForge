import "server-only";

import { llmEnv } from "@/lib/env";
import { LLMUpstreamError } from "@/lib/llm/errors";
import { createGeminiProvider } from "@/lib/llm/providers/gemini";
import { createOpenAICompatibleProvider } from "@/lib/llm/providers/openai-compatible";
import type { LLMProvider, LLMProviderName } from "@/lib/llm/types";

/**
 * Provider selection. Switching vendor or model is an env change only —
 * `LLM_PROVIDER` plus that vendor's `*_API_KEY` / `*_MODEL` — with zero edits
 * to the analyzer, builder, editor or code generator.
 *
 * Adding a vendor is one new file in `providers/` and one line below. Groq and
 * OpenAI share a file because Groq serves the OpenAI Chat Completions API
 * verbatim, base URL aside.
 *
 * Anthropic was considered and deliberately left out: the brief asks for one
 * runtime model, the cost rule says free tier, and a fourth provider with no
 * key behind it would be scaffolding rather than proof. The layer's
 * swappability is demonstrated by Groq and Gemini actually running side by
 * side in production, not by the length of this table.
 */
const FACTORIES: Record<LLMProviderName, (apiKey: string, model: string) => LLMProvider> = {
  gemini: createGeminiProvider,
  openai: (apiKey, model) => createOpenAICompatibleProvider("openai", apiKey, model),
  groq: (apiKey, model) => createOpenAICompatibleProvider("groq", apiKey, model),
};

/**
 * Memoised per provider, so the vendor client is constructed once per process
 * rather than per request — and so that code generation running on Groq does
 * not evict the Gemini instance the rest of the pipeline is using.
 */
const cache = new Map<LLMProviderName, LLMProvider>();

export function getLLM(which?: LLMProviderName): LLMProvider {
  // A missing or malformed key throws a raw ZodError out of `llmEnv`, which
  // reaches `fromPipelineError` as an unrecognised exception and becomes an
  // anonymous 500. Misconfiguration is an upstream problem and should say so —
  // and the zod message already names the exact variable.
  let config;
  try {
    config = llmEnv(which);
  } catch (cause) {
    throw new LLMUpstreamError(
      cause instanceof Error ? cause.message : "The model provider is not configured.",
      undefined,
      { cause },
    );
  }
  const existing = cache.get(config.provider);
  if (existing !== undefined) return existing;

  const provider = FACTORIES[config.provider](config.apiKey, config.model);
  cache.set(config.provider, provider);
  return provider;
}
