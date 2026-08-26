import Link from "next/link";

import { Wordmark } from "@/components/marketing/wordmark";

export default function NotFound() {
  return (
    <div className="marketing flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <Link href="/" aria-label="Reforge home">
        <Wordmark className="scale-110" />
      </Link>
      <div className="space-y-2">
        <p className="font-display text-3xl font-semibold tracking-[-0.03em]">
          That page doesn&apos;t exist.
        </p>
        <p className="text-[var(--dim)] text-sm">
          It may have been removed, or the link may be wrong.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Go to your projects
      </Link>
    </div>
  );
}
