import { z } from "zod";

/**
 * Env access, validated once at module load.
 *
 * Vercel env vars are being added lazily as each is first used, so the failure
 * mode this guards against is real: a missing var otherwise arrives as
 * `undefined` inside a Supabase constructor and surfaces as an opaque runtime
 * error on the first click. Here it fails loudly, naming the variable.
 *
 * `publicEnv` is safe anywhere. `serverEnv` is a function, not a constant, so
 * that merely importing this module from a Client Component doesn't try to read
 * server-only values — call it inside server code.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
});

// Next.js inlines NEXT_PUBLIC_* at build time only for statically analysable
// property access, so these must be written out in full rather than looped over.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is missing"),
});

let cachedServerEnv: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  cachedServerEnv ??= serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return cachedServerEnv;
}

/**
 * LLM config, parsed separately from `serverEnv` on purpose: merging them would
 * make the Supabase admin client fail to construct whenever a model key is
 * absent, which is a confusing failure for an unrelated feature.
 *
 * **Only the ACTIVE provider's variables are required.** This used to demand
 * `GEMINI_API_KEY` unconditionally, which quietly broke the swap the whole
 * `lib/llm` abstraction exists to provide: setting `LLM_PROVIDER=groq` on a
 * machine with no Gemini key threw at module load, before any request ran. It
 * also means the unused providers can sit in `.env.example` as empty
 * placeholders without crashing the app.
 *
 * Defaults mirror `.env.example`. Gemini's model is pinned by daily quota — the
 * 3.x Flash line allows 20 requests/day, flash-lite allows 500. See
 * `internal/guidelines/03-tech-stack.md`.
 */
const PROVIDER_DEFAULT_MODELS: Record<LLMProviderName, string> = {
  gemini: "gemini-3.1-flash-lite",
  // Chosen by measurement, not reputation. On Groq's free tier every model
  // shares 1000 requests/day and 8000 tokens/minute, so the differentiator is
  // whether the model returns a COMPLETE document: qwen3.8-27b consistently ran
  // to exactly 10240 characters and stopped mid-tag, while gpt-oss-120b
  // finished the page in a third of the output tokens — which also leaves room
  // for an edit inside the same per-minute budget. See docs/04-debugging-log.md.
  groq: "openai/gpt-oss-120b",
  openai: "gpt-4o-mini",
};

/** The env var names each provider reads. Adding a vendor adds one row. */
const PROVIDER_ENV: Record<LLMProviderName, { key: string; model: string }> = {
  gemini: { key: "GEMINI_API_KEY", model: "GEMINI_MODEL" },
  groq: { key: "GROQ_API_KEY", model: "GROQ_MODEL" },
  openai: { key: "OPENAI_API_KEY", model: "OPENAI_MODEL" },
};

const providerSchema = z.enum(["gemini", "openai", "groq"]);

export type LLMProviderName = z.infer<typeof providerSchema>;

export type LLMConfig = {
  provider: LLMProviderName;
  apiKey: string;
  model: string;
};

const cachedLlmEnv = new Map<LLMProviderName, LLMConfig>();

/**
 * Config for a provider — the one named by `LLM_PROVIDER` unless asked for a
 * specific one.
 *
 * The override exists for a real case, not for symmetry: code generation runs
 * on a different provider from the rest of the pipeline, so `CODEGEN_PROVIDER`
 * can point at Groq while analysis and refinement stay on Gemini.
 */
export function llmEnv(which?: LLMProviderName): LLMConfig {
  const provider =
    which ??
    providerSchema.parse(process.env.LLM_PROVIDER ?? "gemini");

  const cached = cachedLlmEnv.get(provider);
  if (cached !== undefined) return cached;

  const names = PROVIDER_ENV[provider];
  const config: LLMConfig = {
    provider,
    apiKey: z
      .string()
      .min(1, `${names.key} is missing (LLM_PROVIDER=${provider})`)
      .parse(process.env[names.key]),
    model: z
      .string()
      .min(1)
      .catch(PROVIDER_DEFAULT_MODELS[provider])
      .parse(process.env[names.model]),
  };

  cachedLlmEnv.set(provider, config);
  return config;
}

/**
 * The provider used for code generation, which is allowed to differ from the
 * rest of the pipeline.
 *
 * Defaults to `LLM_PROVIDER` so an unset variable changes nothing. Groq is not
 * permitted to become load-bearing: if its free tier changes or the model is
 * withdrawn, unsetting `CODEGEN_PROVIDER` moves codegen back onto Gemini with
 * no code change.
 */
export function codegenProvider(): LLMProviderName {
  const raw = process.env.CODEGEN_PROVIDER;
  if (raw === undefined || raw.trim() === "") {
    return providerSchema.parse(process.env.LLM_PROVIDER ?? "gemini");
  }
  return providerSchema.parse(raw);
}
