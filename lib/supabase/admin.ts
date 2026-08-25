import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client. **Bypasses Row Level Security entirely.**
 *
 * The `server-only` import above makes importing this from a Client Component
 * a build error rather than a silent key leak — that is the whole point of the
 * file, so do not remove it.
 *
 * Use only where RLS genuinely cannot express the rule (seeding a demo account,
 * administrative reads). Anything acting on behalf of a signed-in user must go
 * through `lib/supabase/server.ts` so RLS still applies.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
