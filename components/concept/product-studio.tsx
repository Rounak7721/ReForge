"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ConceptDiffPanel } from "@/components/concept/concept-diff";
import { useConcept } from "@/components/concept/concept-store";
import { ConceptView } from "@/components/concept/concept-view";
import { Button, ButtonIcon } from "@/components/ui/button";
import { CommandBar } from "@/components/ui/command-bar";
import { History, Spark } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError, ApiErrorCode } from "@/lib/api/errors";
import { diffConcepts, type ConceptDiff } from "@/lib/concept-diff";
import type { Concept } from "@/lib/prompts/builder";

export type RefinementEntry = { id: string; instruction: string; createdAt: string };

type Failure = { code: ApiErrorCode; message: string };

/** The four instructions from the brief. Also the demo script. */
const SUGGESTIONS = [
  "Make the design more premium.",
  "Add a dashboard.",
  "Remove the pricing page.",
  "Make it suitable for enterprise customers.",
];

/**
 * Minimum gap between refine requests.
 *
 * The free tier is 15 requests/minute and a text box invites hammering. One
 * in-flight request at a time is enforced by `busy`; this adds a floor on the
 * interval so a fast double-submit can't burn two of them.
 */
const MIN_INTERVAL_MS = 1500;

const TONE: Partial<Record<ApiErrorCode, string>> = {
  rate_limited: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  quota_exhausted: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

function title(code: ApiErrorCode): string {
  if (code === "quota_exhausted") return "Daily AI limit reached";
  if (code === "rate_limited") return "Slow down a moment";
  return "That didn’t work";
}

export function ProductStudio({
  projectId,
  initialRefinements,
}: {
  projectId: string;
  initialRefinements: RefinementEntry[];
}) {
  const router = useRouter();
  // The concept lives in ConceptProvider, not here: the Preview tab renders the
  // same object, so a refinement has to repaint both. Everything below this
  // line is still local — nothing else reads it.
  const { concept, setConcept } = useConcept();
  const [history, setHistory] = useState<RefinementEntry[]>(initialRefinements);
  const [busy, setBusy] = useState<null | "build" | "refine">(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [coolingDown, setCoolingDown] = useState(false);
  const [diff, setDiff] = useState<{ diff: ConceptDiff; instruction: string } | null>(null);
  const lastSentAt = useRef(0);

  async function post<T>(url: string, body: unknown): Promise<T | null> {
    setFailure(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        setFailure({
          code: payload.error?.code ?? "internal_error",
          message: payload.error?.message ?? "Something went wrong.",
        });
        return null;
      }
      return (await response.json()) as T;
    } catch {
      setFailure({
        code: "internal_error",
        message: "Couldn’t reach the server. Check your connection and try again.",
      });
      return null;
    }
  }

  async function onBuild() {
    if (busy !== null) return;
    setBusy("build");
    const result = await post<{ concept: Concept }>("/api/build", { projectId });
    if (result !== null) {
      setConcept(result.concept);
      // ConceptProvider is seeded by the server component. Without this,
      // navigating away and back replays a stale RSC payload and the build
      // looks lost.
      router.refresh();
    }
    setBusy(null);
  }

  // Draft state, validation and focus live in CommandBar; by the time this
  // runs the instruction is already trimmed and long enough.
  async function onRefine(text: string): Promise<boolean> {
    if (busy !== null) return false;

    // Don't silently swallow the click — an unexplained dead button reads as a
    // broken app. Say why, and let the state show it is temporary.
    const since = Date.now() - lastSentAt.current;
    if (since < MIN_INTERVAL_MS) {
      setCoolingDown(true);
      window.setTimeout(() => setCoolingDown(false), MIN_INTERVAL_MS - since);
      return false;
    }
    lastSentAt.current = Date.now();

    const before = concept;
    setDiff(null);
    setBusy("refine");

    const result = await post<{ concept: Concept; refinementId: string }>("/api/refine", {
      projectId,
      instruction: text,
    });

    if (result !== null) {
      // Computed client-side from two objects already in memory — the diff
      // costs nothing and burns no quota.
      if (before !== null) {
        setDiff({ diff: diffConcepts(before, result.concept), instruction: text });
      }
      setConcept(result.concept);

      // An empty id means the server could not write the history row. Showing
      // an entry that vanishes on reload is worse than showing none.
      if (result.refinementId !== "") {
        setHistory((prev) => [
          { id: result.refinementId, instruction: text, createdAt: new Date().toISOString() },
          ...prev,
        ]);
      }
      router.refresh();
    }
    setBusy(null);
    // Keep the draft when the request failed, so the user can retry it.
    return result !== null;
  }

  const errorBlock = failure ? (
    <div
      role="alert"
      className={`rounded-2xl border px-5 py-4 text-sm ${
        TONE[failure.code] ?? "border-destructive/25 bg-destructive/10 text-destructive"
      }`}
    >
      <p className="font-medium">{title(failure.code)}</p>
      <p className="mt-1 opacity-90">{failure.message}</p>
    </div>
  ) : null;

  /* ---------------- Nothing built yet ---------------- */
  if (concept === null) {
    return (
      <div className="space-y-5">
        {errorBlock}

        <Reveal>
          <div className="bezel relative overflow-hidden">
            <div aria-hidden className="gridlines absolute inset-0" />
            <div className="bezel-core relative px-6 py-16 text-center sm:px-12">
              <span className="border-ember/25 bg-ember-soft text-ember ember-glow mx-auto flex size-14 items-center justify-center rounded-2xl border text-2xl">
                <Spark />
              </span>

              <h3 className="display-sm mx-auto mt-6 max-w-md text-2xl font-semibold text-pretty">
                Turn this teardown into a product.
              </h3>
              <p className="text-dim mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-pretty">
                A name, a description, the features worth building, the navigation, every
                page and its sections, and a UI direction — as one object you can argue
                with in plain English.
              </p>

              <div className="mt-9 flex justify-center">
                <Button size="lg" onClick={onBuild} disabled={busy !== null}>
                  {busy === "build" ? (
                    <>
                      <span aria-hidden className="spin-slow size-4 rounded-full border-2 border-current border-t-transparent" />
                      Building…
                    </>
                  ) : (
                    <>
                      Build My Product
                      <ButtonIcon>
                        <Spark />
                      </ButtonIcon>
                    </>
                  )}
                </Button>
              </div>

              <p className="text-faint mt-5 font-mono text-[11px]">
                One model call · saved to your project
              </p>
            </div>
          </div>
        </Reveal>

        {busy === "build" ? <BuildSkeleton /> : null}
      </div>
    );
  }

  /* ---------------- Built ---------------- */
  const busyRefining = busy === "refine";

  return (
    <div className="space-y-5">
      {errorBlock}

      {diff !== null ? (
        <ConceptDiffPanel
          diff={diff.diff}
          instruction={diff.instruction}
          onDismiss={() => setDiff(null)}
        />
      ) : null}

      {/* The concept itself. `inert` while a refine is in flight: dimming
          alone leaves every link and button inside still tabbable, so a
          keyboard user lands on targets they cannot see.

          Deliberately NOT an aria-live region. The whole concept is a few
          hundred words, and announcing all of it on every refine would bury
          the one thing that changed. ConceptDiffPanel carries role="status"
          and reads out the delta instead. */}
      <div
        aria-busy={busyRefining}
        inert={busyRefining}
        className={`transition-opacity duration-500 ease-expo motion-reduce:transition-none ${
          busyRefining ? "opacity-45" : "opacity-100"
        }`}
      >
        <ConceptView concept={concept} />
      </div>

      {history.length > 0 ? (
        <details className="border-hairline bg-core/50 group rounded-2xl border px-5 py-4 backdrop-blur-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 text-[13px] font-medium">
            <History className="text-faint size-4" />
            Refinement history
            <span className="text-faint font-mono text-[11px]" data-numeric>
              {history.length}
            </span>
          </summary>
          <ol className="border-hairline mt-4 space-y-2.5 border-t pt-4">
            {history.map((entry) => (
              <li key={entry.id} className="text-dim flex gap-2.5 text-[13px]">
                <span aria-hidden className="text-ember/60 font-mono">
                  ↳
                </span>
                <span className="text-pretty">{entry.instruction}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <CommandBar
        id="instruction"
        label="Refine in plain English"
        placeholder="Make it suitable for enterprise customers…"
        suggestions={SUGGESTIONS}
        busy={busyRefining}
        coolingDown={coolingDown}
        coolingDownHint="One change at a time — the free AI tier allows 15 requests a minute."
        invalidHint="Describe the change in a few more words — “Add a dashboard”, say."
        onSubmit={onRefine}
      />
    </div>
  );
}

function BuildSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-6" aria-hidden>
      <div className="plate col-span-full space-y-3 p-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      {[
        "md:col-span-4",
        "md:col-span-2",
        "md:col-span-3",
        "md:col-span-3",
      ].map((span, index) => (
        <div key={index} className={`plate space-y-3 p-6 ${span}`}>
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-3.5" style={{ width: `${92 - i * 16}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
