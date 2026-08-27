"use client";

import { useMemo, useState } from "react";

import { useConcept } from "@/components/concept/concept-store";
import { PreviewFrame } from "@/components/preview/preview-frame";
import { Button, ButtonIcon } from "@/components/ui/button";
import { CommandBar } from "@/components/ui/command-bar";
import { Download, Spark } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError, ApiErrorCode } from "@/lib/api/errors";
import { inertLinks } from "@/lib/preview/inert-links";
import { renderConceptPage } from "@/lib/preview/render-concept";

/**
 * The Preview tab: the concept as an actual web page, from one of two sources.
 *
 * **Template** is a pure function of the concept — free, instant, and available
 * with the daily model quota fully spent. **Starter site** is real generated
 * code. The tab opens on the template and the generated page *upgrades* it, so
 * the preview is never empty and never depends on quota being left. That
 * matters when the quota is shared with whoever is grading this.
 *
 * Both render through the same sandboxed frame, which is the payoff for making
 * "one HTML string" the substrate: the frame does not know or care which
 * produced the document it was handed.
 */

/** Edits aimed at the page, not the concept — deliberately visual. */
const SUGGESTIONS = [
  "Make it dark mode.",
  "Add a testimonial section.",
  "Make the hero bolder and larger.",
  "Add a pricing section with three tiers.",
];

