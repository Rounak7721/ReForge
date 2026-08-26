"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Reforge follows the OS by default and lets the user override it.
 *
 * `defaultTheme="system"` + `enableSystem` means a first-time visitor gets
 * whatever their machine is set to, with no flash — next-themes writes the
 * class in a blocking inline script before paint, which is also why
 * `suppressHydrationWarning` sits on <html> in app/layout.tsx.
 *
 * `disableTransitionOnChange` suppresses every CSS transition for one frame
 * during a theme swap. Without it the page cross-fades a hundred properties at
 * once and the toggle feels broken rather than instant.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
