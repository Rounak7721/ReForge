"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AnalysisSkeleton } from "@/components/analysis/analysis-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError, ApiErrorCode } from "@/lib/api/errors";

type Failure = { code: ApiErrorCode; message: string };

/**
 * `rate_limited` and `quota_exhausted` share HTTP 429 but are different
 * situations: the per-minute limit clears on its own, the daily one does not
 * until midnight Pacific. Telling a user to "try again in a moment" when the
 * daily quota is gone wastes their time, so the two render differently and
 * only one offers a retry.
 */
const RETRYABLE: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  "rate_limited",
  "upstream_error",
  "internal_error",
  "site_unreachable",
]);

const TONE: Partial<Record<ApiErrorCode, string>> = {
  rate_limited: "border-amber-500/40 bg-amber-500/10 text-amber-900",
  quota_exhausted: "border-amber-500/40 bg-amber-500/10 text-amber-900",
};

export function AnalyzeForm() {
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setFailure(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: String(form.get("url") ?? "").trim(),
          description: String(form.get("description") ?? "").trim(),
          targetCustomer: String(form.get("targetCustomer") ?? "").trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        setFailure({
          code: payload.error?.code ?? "internal_error",
          message: payload.error?.message ?? "Something went wrong.",
        });
        return;
      }

      const { projectId } = (await response.json()) as { projectId: string };

      // The analysis is already persisted, so the project page renders it
      // straight from the database — no second model call.
      router.replace(`/dashboard/${projectId}`);
      router.refresh();
    } catch {
      setFailure({
        code: "internal_error",
        message:
          "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {pending ? (
        <div
          role="status"
          className="bg-muted/50 flex items-center gap-3 rounded-lg border px-4 py-3"
        >
          <span
            aria-hidden
            className="border-muted-foreground/30 border-t-foreground size-4 animate-spin rounded-full border-2"
          />
          <div>
            <p className="text-sm font-medium">
              Reading the site and analyzing it…
            </p>
            <p className="text-muted-foreground text-xs">
              This usually takes five to ten seconds.
            </p>
          </div>
        </div>
      ) : null}

      {/* `hidden`, never unmounted. An early return here would destroy the
          three uncontrolled inputs' DOM nodes and with them everything the
          user typed — see docs/DEBUGGING.md entry 5. */}
      <div hidden={pending}>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://linear.app"
              autoComplete="url"
              required
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              A product you want to learn from. We read the page, not just the
              address.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">What do you want to build?</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              minLength={10}
              maxLength={2000}
              placeholder="A lightweight issue tracker for solo developers, with the planning parts stripped out."
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetCustomer">Who is it for?</Label>
            <Input
              id="targetCustomer"
              name="targetCustomer"
              minLength={3}
              maxLength={500}
              placeholder="Indie developers shipping side projects at night"
              required
              disabled={pending}
            />
          </div>

          {failure ? (
            <div
              role="alert"
              className={`rounded-md border px-4 py-3 text-sm ${
                TONE[failure.code] ??
                "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              <p className="font-medium">
                {failure.code === "quota_exhausted"
                  ? "Daily AI limit reached"
                  : failure.code === "rate_limited"
                    ? "Slow down a moment"
                    : failure.code === "site_unreachable"
                      ? "Couldn't read that site"
                      : "Analysis failed"}
              </p>
              <p className="mt-1 opacity-90">{failure.message}</p>
              {RETRYABLE.has(failure.code) ? (
                <p className="mt-2 text-xs opacity-75">
                  Your answers are still here — press Analyze to try again.
                </p>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            Analyze this product
          </Button>
        </form>
      </div>

      {pending ? <AnalysisSkeleton /> : null}
    </div>
  );
}
