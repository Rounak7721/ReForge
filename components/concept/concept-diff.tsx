"use client";

import { useEffect, useState } from "react";

import type { Change, ConceptDiff } from "@/lib/concept-diff";
import { Check, Close, Minus, Plus, Swap } from "@/components/ui/icons";

/**
 * "Here is what changed."
 *
 * Without this the concept silently swaps and the user has to diff two screens
 * from memory — which is exactly the moment a demo loses the room. Showing the
 * delta is also the clearest possible evidence that the instruction was
 * understood and applied.
 *
 * Dismissible, and auto-clears on the next refinement, because it describes an
 * event rather than a state.
 */

const STYLES: Record<
  Change["kind"],
  { icon: React.ComponentType<{ className?: string }>; chip: string; verb: string }
> = {
  added: {
    icon: Plus,
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    verb: "Added",
  },
  removed: {
    icon: Minus,
    chip: "bg-destructive/12 text-destructive",
    verb: "Removed",
  },
  changed: {
    icon: Swap,
    chip: "bg-ember-soft text-ember",
    verb: "Changed",
  },
};

export function ConceptDiffPanel({
  diff,
  instruction,
  onDismiss,
}: {
  diff: ConceptDiff;
  instruction: string;
  onDismiss: () => void;
}) {
  const [entered, setEntered] = useState(false);

  // Mount, then animate — setting both in the same frame gives no transition.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const { changes, counts } = diff;
  const total = changes.length;

  return (
    <div
      // polite, not assertive: the user just pressed the button, so they are
      // already looking here. Assertive would interrupt for no reason.
      role="status"
      aria-live="polite"
      className={`border-hairline bg-core/70 overflow-hidden rounded-2xl border shadow-(--shadow-ambient) backdrop-blur-md transition-[opacity,transform] duration-500 ease-expo motion-reduce:transition-none ${
        entered ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="border-hairline flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-5 py-3.5">
        <span className="bg-ember-soft text-ember flex size-6 shrink-0 items-center justify-center rounded-full">
          <Check className="size-3.5" />
        </span>

        <p className="text-[13px] font-medium">
          {total === 0 ? "Applied — nothing structural changed" : "Concept updated"}
        </p>

        {total > 0 ? (
          <div className="flex items-center gap-1.5">
            {counts.added > 0 ? (
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${STYLES.added.chip}`}>
                +{counts.added}
              </span>
            ) : null}
            {counts.removed > 0 ? (
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${STYLES.removed.chip}`}>
                −{counts.removed}
              </span>
            ) : null}
            {counts.changed > 0 ? (
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${STYLES.changed.chip}`}>
                ~{counts.changed}
              </span>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss change summary"
          className="text-faint hover:text-ink hover:bg-secondary ml-auto flex size-7 items-center justify-center rounded-full transition-colors"
        >
          <Close className="size-3.5" />
        </button>
      </div>

      <div className="px-5 py-4">
        <p className="text-faint text-xs">
          You asked: <span className="text-dim">“{instruction}”</span>
        </p>

        {total === 0 ? (
          /* An honest empty result. The model returned a valid concept that
             happens to be equivalent — saying "nothing changed" is far better
             than implying an edit that did not happen. */
          <p className="text-dim mt-3 text-[13px] leading-relaxed text-pretty">
            The concept came back equivalent — the instruction may already be
            satisfied, or it may not apply to this draft. Try naming a specific
            page or feature.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {changes.map((change, index) => {
              const style = STYLES[change.kind];
              const Icon = style.icon;
              return (
                <li
                  key={`${change.area}-${change.label}-${index}`}
                  className="flex items-start gap-2.5 text-[13px]"
                >
                  <span
                    className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-md ${style.chip}`}
                  >
                    <Icon className="size-3" />
                  </span>
                  <span className="min-w-0 text-pretty">
                    <span className="text-faint font-mono text-[11px]">{change.area}</span>{" "}
                    <span className="font-medium">{change.label}</span>
                    {change.from !== undefined && change.to !== undefined ? (
                      <span className="text-dim">
                        {" "}
                        — <span className="line-through opacity-60">{change.from}</span> →{" "}
                        {change.to}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
