import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Multi-line input. Matches Input's surface and focus treatment.
 *
 * `field-sizing-content` lets it grow with what is typed instead of forcing a
 * scrollbar inside a four-line box — the description field routinely takes a
 * couple of sentences.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-hairline-strong bg-core/50 field-sizing-content min-h-24 w-full rounded-xl border px-3.5 py-3",
        "text-base leading-relaxed md:text-sm",
        "placeholder:text-faint/80",
        "shadow-(--inner-highlight) backdrop-blur-sm",
        "transition-[border-color,box-shadow,background-color] duration-300 ease-spring",
        "outline-none focus-visible:border-ember/50 focus-visible:ring-2 focus-visible:ring-ember/25 focus-visible:outline-none",
        "hover:border-hairline-strong hover:bg-core/70",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-destructive/60 aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
