"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { ConceptView } from "@/components/concept/concept-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError, ApiErrorCode } from "@/lib/api/errors";
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
  rate_limited: "border-amber-500/40 bg-amber-500/10 text-amber-900",
  quota_exhausted: "border-amber-500/40 bg-amber-500/10 text-amber-900",
};

function title(code: ApiErrorCode): string {
  if (code === "quota_exhausted") return "Daily AI limit reached";
  if (code === "rate_limited") return "Slow down a moment";
  return "That didn't work";
}

export function ProductStudio({
  projectId,
  initialConcept,
  initialRefinements,
}: {
  projectId: string;
  initialConcept: Concept | null;
  initialRefinements: RefinementEntry[];
}) {
  const router = useRouter();
  const [concept, setConcept] = useState<Concept | null>(initialConcept);
  const [history, setHistory] = useState<RefinementEntry[]>(initialRefinements);
  const [busy, setBusy] = useState<null | "build" | "refine">(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [instruction, setInstruction] = useState("");
  const [coolingDown, setCoolingDown] = useState(false);
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
        message: "Couldn't reach the server. Check your connection and try again.",
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
      // The server component holds `initialConcept`. Without this, navigating
      // away and back replays a stale RSC payload and the build looks lost.
      router.refresh();
    }
    setBusy(null);
  }

  async function onRefine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = instruction.trim();
    if (busy !== null || text.length < 3) return;

    // Don't silently swallow the click — an unexplained dead button reads as a
    // broken app. Say why, and let the disabled state show it is temporary.
    const since = Date.now() - lastSentAt.current;
    if (since < MIN_INTERVAL_MS) {
      setCoolingDown(true);
      window.setTimeout(() => setCoolingDown(false), MIN_INTERVAL_MS - since);
      return;
    }
    lastSentAt.current = Date.now();

    setBusy("refine");
    const result = await post<{ concept: Concept; refinementId: string }>("/api/refine", {
      projectId,
      instruction: text,
    });

    if (result !== null) {
      setConcept(result.concept);
      // An empty id means the server could not write the history row. Showing
      // an entry that vanishes on reload is worse than showing none.
      if (result.refinementId !== "") {
        setHistory((prev) => [
          { id: result.refinementId, instruction: text, createdAt: new Date().toISOString() },
          ...prev,
        ]);
      }
      setInstruction("");
      router.refresh();
    }
    setBusy(null);
  }

  const errorBlock = failure ? (
    <div
      role="alert"
      className={`rounded-md border px-4 py-3 text-sm ${
        TONE[failure.code] ?? "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      <p className="font-medium">{title(failure.code)}</p>
      <p className="mt-1 opacity-90">{failure.message}</p>
    </div>
  ) : null;

  /* ---- Nothing built yet ---- */
  if (concept === null) {
    return (
      <div className="space-y-4">
        {errorBlock}
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-14 text-center">
          <div className="space-y-1">
            <p className="font-medium">Ready to build</p>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm text-pretty">
              Turn this analysis into a proposed product — name, features,
              navigation, pages and a UI direction you can argue with.
            </p>
          </div>
          <Button onClick={onBuild} disabled={busy !== null}>
            {busy === "build" ? "Building…" : "Build My Product"}
          </Button>
        </div>
        {busy === "build" ? <BuildSkeleton /> : null}
      </div>
    );
  }

  /* ---- Built ---- */
  return (
    <div className="space-y-6">
      <form onSubmit={onRefine} className="bg-card space-y-3 rounded-lg border p-4">
        <div className="space-y-1">
          <label htmlFor="instruction" className="text-sm font-medium">
            Refine the product
          </label>
          <p className="text-muted-foreground text-xs">
            Describe a change in plain English. The whole concept updates.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="instruction"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Make it suitable for enterprise customers."
            maxLength={500}
            disabled={busy !== null}
          />
          <Button
            type="submit"
            disabled={busy !== null || coolingDown || instruction.trim().length < 3}
          >
            {busy === "refine" ? "Updating…" : coolingDown ? "Just a sec…" : "Update"}
          </Button>
        </div>

        {coolingDown ? (
          <p role="status" className="text-muted-foreground text-xs">
            One change at a time — the free AI tier allows 15 requests a minute.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInstruction(suggestion)}
              disabled={busy !== null}
              className="bg-muted hover:bg-muted/70 text-muted-foreground rounded-full px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>

      {errorBlock}

      {history.length > 0 ? (
        <details className="bg-card rounded-lg border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            Refinement history{" "}
            <span className="text-muted-foreground font-normal">({history.length})</span>
          </summary>
          <ol className="mt-3 space-y-2 border-t pt-3">
            {history.map((entry) => (
              <li key={entry.id} className="text-muted-foreground flex gap-2.5 text-sm">
                <span aria-hidden className="text-muted-foreground/50">
                  ↳
                </span>
                <span className="text-pretty">{entry.instruction}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <div className={busy === "refine" ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
        <ConceptView concept={concept} />
      </div>
    </div>
  );
}

function BuildSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[3, 2, 4].map((lines, index) => (
        <div key={index} className="bg-card space-y-3 rounded-lg border p-5">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: lines }, (_, i) => (
            <Skeleton key={i} className="h-3.5" style={{ width: `${95 - i * 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
