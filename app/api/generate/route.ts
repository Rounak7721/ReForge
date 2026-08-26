import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { fromPipelineError } from "@/lib/api/llm-error";
import { loadProject } from "@/lib/api/project";
import { codegenProvider } from "@/lib/env";
import { generateStructured } from "@/lib/llm";
import {
  buildCodeEditorPrompt,
  buildCoderPrompt,
  estimateTokens,
  generatedSiteSchema,
} from "@/lib/prompts/coder";
import { createClient } from "@/lib/supabase/server";

/**
 * Generate a starter site from the concept, and edit it in natural language.
 *
 * One route with two modes rather than `/api/generate` plus
 * `/api/generate/refine`. The two differ only in which prompt is built —
 * authorisation, the concept precondition, the model call, the persistence and
 * every error path are identical, so splitting them would duplicate the whole
 * handler to vary one function call. The mode is legible from the request: an
 * `instruction` means edit, its absence means generate.
 *
 * Runs on `CODEGEN_PROVIDER`, which is Groq by default while the rest of the
 * pipeline stays on Gemini. That split is the point: it keeps the two daily
 * quotas separate, so generating pages cannot exhaust the budget that analysis
 * and refinement depend on.
 */

// Code generation is the slowest call in the app — a full page is ~2.5k output
// tokens and measured around 6s, with the stricter retry doubling the worst
// case. 60s is Vercel Hobby's ceiling.
export const maxDuration = 60;

/**
 * Groq's free tier charges the prompt AND `max_completion_tokens` against a
 * single 8000 tokens-per-minute budget, **up front**, before a token is
 * generated. Asking for 8192 output on a 700-token prompt is therefore an
 * instant HTTP 413 — the request is rejected for exceeding a limit it has not
 * used yet. This is the one number that has to be right.
 *
 * ponytail: hard-coded to Groq's free-tier ceiling rather than read per
 * provider. If a second constrained provider is ever added, move it onto
 * `LLMProvider` as a `tokensPerMinute` field.
 */
const TPM_CEILING = 8000;

/** Headroom for the token estimate being approximate and for chat overhead. */
const TPM_SAFETY = 700;

/**
 * The ceiling above is Groq's, and applying it to every provider would export
 * one vendor's free-tier limit onto vendors that do not share it — refusing to
 * edit a large page on Gemini, whose window is far bigger, for a reason that
 * does not exist there. `CODEGEN_PROVIDER` unset falls back to Gemini, and
 * that fallback has to actually work.
 */
function perMinuteCeiling(provider: string): number | null {
  return provider === "groq" ? TPM_CEILING : null;
}

const generateRequestSchema = z.object({
  projectId: z.uuid("Not a valid project id."),
  /** Present = edit the existing page. Absent = generate it from the concept. */
  instruction: z
    .string()
    .trim()
    .min(3, "Tell us what to change.")
    .max(500, "Keep the instruction under 500 characters.")
    .optional(),
});

export type GenerateResult = {
  html: string;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_input", "Expected a JSON body.");
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const { projectId, instruction } = parsed.data;

  const loaded = await loadProject(projectId);
  if (!loaded.ok) {
    if (loaded.reason === "unauthorized") {
      return apiError("unauthorized", "Sign in to generate a site.");
    }
    if (loaded.reason === "error") {
      return apiError("internal_error", "Couldn't load that project. Please try again.");
    }
    return apiError("not_found", "That project doesn't exist.");
  }
  const { concept, generatedHtml } = loaded.project;

  if (concept === null) {
    return apiError("invalid_input", "Build the product before generating a site.");
  }
  // Editing needs something to edit. Falling back to a fresh generation here
  // would silently discard whatever the user was iterating on.
  if (instruction !== undefined && generatedHtml === null) {
    return apiError("invalid_input", "Generate the starter site before editing it.");
  }

  try {
    const { system, prompt } =
      instruction === undefined
        ? buildCoderPrompt(concept)
        : buildCodeEditorPrompt(generatedHtml ?? "", instruction);

    // Editing sends the whole document up and gets the whole document back, so
    // the output budget is whatever the per-minute ceiling has left after the
    // prompt. Generation's prompt is small, so it is capped for economy rather
    // than by necessity.
    const provider = codegenProvider();
    const ceiling = perMinuteCeiling(provider);
    const promptTokens = estimateTokens(system) + estimateTokens(prompt);

    // Ask for what the task needs, not for everything the ceiling allows.
    // Groq reserves `max_completion_tokens` against the per-minute budget up
    // front, so an over-generous request does not merely go unused — it is
    // charged, and it is what makes the very next edit fail. Generation is
    // sized from measured output (~3.8k tokens for a complete page); an edit
    // returns the document it was given, so it is sized from that.
    // The 1.7 multiplier is headroom for the edit growing the page — "add a
    // pricing section" legitimately returns more than it received — plus the
    // reasoning tokens the model spends even at low effort. Measured: a 1199
    // token page came back as 1918 output tokens.
    const needed =
      instruction === undefined
        ? 4608
        : Math.ceil(estimateTokens(generatedHtml ?? "") * 1.7) + 640;
    const budget =
      ceiling === null ? needed : Math.min(needed, ceiling - promptTokens - TPM_SAFETY);

    // A document too large to send back within the remaining budget would be
    // truncated mid-tag. Refusing with an explanation beats returning a broken
    // page, and beats a raw 413 from the vendor. Only reachable on a provider
    // that actually has a per-minute ceiling.
    if (ceiling !== null && budget < estimateTokens(generatedHtml ?? "") * 1.1) {
      return apiError(
        "invalid_input",
        "This page has grown too large to edit on the free tier. Generate a fresh starter site to keep editing.",
      );
    }

    // A very large concept prompt can drive the budget to zero or below.
    // `generateStructured` would silently clamp it back to its floor and the
    // vendor would answer with an opaque 413, so it is caught here where the
    // cause is still visible.
    if (budget <= 0) {
      return apiError(
        "invalid_input",
        "This project is too large to generate a site from on the free tier.",
      );
    }

    const site = await generateStructured({
      schema: generatedSiteSchema,
      schemaName: "starter_site",
      system,
      prompt,
      provider,
      maxOutputTokens: budget,
      // Higher than the pipeline's 0.4. Generating a page is a design task and
      // a low temperature produced noticeably samey layouts. Editing is not a
      // design task: it wants the model to leave alone everything it was not
      // asked to change.
      temperature: instruction === undefined ? 0.7 : 0.3,
    });

    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("projects")
      .update({ generated_html: site.html })
      .eq("id", projectId);

    if (updateError !== null) {
      console.error("[generate] failed to persist site", {
        code: updateError.code,
        message: updateError.message,
      });
      return apiError(
        "internal_error",
        "We generated the site but couldn't save it. Please try again.",
      );
    }

    return NextResponse.json<GenerateResult>({ html: site.html });
  } catch (error) {
    return fromPipelineError(error, "generate");
  }
}
