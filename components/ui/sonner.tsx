"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { Check, Close, Fault, Scan } from "@/components/ui/icons";

/**
 * Toasts.
 *
 * Icons come from the project set rather than Lucide so the toast matches
 * every other icon on screen at stroke 1.25 — a 2px pack here reads as a
 * borrowed component.
 *
 * The loading spinner uses `spin-slow`, which degrades to a pulse under
 * `prefers-reduced-motion` instead of spinning regardless.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <Check className="size-4 text-emerald-500" />,
        info: <Scan className="size-4" />,
        warning: <Fault className="text-ember size-4" />,
        error: <Close className="text-destructive size-4" />,
        loading: (
          <span
            aria-hidden
            className="spin-slow size-4 rounded-full border-2 border-current border-t-transparent"
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--core)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--hairline-strong)",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
