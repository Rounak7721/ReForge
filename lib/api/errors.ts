import { NextResponse } from "next/server";

/**
 * Typed error envelope shared by every route handler.
 *
 * `code` is what the UI branches on; `message` is what it shows. Keeping them
 * separate means a rate-limited state can be rendered differently from a
 * generic failure without string-matching the message.
 */
export type ApiErrorCode =
  | "invalid_input"
  | "invalid_credentials"
  | "email_taken"
  | "weak_password"
  | "rate_limited"
  | "quota_exhausted"
  | "site_unreachable"
  | "not_found"
  | "unauthorized"
  | "upstream_error"
  | "internal_error";

export type ApiError = {
  error: { code: ApiErrorCode; message: string };
};

const STATUS: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  invalid_credentials: 401,
  unauthorized: 401,
  email_taken: 409,
  weak_password: 422,
  rate_limited: 429,
  // Same status, deliberately a different code: the per-minute limit clears on
  // retry and the daily one does not, so the UI must render them differently.
  quota_exhausted: 429,
  site_unreachable: 422,
  not_found: 404,
  upstream_error: 502,
  internal_error: 500,
};

export function apiError(code: ApiErrorCode, message: string) {
  return NextResponse.json<ApiError>({ error: { code, message } }, {
    status: STATUS[code],
  });
}
