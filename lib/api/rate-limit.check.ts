/**
 * Self-check for the rate limiter. `pnpm check`.
 *
 * The branch this guards is the reason the app survives someone looping the
 * published demo credentials, and it is exercised only by an attack — so it
 * would otherwise ship untested and nobody would notice it was inverted.
 *
 * A stub stands in for Supabase. The point is not to test PostgREST; it is to
 * pin which count produces which response, and that a counting failure fails
 * OPEN rather than locking every user out.
 */
import assert from "node:assert/strict";

import { ANALYZE_LIMIT, checkRateLimit, REFINE_LIMIT } from "./rate-limit";

/** Returns `hour` for the 1-hour window and `day` for the 24-hour one. */
function stub(hour: number | null, day: number | null) {
  const HOUR_MS = 60 * 60 * 1000;
  const build = () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      // `gte(column, value)` — the ISO timestamp is the SECOND argument. Reading
      // the first one gives "created_at", which parses to NaN, which compares
      // false, which quietly makes every window look like the hourly one. That
      // is how the first version of this stub reported the limiter broken when
      // the limiter was fine.
      gte: (_column: string, iso: string) => {
        const ageMs = Date.now() - new Date(iso).getTime();
        const value = ageMs > 2 * HOUR_MS ? day : hour;
        return Promise.resolve(
          value === null
            ? { count: null, error: { message: "boom" } }
            : { count: value, error: null },
        );
      },
    };
    return chain;
  };
  return { from: build } as never;
}

async function code(hour: number | null, day: number | null, limit = ANALYZE_LIMIT) {
  const res = await checkRateLimit(stub(hour, day), limit, "user-1");
  if (res === null) return null;
  return (await res.json()).error.code as string;
}

// Wrapped, because tsx transforms these checks to CJS and top-level await is
// not available there.
async function main() {

  // Under both windows: allowed.
  assert.equal(await code(0, 0), null, "a first request must pass");
  assert.equal(await code(2, 9), null, "one below each ceiling must pass");

  // At the ceiling, not just past it. Off-by-one here means the limit is 4, not 3.
  assert.equal(await code(3, 5), "rate_limited", "the hourly ceiling is inclusive");
  assert.equal(await code(0, 10), "quota_exhausted", "the daily ceiling is inclusive");

  // The two windows are different codes on purpose: an hourly limit clears on
  // retry and a daily one does not, and the UI renders them differently.
  assert.notEqual(
  await code(3, 5),
  await code(0, 10),
  "hourly and daily must not collapse into one code",
  );

  // Refine is the looser limit. If these ever match, someone copied the wrong one.
  assert.equal(await code(3, 5, REFINE_LIMIT), null, "3 refinements in an hour is fine");
  assert.equal(await code(10, 20, REFINE_LIMIT), "rate_limited", "10 refinements trips it");

  // Fail OPEN. A broken count must never lock out every legitimate user.
  assert.equal(await code(null, null), null, "a counting failure must not block the request");
  assert.equal(await code(null, 0), null, "a failed hourly count alone must not block");
  assert.equal(await code(0, null), null, "a failed daily count alone must not block");

  // ...but a working window still applies while the other is broken.
  assert.equal(await code(3, null), "rate_limited", "a live hourly count still enforces");

  assert.ok(ANALYZE_LIMIT.hourly < ANALYZE_LIMIT.daily, "hourly must be tighter than daily");
  assert.ok(REFINE_LIMIT.hourly < REFINE_LIMIT.daily, "hourly must be tighter than daily");

  console.log("rate-limit: all checks passed");
}

void main();
