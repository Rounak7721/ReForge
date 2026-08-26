import Link from "next/link";

import { Wordmark } from "@/components/marketing/wordmark";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth-aware: a signed-in visitor landing here should be offered their
 * dashboard, not asked to sign up again.
 */
export async function MarketingHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--rule)] bg-[var(--paper)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Reforge home">
          <Wordmark />
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <a
            href="#how"
            className="hidden rounded-md px-3 py-2 text-[var(--dim)] transition-colors hover:text-[var(--ink)] sm:inline-block"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="hidden rounded-md px-3 py-2 text-[var(--dim)] transition-colors hover:text-[var(--ink)] sm:inline-block"
          >
            Pricing
          </a>

          {user === null ? (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-[var(--dim)] transition-colors hover:text-[var(--ink)]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="ml-1 rounded-md bg-[var(--ink)] px-3.5 py-2 font-medium text-white transition-opacity hover:opacity-90"
              >
                Start free
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="ml-1 rounded-md bg-[var(--ink)] px-3.5 py-2 font-medium text-white transition-opacity hover:opacity-90"
            >
              Open dashboard
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
