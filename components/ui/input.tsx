import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Text input.
 *
 * Taller and softer than the shadcn default (h-8 reads as a settings row, not
 * a field you are meant to write in). The focus state is an ember ring rather
 * than a border-colour change, so it reads at a glance which field is live.
 *
 * `text-base` on mobile is deliberate: iOS Safari zooms the viewport on focus
 * for anything under 16px.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-hairline-strong bg-core/50 h-11 w-full min-w-0 rounded-xl border px-3.5 py-2",
        "text-base md:text-sm",
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

export { Input };
