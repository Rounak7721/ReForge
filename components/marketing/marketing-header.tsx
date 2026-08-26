import { SiteNav } from "@/components/marketing/site-nav";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth-aware shell around the nav.
 *
 * Stays a Server Component so the session read never reaches the browser; the
 * interactive island (`SiteNav`) receives a single boolean rather than the user
 * object, which keeps the whole session out of the client payload.
 */
export async function MarketingHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SiteNav authed={user !== null} />;
}
