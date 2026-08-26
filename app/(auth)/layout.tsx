import Link from "next/link";

import { Wordmark } from "@/components/marketing/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // `marketing` only for the brand tokens the Wordmark reads (--ink, --signal,
    // --dim); the card below keeps the app's own shadcn styling.
    <div className="marketing flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" aria-label="Reforge home" className="rounded-md">
        <Wordmark className="scale-125" />
      </Link>
      {children}
    </div>
  );
}
