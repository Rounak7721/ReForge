import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { Wordmark } from "@/components/marketing/wordmark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in shell.
 *
 * Top navigation rather than the reflexive left sidebar: this app has exactly
 * two destinations, and a 240px rail permanently reserved for two links is
 * space taken from the thing the user actually came to read.
 *
 * The bar is a floating glass island, matching the marketing nav so the two
 * halves of the product read as one.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this, but a layout that renders user data should
  // not depend on middleware having run. Defence in depth, and it narrows
  // `user` for the children below.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col">
      {/* print:hidden — the export route lives under this layout, and app chrome
          has no business on a printed brief. */}
      <header className="z-nav sticky top-0 pt-[env(safe-area-inset-top)] print:hidden">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <div className="border-hairline bg-shell/70 flex items-center gap-3 rounded-full border p-2 shadow-(--shadow-ambient) backdrop-blur-xl">
            <Link
              href="/dashboard"
              aria-label="Reforge dashboard"
              className="rounded-full pr-2 pl-1.5 transition-opacity hover:opacity-80"
            >
              <Wordmark />
            </Link>

            <div className="ml-auto flex min-w-0 items-center gap-2">
              {/* min-w-0 + truncate: a long address must shrink rather than
                  push the controls off the end of the bar. */}
              <span
                className="text-faint hidden min-w-0 max-w-60 truncate px-2 text-sm md:inline"
                title={user.email}
              >
                {user.email}
              </span>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 px-4 pt-10 pb-24 sm:px-6 print:p-0">
        <div className="mx-auto w-full max-w-6xl print:max-w-none">{children}</div>
      </main>
    </div>
  );
}
