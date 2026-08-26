"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Fault } from "@/components/ui/icons";

/**
 * Error boundary for the signed-in app.
 *
 * Without this, a thrown server error (a failed project read, say) renders
 * Next's default error screen — unbranded, and with no way forward but the
 * browser's back button. `reset()` re-runs the segment, which is the right
 * action for the transient failures this actually catches.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is how this maps to the server log; the message itself is
    // redacted in production builds.
    console.error("[app] boundary caught", { digest: error.digest });
  }, [error]);

  return (
    <div className="bezel mx-auto max-w-lg">
      <div className="bezel-core flex flex-col items-center gap-5 px-6 py-14 text-center">
        <span className="border-destructive/25 bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-2xl border text-xl">
          <Fault />
        </span>

        <div>
          <h1 className="display-sm text-xl font-semibold">Something went wrong</h1>
          <p className="text-dim mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-pretty">
            We couldn’t load this page. Nothing has been lost — your saved projects are
            still there.
          </p>
        </div>

        <Button onClick={reset}>Try again</Button>

        {error.digest ? (
          <p className="text-faint font-mono text-xs">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
