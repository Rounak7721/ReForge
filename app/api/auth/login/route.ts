import { NextResponse, type NextRequest } from "next/server";

import { credentialsSchema } from "@/lib/api/auth-schema";
import { apiError } from "@/lib/api/errors";
import { fromAuthError } from "@/lib/api/supabase-auth-error";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_input", "Expected a JSON body.");
  }

  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    // Deliberately generic: telling an unauthenticated caller *which* field is
    // malformed on a login route is free reconnaissance.
    return apiError("invalid_credentials", "That email and password combination isn't right.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) return fromAuthError(error);

    return NextResponse.json({ ok: true });
  } catch {
    return apiError("internal_error", "Could not sign you in. Please try again.");
  }
}
