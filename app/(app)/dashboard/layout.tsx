import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { Wordmark } from "@/components/marketing/wordmark";
import { createClient } from "@/lib/supabase/server";

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
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        {/* `marketing` scopes only the brand colour tokens the Wordmark reads. */}
        <Link href="/dashboard" aria-label="Reforge dashboard" className="marketing rounded-md">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
