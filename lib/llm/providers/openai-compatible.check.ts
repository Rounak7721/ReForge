/**
 * Self-check for the OpenAI-compatible schema translation. `pnpm check`.
 *
 * This covers the half a live call cannot. Hitting the real endpoint with a
 * bad key proves the URL, the auth header and the error mapping — the vendor
 * rejects at authentication, before it ever looks at the body — so schema
 * translation is never exercised by that test. It is also the part most likely
 * to be wrong, because each vendor wants the opposite thing: Gemini strips
 * `additionalProperties`, OpenAI requires it.
 */
import assert from "node:assert/strict";

import { z } from "zod";

import { canBeStrict, sealObjects } from "./openai-compatible";

const toSchema = (schema: z.ZodType<unknown>) =>
  sealObjects(z.toJSONSchema(schema, { io: "output" })) as Record<string, unknown>;

/* --- every object gets sealed, at every depth ----------------------------- */
const nested = toSchema(
  z.object({ page: z.object({ sections: z.array(z.object({ type: z.string() })) }) }),
);
const json = JSON.stringify(nested);
assert.equal(
  (json.match(/"additionalProperties":false/g) ?? []).length,
  3,
  "root, page and each section object must all be sealed",
);
assert.ok(!json.includes("$schema"), "$schema is not part of the dialect and must be stripped");

/* --- strictness is decided, not assumed ----------------------------------- */
assert.equal(canBeStrict(toSchema(z.object({ html: z.string() }))), true,
  "a fully-required schema can use strict mode");

// analysisSchema's `visualImpression` is exactly this shape. Strict mode
// demands every property appear in `required`, which an optional field cannot
// satisfy — so it must fall back rather than send a request the vendor rejects.
assert.equal(
  canBeStrict(toSchema(z.object({ a: z.string(), b: z.string().optional() }))),
  false,
  "a schema with an optional field must fall back to non-strict",
);
assert.equal(
  canBeStrict(toSchema(z.object({ outer: z.object({ inner: z.string().optional() }) }))),
  false,
  "an optional nested deep in the tree must still be detected",
);

console.log("openai-compatible: all checks passed");
