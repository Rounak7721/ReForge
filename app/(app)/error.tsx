"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="space-y-1">
        <p className="font-medium">Something went wrong</p>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm text-pretty">
          We couldn&apos;t load this page. Nothing has been lost — your saved
          projects are still there.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
      {error.digest ? (
        <p className="text-muted-foreground/70 font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
