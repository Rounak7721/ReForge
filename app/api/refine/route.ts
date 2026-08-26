import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { fromPipelineError } from "@/lib/api/llm-error";
import { loadProject } from "@/lib/api/project";
import { generateStructured } from "@/lib/llm";
import { conceptSchema, type Concept } from "@/lib/prompts/builder";
import { buildEditorPrompt } from "@/lib/prompts/editor";
import { createClient } from "@/lib/supabase/server";

/**
 * Step 3: concept + natural-language instruction → updated concept.
 *
 * Returns the FULL object rather than a patch, so persisting is one write and
 * rendering is unchanged from the build path.
 */

export const maxDuration = 60;

const refineRequestSchema = z.object({
  projectId: z.uuid("Not a valid project id."),
  instruction: z
    .string()
    .trim()
    .min(3, "Tell us what to change.")
    .max(500, "Keep the instruction under 500 characters."),
});

export type RefineResult = {
  concept: Concept;
  /** Empty when the history row could not be written — the concept still saved. */
  refinementId: string;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_input", "Expected a JSON body.");
  }

  const parsed = refineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const { projectId, instruction } = parsed.data;

  const loaded = await loadProject(projectId);
  if (!loaded.ok) {
    if (loaded.reason === "unauthorized") {
      return apiError("unauthorized", "Sign in to change this product.");
    }
    if (loaded.reason === "error") {
      return apiError("internal_error", "Couldn't load that project. Please try again.");
    }
    return apiError("not_found", "That project doesn't exist.");
  }
  const { concept } = loaded.project;

  if (concept === null) {
    return apiError("invalid_input", "Build the product before refining it.");
  }

  try {
    const { system, prompt } = buildEditorPrompt({ concept, instruction });

    const updated = await generateStructured({
      schema: conceptSchema,
      schemaName: "product_concept",
      system,
      prompt,
      maxOutputTokens: 8192,
    });

    const supabase = await createClient();

    const { error: updateError } = await supabase
      .from("projects")
      .update({ concept: updated })
      .eq("id", projectId);

    if (updateError !== null) {
      console.error("[refine] failed to persist concept", {
        code: updateError.code,
        message: updateError.message,
      });
      return apiError("internal_error", "We updated the concept but couldn't save it. Please try again.");
    }

    // The history row stores the full concept after the edit, which is what
    // makes undo "restore the previous row" rather than "replay the edits".
    const { data: refinement, error: historyError } = await supabase
      .from("refinements")
      .insert({ project_id: projectId, instruction, concept_after: updated })
      .select("id")
      .single();

    if (historyError !== null) {
      // The concept itself is saved. Losing the history row is a degraded
      // result, not a failed request — surfacing an error here would tell the
      // user their change failed when it did not.
      console.error("[refine] failed to log refinement", {
        code: historyError.code,
        message: historyError.message,
      });
    }

    return NextResponse.json<RefineResult>({
      concept: updated,
      refinementId: refinement?.id ?? "",
    });
  } catch (error) {
    return fromPipelineError(error, "refine");
  }
}
