import { AuthApiError, type AuthError } from "@supabase/supabase-js";

import { apiError } from "@/lib/api/errors";

/**
 * Maps a Supabase AuthError onto our own envelope.
 *
 * Matches on `error.code` — Supabase's stable, machine-readable identifier —
 * rather than on `message` substrings. Messages are not an API contract: they
 * change wording and are locale-dependent. An earlier version of this file
 * matched substrings and turned a clear 400 "email address is invalid" into an
 * opaque 502, because no substring happened to match. See docs/04-debugging-log.md
 * entry 3.
 */
export function fromAuthError(error: AuthError) {
  const code = error instanceof AuthApiError ? error.code : undefined;

  switch (code) {
    case "email_address_invalid":
      return apiError("invalid_input", "That email address isn't valid.");

    case "validation_failed":
      return apiError("invalid_input", "Check your email and password and try again.");

    case "invalid_credentials":
      return apiError("invalid_credentials", "That email and password combination isn't right.");

    case "user_already_exists":
    case "email_exists":
      return apiError("email_taken", "An account with that email already exists. Try logging in.");

    case "weak_password":
      return apiError("weak_password", "That password is too weak. Use at least 8 characters.");

    case "email_not_confirmed":
      return apiError(
        "unauthorized",
        "Please confirm your email address, then log in.",
      );

    case "over_email_send_rate_limit":
      // Distinct from a generic 429: this is the project's email allowance, and
      // it does not clear in seconds. Saying "retrying" here would be a lie.
      return apiError(
        "rate_limited",
        "Too many sign-up emails have been sent recently. Please try again later.",
      );

    case "over_request_rate_limit":
      return apiError("rate_limited", "Too many attempts. Please wait a moment and try again.");

    case "signup_disabled":
    case "email_provider_disabled":
      return apiError("upstream_error", "Sign-ups are currently unavailable.");
  }

  // Fall back to status for older errors that predate `code`.
  if (error.status === 429) {
    return apiError("rate_limited", "Too many attempts. Please wait a moment and try again.");
  }

  // Unmapped. Log it — a silent catch-all is where the next bug hides. The
  // browser still gets a safe generic message; the detail stays server-side.
  console.error("[auth] unmapped Supabase error", {
    code,
    status: error.status,
    name: error.name,
    message: error.message,
  });

  return apiError("upstream_error", "Something went wrong. Please try again.");
}
