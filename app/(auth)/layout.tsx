import Link from "next/link";

import { TeardownPanel } from "@/components/marketing/teardown-panel";
import { Wordmark } from "@/components/marketing/wordmark";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Split-screen auth.
 *
 * The right half is not decoration — it is the product's actual output, so the
 * page answers "what am I signing up for?" while the user is deciding. It is
 * hidden below `lg` rather than stacked, because on a phone it would push the
 * form itself below the fold.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.05fr]">
      {/* ---- Form side ---- */}
      <div className="relative flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Reforge home" className="rounded-full">
            <Wordmark size="lg" />
          </Link>
          <ThemeToggle />
        </div>

        <main id="main" className="flex flex-1 items-center justify-center py-14">
          {children}
        </main>

        <p className="text-faint text-center text-xs">
          By continuing you agree to our{" "}
          <Link href="/privacy" className="hover:text-dim underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </div>

      {/* ---- Brand side ---- */}
      <aside className="border-hairline bg-shell/40 relative hidden overflow-hidden border-l lg:flex lg:flex-col lg:justify-center">
        <div aria-hidden className="gridlines absolute inset-0" />

        <div className="relative px-12 py-16 xl:px-16">
          <p className="eyebrow text-ember">/teardown</p>
          <h2 className="display mt-5 max-w-md text-3xl font-semibold xl:text-4xl">
            Take any product apart. Build yours from the pieces.
          </h2>
          <p className="text-dim measure mt-5 max-w-md text-[15px] leading-relaxed text-pretty">
            Paste a URL. Reforge reads the site, names what the product does and who it
            serves, then drafts a complete concept for the thing you actually want to
            build.
          </p>

          <div className="mt-10 max-w-md">
            <TeardownPanel />
          </div>
        </div>
      </aside>
    </div>
  );
}
