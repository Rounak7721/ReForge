/**
 * The demo account.
 *
 * These credentials are **intentionally public** — they are printed in the
 * README so an evaluator can see a finished project without spending any of
 * the shared daily Gemini quota. This is not a secret that leaked; it is a
 * fixture, and the account contains nothing but seeded data.
 *
 * Overridable by env so a fork can point at its own demo user.
 */
export const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@reforge.app";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "reforge-demo-2026";
