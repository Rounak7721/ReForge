import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Supabase client for Server Components and Route Handlers, bound to the
 * request's cookies. Anon key, so RLS still applies — this is not a privileged
 * client.
 *
 * Create a new one per request; never share across requests.
 *
 * Only `getAll`/`setAll` are implemented. The `get`/`set`/`remove` form is
 * deprecated in @supabase/ssr and the library warns that implementing it
 * wrongly causes random logouts and early session termination.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Safe to swallow: the
            // middleware refreshes the session on every request, so the
            // rewritten cookies still reach the browser.
          }
        },
      },
    },
  );
}
