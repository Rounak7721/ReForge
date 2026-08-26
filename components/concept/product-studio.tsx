"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { ConceptDiffPanel } from "@/components/concept/concept-diff";
import { ConceptView } from "@/components/concept/concept-view";
import { Button, ButtonIcon } from "@/components/ui/button";
import { ArrowUp, History, Spark } from "@/components/ui/icons";
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

const MIN_LENGTH = 3;

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
  const [invalid, setInvalid] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [diff, setDiff] = useState<{ diff: ConceptDiff; instruction: string } | null>(null);
  const lastSentAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // The server component holds `initialConcept`. Without this, navigating
      // away and back replays a stale RSC payload and the build looks lost.
      router.refresh();
    }
    setBusy(null);
  }

  async function onRefine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy !== null) return;

    const text = instruction.trim();

    // Validate on submit rather than disabling the button. A dead button gives
    // the user nothing to act on; an inline message and focus does.
    if (text.length < MIN_LENGTH) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);

    // Don't silently swallow the click — an unexplained dead button reads as a
    // broken app. Say why, and let the state show it is temporary.
    const since = Date.now() - lastSentAt.current;
    if (since < MIN_INTERVAL_MS) {
      setCoolingDown(true);
      window.setTimeout(() => setCoolingDown(false), MIN_INTERVAL_MS - since);
      return;
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
      setInstruction("");
      router.refresh();
    }
    setBusy(null);
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

      {/* ---------------- Command bar ----------------
          Sticky to the bottom of the viewport so the instruction box is always
          within reach while scrolling a long concept. It edits the concept
          object; it is deliberately NOT a message transcript — the artifact on
          screen stays the product, not the conversation. */}
      <div className="sticky bottom-4 z-30 pt-2 pb-[env(safe-area-inset-bottom)]">
        <form
          onSubmit={onRefine}
          className="border-hairline bg-shell/85 rounded-[1.75rem] border p-2.5 shadow-(--shadow-lifted) backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="instruction" className="sr-only">
              Describe a change to the product concept
            </label>

            <span aria-hidden className="text-ember pl-2.5 font-mono text-sm">
              ↳
            </span>

            <input
              ref={inputRef}
              id="instruction"
              name="instruction"
              type="text"
              value={instruction}
              onChange={(event) => {
                setInstruction(event.target.value);
                if (invalid) setInvalid(false);
              }}
              placeholder="Make it suitable for enterprise customers…"
              maxLength={500}
              disabled={busyRefining}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={invalid}
              aria-describedby={invalid ? "instruction-error" : undefined}
              className="placeholder:text-faint/80 min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none disabled:opacity-50"
            />

            <Button
              type="submit"
              size="icon"
              // Stays enabled until the request actually starts; length is
              // validated on submit instead.
              disabled={busyRefining || coolingDown}
              aria-label={busyRefining ? "Updating…" : "Apply change"}
            >
              {busyRefining ? (
                <span
                  aria-hidden
                  className="spin-slow size-4 rounded-full border-2 border-current border-t-transparent"
                />
              ) : (
                <ArrowUp />
              )}
            </Button>
          </div>

          {invalid ? (
            <p id="instruction-error" role="alert" className="text-destructive px-4 pt-2 text-xs">
              Describe the change in a few more words — “Add a dashboard”, say.
            </p>
          ) : null}

          {coolingDown ? (
            <p role="status" className="text-faint px-4 pt-2 text-xs">
              One change at a time — the free AI tier allows 15 requests a minute.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5 px-1 pt-2.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setInstruction(suggestion);
                  setInvalid(false);
                  inputRef.current?.focus();
                }}
                disabled={busyRefining}
                className="border-hairline text-dim hover:border-ember/40 hover:text-ink rounded-full border px-3 py-1.5 text-xs transition-colors duration-300 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </form>
      </div>
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
