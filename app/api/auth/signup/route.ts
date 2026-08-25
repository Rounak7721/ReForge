import { NextResponse, type NextRequest } from "next/server";

import { credentialsSchema } from "@/lib/api/auth-schema";
import { apiError } from "@/lib/api/errors";
import { fromAuthError } from "@/lib/api/supabase-auth-error";
import { createClient } from "@/lib/supabase/server";

export type SignupResult = {
  /**
   * False when the project still requires email confirmation — signUp returns
   * a user but no session, and the UI must say so rather than redirecting to a
   * dashboard the user cannot reach.
   */
  signedIn: boolean;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_input", "Expected a JSON body.");
  }

  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError("invalid_input", first?.message ?? "Invalid input.");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp(parsed.data);

    if (error) return fromAuthError(error);

    return NextResponse.json<SignupResult>({ signedIn: data.session !== null });
  } catch {
    return apiError("internal_error", "Could not create your account. Please try again.");
  }
}
