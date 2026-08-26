"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useConcept } from "@/components/concept/concept-store";
import { Display, Scan, Spark } from "@/components/ui/icons";

/**
 * Splits a project into separate surfaces instead of one long page.
 *
 * The teardown is seven cells and the concept is six more; stacked, building a
 * product dropped the user at the top of a page whose new content started
 * about two screens down. They are separate artifacts — the brief treats them
 * as gated steps — so they get separate tabs. Preview is a third: the same
 * concept rendered as a page rather than as a spec.
 *
 * **Every panel stays mounted.** Only `hidden` toggles. ProductStudio holds the
 * refinement history, in-flight state and the change summary in React state;
 * unmounting it on every tab switch would throw all three away and, worse,
 * would discard a diff the user had not finished reading. `hidden` also drops
 * inactive panels from the accessibility tree and the tab order, which
 * `display:none` via a class would not do as reliably.
 *
 * Tab state is mirrored into `?view=` with replaceState rather than a router
 * push: it makes the tab linkable and survives a refresh, without a server
 * round-trip or a new history entry per click.
 */

export type TabId = "teardown" | "product" | "preview";

const TABS: { id: TabId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "teardown", label: "Teardown", Icon: Scan },
  { id: "product", label: "Your product", Icon: Spark },
  { id: "preview", label: "Preview", Icon: Display },
];

/** The tabs that only mean something once a concept exists. */
const NEEDS_CONCEPT: ReadonlySet<TabId> = new Set<TabId>(["product", "preview"]);

export function ProjectView({
  teardown,
  product,
  preview,
  initialTab,
}: {
  teardown: ReactNode;
  product: ReactNode;
  preview: ReactNode;
  initialTab: TabId;
}) {
  // Read from the store rather than a `built` prop: the concept can appear
  // mid-session when the user clicks Build, and a server-rendered boolean would
  // stay stale until a reload, leaving the new preview tab looking empty.
  const { concept } = useConcept();
  const built = concept !== null;

  const [tab, setTab] = useState<TabId>(initialTab);
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = useCallback((next: TabId) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url);
  }, []);

  // Left/Right move between tabs, which is what a tablist is expected to do.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const index = TABS.findIndex((t) => t.id === tab);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = TABS[(index + delta + TABS.length) % TABS.length];
      if (next === undefined) return;
      select(next.id);
      tabRefs.current[next.id]?.focus();
    },
    [tab, select],
  );

  // Someone arriving on ?view=preview before a build would land on an empty
  // tab; once a concept exists that is no longer true, so only correct the
  // initial value.
  useEffect(() => {
    if (NEEDS_CONCEPT.has(initialTab) && !built) setTab("teardown");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panels: Record<TabId, ReactNode> = { teardown, product, preview };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Project sections"
        onKeyDown={onKeyDown}
        className="border-hairline bg-shell/60 sticky top-24 z-20 mb-8 inline-flex gap-1 rounded-full border p-1 backdrop-blur-xl"
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              ref={(node) => {
                tabRefs.current[id] = node;
              }}
              role="tab"
              id={`${baseId}-tab-${id}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(id)}
              className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
                active
                  ? "bg-core border-hairline-strong border shadow-(--inner-highlight)"
                  : "text-dim hover:text-ink"
              }`}
            >
              <Icon className={`size-4 ${active ? "text-ember" : ""}`} />
              {label}
              {NEEDS_CONCEPT.has(id) && built ? (
                <span aria-hidden className="bg-ember size-1.5 rounded-full" />
              ) : null}
            </button>
          );
        })}
      </div>

      {TABS.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`${baseId}-panel-${id}`}
          aria-labelledby={`${baseId}-tab-${id}`}
          hidden={tab !== id}
        >
          {panels[id]}
        </div>
      ))}
    </div>
  );
}
