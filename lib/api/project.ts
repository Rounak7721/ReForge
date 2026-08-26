import "server-only";

import { analysisSchema, type Analysis } from "@/lib/prompts/analyzer";
import { storedConceptSchema, type Concept } from "@/lib/prompts/builder";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared loader for the pipeline routes.
 *
 * Both /api/build and /api/refine need "the caller's project, with its jsonb
 * columns validated rather than cast". Doing it once means they cannot drift
 * apart on authorisation, which is the part that must never differ.
 */

export type LoadedProject = {
  id: string;
  description: string;
  targetCustomer: string;
  analysis: Analysis | null;
  concept: Concept | null;
  /** The cached starter site, when one has been generated. */
  generatedHtml: string | null;
};

export type LoadResult =
  | { ok: true; project: LoadedProject }
  | { ok: false; reason: "unauthorized" | "not_found" | "error" };

export async function loadProject(projectId: string): Promise<LoadResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return { ok: false, reason: "unauthorized" };

  // RLS scopes this to the caller, so someone else's valid id returns no row
  // and is indistinguishable from a typo — which is the behaviour we want.
  const { data, error } = await supabase
    .from("projects")
    .select("id, description, target_customer, analysis, concept, generated_html")
    .eq("id", projectId)
    .maybeSingle();

  if (error !== null) {
    // Distinct from "not_found": telling a user their project doesn't exist
    // during a database outage is both wrong and non-retryable.
    console.error("[project] load failed", { code: error.code, message: error.message });
    return { ok: false, reason: "error" };
  }
  if (data === null) return { ok: false, reason: "not_found" };

  // jsonb comes back as `Json`. Validate rather than cast: a row written by an
  // older schema should degrade predictably instead of crashing downstream.
  const analysis = analysisSchema.safeParse(data.analysis);
  // storedConceptSchema, not conceptSchema: this reads a row that may predate
  // the open-list palette, and the refine route feeds the result straight back
  // to the Editor. Parsing with the wire schema would reject every legacy row
  // and make old projects unrefinable.
  const concept = storedConceptSchema.safeParse(data.concept);

  return {
    ok: true,
    project: {
      id: data.id,
      description: data.description,
      targetCustomer: data.target_customer,
      analysis: analysis.success ? analysis.data : null,
      concept: concept.success ? concept.data : null,
      generatedHtml: data.generated_html,
    },
  };
}
