import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    // A failed sign-out still clears local cookies, so treat it as success for
    // the user's purposes rather than stranding them on a page they think is
    // authenticated.
    if (error) {
      return NextResponse.json({ ok: true, warning: "Session cleared locally." });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return apiError("internal_error", "Could not log you out. Please try again.");
  }
}
