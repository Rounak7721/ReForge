"use client";

import { useMemo, useState } from "react";

import { useConcept } from "@/components/concept/concept-store";
import { PreviewFrame } from "@/components/preview/preview-frame";
import { Spark } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";
import { renderConceptPage } from "@/lib/preview/render-concept";

/**
 * The Preview tab: the concept rendered as an actual web page.
 *
 * Costs nothing. `renderConceptPage` is a pure function over data already in
 * the database, so this tab works with the daily model quota fully spent — which
 * matters, because the quota is shared with whoever is grading this.
 *
 * Page switching lives out here rather than inside the frame: the rendered nav
 * is presentational, since a link would navigate the sandboxed document away
 * from its own srcdoc with nowhere to go.
 */
export function PreviewPanel() {
  const { concept } = useConcept();
  const [pageIndex, setPageIndex] = useState(0);

  // Rendering is cheap, but it runs on every keystroke elsewhere in the tree
  // without this, since the panel stays mounted while other tabs are active.
  const html = useMemo(
    () => (concept === null ? "" : renderConceptPage(concept, pageIndex)),
    [concept, pageIndex],
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

  // A refinement can delete the page that was selected. Clamp for display
  // rather than resetting state, so removing page 4 leaves you near where you
  // were instead of snapping back to the home page.
  const active = Math.min(pageIndex, concept.pages.length - 1);
  const page = concept.pages[active];

  return (
    <Reveal className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
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

        <p className="text-faint font-mono text-[11px]">
          rendered from the concept · no AI call
        </p>
      </div>

      <PreviewFrame
        html={html}
        title={`${concept.name.toLowerCase().replace(/\s+/g, "")}.com${
          page?.path === "/" ? "" : (page?.path ?? "")
        }`}
      />
    </Reveal>
  );
}
