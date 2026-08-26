/**
 * Self-check for the Gemini schema translation. `pnpm check`.
 *
 * This exists because the thing it checks already broke production once. Gemini
 * rejects `minItems`/`maxItems` when the same schema also contains an `enum`,
 * with a 400 that names neither keyword — and `conceptSchema` has both, so
 * /api/build and /api/refine failed on every request until it was bisected out.
 *
 * A unit check cannot ask Google what its dialect is. What it CAN do is fail
 * loudly the moment someone "tidies up" the sanitiser and puts the keywords
 * back, which is the realistic way this regresses.
 */
import assert from "node:assert/strict";

import { z } from "zod";

import { toGeminiSchema } from "./gemini";

/** Every keyword appearing anywhere in the emitted schema. */
function keywords(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    node.forEach((child) => keywords(child, found));
    return found;
  }
  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      found.add(key);
      keywords(value, found);
    }
  }
  return found;
}

// Mirrors the shape of conceptSchema: an enum alongside bounded arrays, nested.
const like = z.object({
  pages: z
    .array(z.object({ name: z.string().min(1), sections: z.array(z.object({ type: z.string() })).min(1).max(6) }))
    .min(1)
    .max(8),
  uiDirection: z.object({
    palette: z
      .array(z.object({ hex: z.string().min(1), role: z.enum(["primary", "surface", "text", "accent"]) }))
      .min(1)
      .max(10),
  }),
});

const emitted = toGeminiSchema(like);
const used = keywords(emitted);

assert.ok(!used.has("minItems"), "minItems must be stripped — Gemini 400s on it alongside an enum");
assert.ok(!used.has("maxItems"), "maxItems must be stripped — Gemini 400s on it alongside an enum");
assert.ok(!used.has("$schema"), "$schema is not part of Gemini's dialect");
assert.ok(!used.has("additionalProperties"), "additionalProperties is not part of Gemini's dialect");

// What must SURVIVE. Stripping these would quietly degrade output quality
// rather than erroring, which is a worse failure than the one above.
assert.ok(used.has("enum"), "enum is supported and guides the model to valid values");
assert.ok(used.has("minLength"), "minLength is supported");
assert.ok(used.has("propertyOrdering"), "propertyOrdering is Google's own recommendation");
assert.ok(used.has("properties") && used.has("required"), "the schema must still describe its shape");

console.log("gemini: all checks passed");
