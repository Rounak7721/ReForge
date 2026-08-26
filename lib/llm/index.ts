/**
 * The public surface of the LLM layer. Feature code imports from here and
 * nowhere else — never from `providers/*`, and never from a vendor SDK.
 *
 * See ./README.md for the swap contract.
 */
export { generateStructured } from "@/lib/llm/generate";
export type { GenerateStructuredOptions } from "@/lib/llm/generate";
export { getLLM } from "@/lib/llm/registry";
export {
  isLLMError,
  LLMEmptyResponseError,
  LLMError,
  LLMInvalidOutputError,
  LLMRateLimitError,
  LLMUpstreamError,
} from "@/lib/llm/errors";
export type { LLMErrorCode } from "@/lib/llm/errors";
export type { LLMProvider, LLMProviderName } from "@/lib/llm/types";