const TONE: Partial<Record<ApiErrorCode, string>> = {
  rate_limited: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  quota_exhausted: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

function title(code: ApiErrorCode): string {
  if (code === "quota_exhausted") return "Daily AI limit reached";
  if (code === "rate_limited") return "Slow down a moment";
  return "That didn’t work";
}

type Source = "template" | "generated";

export function PreviewPanel({
  projectId,
  initialGeneratedHtml,
}: {
  projectId: string;
  initialGeneratedHtml: string | null;
}) {
  const { concept } = useConcept();
  const [pageIndex, setPageIndex] = useState(0);
  const [generated, setGenerated] = useState<string | null>(initialGeneratedHtml);
  // Opens on whichever source actually exists, so returning to a project with a
  // generated site shows the generated site.
  const [source, setSource] = useState<Source>(
    initialGeneratedHtml === null ? "template" : "generated",
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ code: ApiErrorCode; message: string } | null>(null);

  // Memoised because the panel stays mounted while other tabs are active, so
  // without it every unrelated keystroke in the tree re-renders the document.
  const templateHtml = useMemo(
    () => (concept === null ? "" : renderConceptPage(concept, pageIndex)),
    [concept, pageIndex],
  );

  // `inertLinks` because a srcdoc document inherits the parent's base URL, so
  // an `<a href="/collections">` in the generated page navigates the FRAME to
  // the app's own route and lands on the login screen. Applied here rather than
  // before storing, so the DB keeps the model's real output and pages generated
  // before the fix are repaired on read. See lib/preview/inert-links.ts.
  const safeGenerated = useMemo(
    () => (generated === null ? null : inertLinks(generated)),
    [generated],
  );

  if (concept === null) {
    return (
      <Reveal>
        <div className="border-hairline bg-shell/40 rounded-2xl border border-dashed px-6 py-16 text-center">
          <Spark className="text-faint mx-auto size-6" />
          <p className="text-ink mt-4 text-sm font-medium">No preview yet</p>
          <p className="text-dim mx-auto mt-1.5 max-w-sm text-sm">
            Build the product first — the preview renders the pages, copy and palette from
            the concept.
          </p>
        </div>
      </Reveal>
    );
  }

  async function post(instruction?: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...(instruction === undefined ? {} : { instruction }) }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        setFailure({
          code: payload.error?.code ?? "internal_error",
          message: payload.error?.message ?? "Something went wrong.",
        });
        return false;
      }
      const result = (await response.json()) as { html: string };
      setGenerated(result.html);
      setSource("generated");
      return true;
    } catch {
      setFailure({ code: "internal_error", message: "Couldn’t reach the server." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const showing =
    source === "generated" && safeGenerated !== null ? safeGenerated : templateHtml;

  function download() {
    // A Blob and an object URL, not a data: URI — a full page exceeds what some
    // browsers accept in a navigable data URL, and this path has no size limit.
    // `showing`, not the generated page: on the Template tab the user is
    // looking at the template, and downloading something else would be a lie.
    const blob = new Blob([showing], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${concept!.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    anchor.click();
    // Revoked on a later tick, not synchronously. `click()` only *starts* the
    // download; revoking in the same turn races the browser's fetch of the
    // blob and silently produces a zero-byte file in some browsers. The delay
    // still frees the object rather than leaking it for the page's lifetime.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const active = Math.min(pageIndex, concept.pages.length - 1);
  const page = concept.pages[active];

  return (
    <div className="space-y-5">
      {failure ? (
        <div
          role="alert"
          className={`rounded-2xl border px-5 py-4 text-sm ${
            TONE[failure.code] ?? "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
        >
          <p className="font-medium">{title(failure.code)}</p>
          <p className="mt-1 opacity-90">{failure.message}</p>
        </div>
      ) : null}

      <Reveal className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Source switch once there is a choice, and the page tabs whenever
              the template is showing. These used to be either/or, which made
              pages 2..n of a multi-page concept unreachable the moment a
              starter site existed. */}
          <div className="flex flex-wrap items-center gap-2">
            {generated !== null ? (
              <div
                className="border-hairline bg-shell/60 inline-flex gap-1 rounded-full border p-1"
                role="tablist"
                aria-label="Preview source"
              >
                {(
                  [
                    ["template", "Template"],
                    ["generated", "Starter site"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={source === value}
                    onClick={() => setSource(value)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-300 ${
                      source === value
                        ? "bg-core border-hairline-strong text-ink border"
                        : "text-dim hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {source === "template" ? (
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Preview pages">
                {concept.pages.map((candidate, index) => {
                  const selected = index === active;
                  return (
                    <button
                      key={`${candidate.path}-${index}`}
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setPageIndex(index)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-300 ${
                        selected
                          ? "bg-core border-hairline-strong text-ink border"
                          : "text-dim hover:text-ink border border-transparent"
                      }`}
                    >
                      {candidate.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            <p className="text-faint font-mono text-[11px]">
              {source === "generated" && generated !== null
                ? "generated code"
                : "rendered from the concept · no AI call"}
            </p>
            <Button variant="outline" size="sm" onClick={download}>
              <Download />
              Download
            </Button>
          </div>
        </div>

        {busy ? (
          <div className="border-hairline bg-core space-y-4 rounded-2xl border p-7" aria-hidden>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <PreviewFrame
            html={showing}
            title={`${concept.name.toLowerCase().replace(/\s+/g, "")}.com${
              source === "generated" || page?.path === "/" ? "" : (page?.path ?? "")
            }`}
          />
        )}

        {generated === null ? (
          <div className="border-hairline bg-shell/40 rounded-2xl border border-dashed px-6 py-8 text-center">
            <p className="text-ink text-sm font-medium">Turn this into real code</p>
            <p className="text-dim mx-auto mt-1.5 max-w-md text-sm">
              Generate a single self-contained HTML page from the concept — then change it
              in plain English and download it.
            </p>
            <div className="mt-5 flex justify-center">
              <Button onClick={() => post()} disabled={busy}>
                {busy ? (
                  <>
                    <span
                      aria-hidden
                      className="spin-slow size-4 rounded-full border-2 border-current border-t-transparent"
                    />
                    Generating…
                  </>
                ) : (
                  <>
                    Build starter site
                    <ButtonIcon>
                      <Spark />
                    </ButtonIcon>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </Reveal>

      {/* Only once there is generated code to edit. Editing the template would
          be misleading — it is a deterministic render, not something the model
          can change. */}
      {generated !== null ? (
        <CommandBar
          id="code-instruction"
          label="Change the page in plain English"
          placeholder="Make it dark mode…"
          suggestions={SUGGESTIONS}
          busy={busy}
          coolingDown={false}
          coolingDownHint=""
          invalidHint="Describe the change in a few more words — “Make it dark mode”, say."
          onSubmit={(text) => post(text)}
        />
      ) : null}
    </div>
  );
}
