import { apiError } from "@/lib/api/errors";
import type { createClient } from "@/lib/supabase/server";

/**
 * Per-user caps on the endpoints that spend Gemini quota.
 *
 * ## Why this exists at all
 *
 * The README publishes working demo credentials, deliberately — a reviewer must
 * be able to see a finished project without signing up. The free Gemini tier is
 * 500 requests a day, shared by everyone using the deployment. Without a cap,
 * anyone who reads the README can exhaust the entire day in about a minute with
 * a loop, and the app is then down for whoever tries it next, with no recovery
 * until the quota resets. That is the worst failure this project can have, and
 * it is the cheapest one to prevent.
 *
 * ## Why there is no counter table
 *
 * The two endpoints that always call Gemini each write a row that is already
 * timestamped and already scoped to the user by row-level security:
 * `/api/analyze` inserts into `projects`, `/api/refine` inserts into
 * `refinements`. Counting those rows is exact, needs no migration, and cannot
 * drift from reality the way a separate counter can.
 *
 * The other two model endpoints do not need one:
 *
 * - `/api/build` returns `cached: true` without calling the model once a
 *   concept exists, so a loop against it is free after the first request.
 * - `/api/generate` runs on Groq, which has its own quota and its own
 *   per-minute limiter that already surfaces as `rate_limited`.
 *
 * ponytail: counts rows rather than events, so a build or a generate is
 * uncounted. A `usage_events` table is the upgrade if a third Gemini endpoint
 * ever appears that writes no row.
 *
 * ## The ceiling, stated plainly
 *
 * These are per-user windows, not global. Someone willing to create many
 * accounts is not stopped by this, and neither is a distributed attempt. What
 * it does stop is the realistic case: one set of published credentials in a
 * loop. Bounded to 130 Gemini calls a day per account, one account cannot take
 * more than about a quarter of the daily allowance.
 *
 * The caps were raised from 3/10 and 10/40 on 2026-08-27: the analyze hourly
 * cap of 3 was binding during a normal demo session with retakes, which is the
 * one moment the app must not refuse a legitimate user. The floor to keep is
 * that one account cannot spend the whole day.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Rows counted, and the ceiling for each window. */
type Limit = {
  table: "projects" | "refinements";
  /** Column holding the owning user. `refinements` reaches it through RLS. */
  hourly: number;
  daily: number;
  /** Shown to the user. Says which action, and when it frees up. */
  message: string;
};

export const ANALYZE_LIMIT: Limit = {
  table: "projects",
  hourly: 10,
  daily: 30,
  message: "You've analyzed a lot of sites recently. Try again in an hour.",
};

export const REFINE_LIMIT: Limit = {
  table: "refinements",
  hourly: 30,
  daily: 100,
  message: "That's a lot of refinements in a short time. Try again in an hour.",
};

async function countSince(
  supabase: Supabase,
  limit: Limit,
  userId: string,
  since: Date,
): Promise<number | null> {
  // `refinements` has no user_id of its own — ownership runs through the parent
  // project, which is exactly what the RLS policy checks. Selecting through the
  // relationship keeps the count honest without duplicating that rule here.
  const query =
    limit.table === "projects"
      ? supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
      : supabase
          .from("refinements")
          .select("id, projects!inner(user_id)", { count: "exact", head: true })
          .eq("projects.user_id", userId);

  const { count, error } = await query.gte("created_at", since.toISOString());
  // Fail open, loudly. A counting failure must not block a legitimate user, but
  // it must not pass silently either — a broken limiter that reports nothing is
  // the same as no limiter.
  if (error !== null) {
    console.error("[rate-limit] count failed", { table: limit.table, error });
    return null;
  }
  return count ?? 0;
}

/**
 * Returns an error response when the user is over either window, or `null` when
 * the request may proceed. Call it AFTER authenticating and BEFORE the model.
 */
export async function checkRateLimit(
  supabase: Supabase,
  limit: Limit,
  userId: string,
): Promise<ReturnType<typeof apiError> | null> {
  const now = Date.now();
  const [hour, day] = await Promise.all([
    countSince(supabase, limit, userId, new Date(now - 60 * 60 * 1000)),
    countSince(supabase, limit, userId, new Date(now - 24 * 60 * 60 * 1000)),
  ]);

  if (hour !== null && hour >= limit.hourly) return apiError("rate_limited", limit.message);
  if (day !== null && day >= limit.daily) {
    return apiError(
      "quota_exhausted",
      "You've reached today's limit for this account. It resets in 24 hours.",
    );
  }
  return null;
}
