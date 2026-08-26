"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AnalysisSkeleton } from "@/components/analysis/analysis-skeleton";
import { Button, ButtonIcon } from "@/components/ui/button";
import { ArrowUpRight, Link as LinkIcon, Scan, Users } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError, ApiErrorCode } from "@/lib/api/errors";

type Failure = { code: ApiErrorCode; message: string };
type Field = "url" | "description" | "targetCustomer";
type FieldErrors = Partial<Record<Field, string>>;

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
  rate_limited: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  quota_exhausted: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

/** Client-side validation. The server validates again — this is for speed. */
function validate(values: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};

  if (values.url === "") {
    errors.url = "Paste the address of a product’s website.";
  } else {
    try {
      const parsed = new URL(values.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.url = "Use an http:// or https:// address.";
      }
    } catch {
      errors.url = "That doesn’t look like a full web address. Include https://";
    }
  }

  if (values.description.trim().length < 10) {
    errors.description = "A sentence or two — what are you actually trying to build?";
  }
  if (values.targetCustomer.trim().length < 3) {
    errors.targetCustomer = "Who is it for? Even a rough answer helps.";
  }

  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (message === undefined) return null;
  return (
    <p id={id} role="alert" className="text-destructive text-xs">
      {message}
    </p>
  );
}

export function AnalyzeForm() {
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Warn before losing typed answers. The description is a couple of
  // sentences of real thought; a mis-click on Back should not silently bin it.
  useEffect(() => {
    if (!dirty || pending) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, pending]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const values: Record<Field, string> = {
      url: String(form.get("url") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      targetCustomer: String(form.get("targetCustomer") ?? "").trim(),
    };

    const errors = validate(values);
    setFieldErrors(errors);

    // Move focus to the first thing that is wrong, rather than leaving the
    // user to find it. Order matters — it must match the visual order.
    const firstBad = (["url", "description", "targetCustomer"] as const).find(
      (field) => errors[field] !== undefined,
    );
    if (firstBad !== undefined) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    setPending(true);
    setFailure(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
      setDirty(false);
      router.replace(`/dashboard/${projectId}`);
      router.refresh();
    } catch {
      setFailure({
        code: "internal_error",
        message: "Couldn’t reach the server. Check your connection and try again.",
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
          className="border-ember/25 bg-ember-soft flex items-center gap-4 rounded-2xl border px-5 py-4"
        >
          <span
            aria-hidden
            className="border-ember/30 border-t-ember spin-slow size-5 shrink-0 rounded-full border-2"
          />
          <div>
            <p className="text-[14px] font-medium">Reading the site and analyzing it…</p>
            <p className="text-dim mt-0.5 text-xs">
              This usually takes five to ten seconds.
            </p>
          </div>
        </div>
      ) : null}

      {/* `hidden`, never unmounted. An early return here would destroy the
          three uncontrolled inputs' DOM nodes and with them everything the
          user typed — see docs/DEBUGGING.md entry 5. */}
      <div hidden={pending}>
        <form
          ref={formRef}
          onSubmit={onSubmit}
          onChange={() => setDirty(true)}
          noValidate
          className="bezel"
        >
          <div className="bezel-core space-y-7 p-6 sm:p-8">
            <div className="space-y-2.5">
              <Label htmlFor="url">
                <LinkIcon className="text-faint size-4" />
                Website URL
              </Label>
              <Input
                id="url"
                name="url"
                type="url"
                inputMode="url"
                placeholder="https://linear.app"
                autoComplete="url"
                spellCheck={false}
                aria-invalid={fieldErrors.url !== undefined}
                aria-describedby={fieldErrors.url !== undefined ? "url-error" : "url-hint"}
                disabled={pending}
              />
              <FieldError id="url-error" message={fieldErrors.url} />
              {fieldErrors.url === undefined ? (
                <p id="url-hint" className="text-faint text-xs">
                  A product you want to learn from. We read the page, not just the address.
                </p>
              ) : null}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="description">
                <Scan className="text-faint size-4" />
                What do you want to build?
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                maxLength={2000}
                placeholder="A lightweight issue tracker for solo developers, with the planning parts stripped out…"
                // Not a known field type — without this a password manager
                // offers to fill it.
                autoComplete="off"
                aria-invalid={fieldErrors.description !== undefined}
                aria-describedby={
                  fieldErrors.description !== undefined ? "description-error" : undefined
                }
                disabled={pending}
              />
              <FieldError id="description-error" message={fieldErrors.description} />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="targetCustomer">
                <Users className="text-faint size-4" />
                Who is it for?
              </Label>
              <Input
                id="targetCustomer"
                name="targetCustomer"
                maxLength={500}
                placeholder="Indie developers shipping side projects at night…"
                autoComplete="off"
                aria-invalid={fieldErrors.targetCustomer !== undefined}
                aria-describedby={
                  fieldErrors.targetCustomer !== undefined ? "targetCustomer-error" : undefined
                }
                disabled={pending}
              />
              <FieldError id="targetCustomer-error" message={fieldErrors.targetCustomer} />
            </div>

            {failure ? (
              <div
                role="alert"
                className={`rounded-xl border px-4 py-3.5 text-sm ${
                  TONE[failure.code] ??
                  "border-destructive/25 bg-destructive/10 text-destructive"
                }`}
              >
                <p className="font-medium">
                  {failure.code === "quota_exhausted"
                    ? "Daily AI limit reached"
                    : failure.code === "rate_limited"
                      ? "Slow down a moment"
                      : failure.code === "site_unreachable"
                        ? "Couldn’t read that site"
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

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {/* Stays enabled until the request starts. Validation happens on
                  submit and points at the offending field. */}
              <Button type="submit" size="lg" disabled={pending}>
                Analyze this product
                <ButtonIcon>
                  <ArrowUpRight />
                </ButtonIcon>
              </Button>
              <p className="text-faint font-mono text-[11px]">One model call</p>
            </div>
          </div>
        </form>
      </div>

      {pending ? <AnalysisSkeleton /> : null}
    </div>
  );
}
