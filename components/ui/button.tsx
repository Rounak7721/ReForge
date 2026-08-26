import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Buttons.
 *
 * The variant/size keys match the shadcn originals so no call site had to
 * change, but the values are rebuilt: pill radii, real padding, and press
 * physics on a spring curve rather than the stock 1px nudge.
 *
 * The primary button is ink-on-paper (and paper-on-ink in dark), not ember.
 * The accent is reserved for focus, state and glow — a page where every button
 * is the accent colour has no hierarchy left to spend.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-full border border-transparent bg-clip-padding",
    "text-sm font-medium whitespace-nowrap select-none outline-none",
    "transition-[transform,background-color,border-color,color,box-shadow,opacity]",
    "duration-300 ease-spring",
    "active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none",
    "disabled:pointer-events-none disabled:opacity-45",
    "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-(--shadow-ambient) hover:shadow-(--shadow-lifted) hover:brightness-110 dark:hover:brightness-95",
        outline:
          "border-hairline-strong bg-core/60 text-foreground backdrop-blur-md hover:border-ember/40 hover:bg-core",
        secondary:
          "border-hairline bg-secondary text-secondary-foreground hover:border-hairline-strong hover:brightness-[0.98] dark:hover:brightness-110",
        ghost: "text-dim hover:bg-secondary hover:text-foreground",
        ember:
          "bg-ember text-ember-contrast shadow-[0_8px_28px_-10px_var(--ember)] hover:brightness-110",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/18",
        link: "rounded-md text-foreground underline decoration-hairline-strong underline-offset-4 hover:decoration-current",
      },
      size: {
        default: "h-10 px-5",
        xs: "h-7 gap-1.5 px-3 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-6 text-[0.9375rem]",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/**
 * The trailing icon capsule.
 *
 * An arrow never sits naked beside the label — it gets its own circular well
 * flush with the button's inner padding, and drifts diagonally on hover so the
 * button has internal kinetic tension rather than a flat colour swap.
 *
 * Drop it inside a <Button> as the last child.
 */
function ButtonIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "-mr-2 ml-1 flex size-7 items-center justify-center rounded-full",
        // Tinted from the button's own text colour, not the page theme. The
        // primary button inverts between themes, so a `dark:bg-white/12` well
        // would sit white-on-white in dark mode and disappear.
        "bg-[color-mix(in_oklch,currentColor_14%,transparent)]",
        "transition-transform duration-500 ease-spring",
        "group-hover/button:translate-x-0.5 group-hover/button:-translate-y-px group-hover/button:scale-105",
        "motion-reduce:transition-none motion-reduce:group-hover/button:translate-x-0 motion-reduce:group-hover/button:translate-y-0 motion-reduce:group-hover/button:scale-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Button, ButtonIcon, buttonVariants };
