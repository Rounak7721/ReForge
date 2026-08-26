import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Hostname for display, without the crash.
 *
 * `new URL(...)` throws on anything malformed, and it was being called inline
 * in a `.map()` over database rows — one bad row would take out the whole
 * project list rather than degrading a single card. Rows predate the current
 * validation, so this cannot assume they are all well-formed.
 */
export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
