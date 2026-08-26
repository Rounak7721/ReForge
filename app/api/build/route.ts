import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { fromPipelineError } from "@/lib/api/llm-error";
import { loadProject } from "@/lib/api/project";
import { generateStructured } from "@/lib/llm";
import { buildBuilderPrompt, conceptSchema, type Concept } from "@/lib/prompts/builder";
import { createClient } from "@/lib/supabase/server";

/**
 * Step 2: analysis → product concept.
 *
 * Consumes the **cached analysis**, never the raw site. One dependency hop, so
 * a rebuild is cheap and does not re-fetch anything.
 */

export const maxDuration = 60;

const buildRequestSchema = z.object({
  projectId: z.uuid("Not a valid project id."),
  /** Explicit opt-in to spend a request regenerating a concept that exists. */
  force: z.boolean().optional(),
});

export type BuildResult = { concept: Concept; cached: boolean };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_input", "Expected a JSON body.");
  }

  const parsed = buildRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const { projectId, force } = parsed.data;

  const loaded = await loadProject(projectId);
  if (!loaded.ok) {
    if (loaded.reason === "unauthorized") {
      return apiError("unauthorized", "Sign in to build this product.");
    }
    if (loaded.reason === "error") {
      return apiError("internal_error", "Couldn't load that project. Please try again.");
    }
    return apiError("not_found", "That project doesn't exist.");
  }
  const { analysis, concept, description, targetCustomer } = loaded.project;

  if (analysis === null) {
    return apiError("invalid_input", "Analyze the website before building the product.");
  }

  // Never spend a request regenerating something we already have. A
  // double-clicked button must not cost quota.
  if (concept !== null && force !== true) {
    return NextResponse.json<BuildResult>({ concept, cached: true });
  }

  try {
    const { system, prompt } = buildBuilderPrompt({ analysis, description, targetCustomer });

    const built = await generateStructured({
      schema: conceptSchema,
      schemaName: "product_concept",
      system,
      prompt,
      maxOutputTokens: 8192,
    });

    const supabase = await createClient();
    // `.is("concept", null)` makes the write conditional, so two tabs racing a
    // first build cannot clobber each other — the loser's row update simply
    // matches nothing. A forced rebuild is an explicit overwrite, so it skips
    // the condition.
    const claim = supabase.from("projects").update({ concept: built }).eq("id", projectId);
    const { error } = await (force === true ? claim : claim.is("concept", null));

    if (error !== null) {
      console.error("[build] failed to persist concept", {
        code: error.code,
        message: error.message,
      });
      return apiError("internal_error", "We built the concept but couldn't save it. Please try again.");
    }

    return NextResponse.json<BuildResult>({ concept: built, cached: false });
  } catch (error) {
    return fromPipelineError(error, "build");
  }
}
