# `lib/llm` — the model layer

Every model call in Reforge goes through this directory. The rule it exists to
enforce, from `CLAUDE.md`:

> Switching model or vendor must be an **env change only**, with zero edits to
> the analyzer, builder or editor.

## The contract

Feature code imports **only** these, from `@/lib/llm`:

```ts
import { generateStructured, getLLM, isLLMError } from "@/lib/llm";
```

It must never import `@google/genai`, `openai` or `@anthropic-ai/sdk`. Those
belong to `providers/*` and nowhere else. If you are about to call a vendor SDK
from a route, a component or a prompt module — stop, and go through
`generateStructured` instead.

```
analyzer / builder / editor
        │  schema + prompt
        ▼
generateStructured        token floor · JSON parse · zod validate · one strict retry
        │  StructuredRequest
        ▼
registry.getLLM()         LLM_PROVIDER → provider instance (memoised)
        │
        ▼
providers/gemini.ts       the only file importing a vendor SDK
```

| File | Responsibility |
|---|---|
| `index.ts` | The public surface. Import from here. |
| `generate.ts` | `generateStructured` — the token floor and the retry policy. |
| `registry.ts` | `LLM_PROVIDER` → a provider. One line per vendor. |
| `providers/gemini.ts` | Transport, Gemini's schema dialect, error mapping. |
| `types.ts` | The vendor-neutral `LLMProvider` interface. |
| `errors.ts` | Typed failures routes branch on. |

## Swapping the model

Change `GEMINI_MODEL` in `.env` **and in Vercel**. Nothing else.

## Swapping the vendor

Set `LLM_PROVIDER` and supply that vendor's `*_API_KEY` / `*_MODEL`. Only
`gemini` is implemented; `openai` and `anthropic` are present in `registry.ts`
as entries that throw a clear "not enabled" error. That is deliberate — it keeps
the contract honest and makes enabling one a single `createXProvider` call
rather than a refactor.

The runtime provider is **always `gemini`**: the project's cost rule is zero
recurring spend, and the free tier is what satisfies it. The other two exist so
the layer is provably swappable, not to be turned on.

## Adding a vendor

1. Write `providers/<vendor>.ts` exporting `create<Vendor>Provider(apiKey, model): LLMProvider`.
   Its one job is `generateJson` — take a `StructuredRequest`, return raw JSON
   text, and map that vendor's failures onto the classes in `errors.ts`.
   It must **not** parse or validate; `generateStructured` owns that so the
   retry policy stays identical across vendors.
2. Add the vendor's vars to `llmEnv()` in `lib/env.ts`, `.env.example`, and Vercel.
3. Replace the throwing entry in `registry.ts` with the factory call.

No feature code changes.

## The schema is the single source of truth

Callers pass a zod schema. It is used **twice**: converted to the vendor's
native schema format so the model is constrained on the wire, and again to
validate the response. The two can never drift.

Field-level `.describe()` text is carried onto the wire by `z.toJSONSchema`, so
the model reads it. Put per-field guidance on the field, not in the prompt body.

Gemini's JSON-Schema subset rejects `$schema` and `additionalProperties`, both
of which zod emits by default; `toGeminiSchema` strips them and adds
`propertyOrdering`. That translation is the provider's job — schemas stay plain
zod.

## Two traps this layer exists to absorb

Both were reproduced against the live API before any of this was written. Full
trail in `docs/04-debugging-log.md` entry 2.

**1. `maxOutputTokens` caps thinking + output *combined*.** The project's cost
rule says keep the budget lean. Taken literally on a Gemini 3.x model, the model
spends the entire budget reasoning and returns **HTTP 200** with `content: {}`
and **no `parts` array** — so the accessor every SDK example uses,
`candidates[0].content.parts[0].text`, throws a `TypeError` rather than yielding
`undefined`. `providers/gemini.ts` checks for `parts` and raises
`LLMEmptyResponseError` carrying `finishReason`.

**2. `thinkingLevel` is not portable.** With `"low"` set, `gemini-3.6-flash`
emits 0 thinking tokens and `gemini-3.1-flash-lite` emits ~100 — the inverse of
each other. It cannot be treated as a "disable thinking" switch. The portable
defence is `MIN_OUTPUT_TOKENS` in `generate.ts`: a floor, applied no matter what
the caller asks for, so a model swap that ignores the hint degrades to "slower"
instead of "silently returns nothing".

## Rate limits are two different states

The free tier is **15 requests/minute and 500 requests/day**. `LLMRateLimitError`
carries a `scope`, read from the 429 body's
`error.details[].violations[].quotaId` — structurally, never by matching message
text. The distinction is not cosmetic: a per-minute limit clears on retry and a
per-day one does not, and `lib/api/llm-error.ts` renders each honestly.

One full demo is 6 calls (1 analyze + 1 build + 4 refinements), and the quota is
shared with whoever is evaluating the app. `generateStructured` retries **once**
on malformed output, never in a loop.
