/**
 * Resolves a caller-supplied `next` destination to a safe same-origin path.
 *
 * `value.startsWith("/")` is NOT sufficient: `//evil.com` and `/\evil.com` both
 * start with a slash and are protocol-relative URLs, so a browser treats them
 * as absolute and navigates off-origin. That turns a genuine login on the real
 * domain into a credential-phishing handoff.
 *
 * Returns `fallback` for anything that isn't a plain same-origin path.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;

  // Must be a rooted path, and must not be protocol-relative.
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;

  // Browsers normalise backslashes to forward slashes, so `/\evil.com` is
  // protocol-relative too. Control characters can truncate the string before a
  // parser sees the rest of it.
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  // Resolve against a throwaway origin and confirm nothing escaped it.
  try {
    const base = "https://reforge.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
