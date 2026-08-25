"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Reforge is deliberately light-only for the MVP: one theme to design, one to
 * QA. The provider is still mounted because shadcn's components resolve their
 * theme through `next-themes` (see `components/ui/sonner.tsx`) — without it
 * they fall back to "system" and a visitor on OS dark mode gets a dark toast
 * on a light page.
 *
 * Enabling dark mode later is a props change here, nothing else.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme="light"
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
