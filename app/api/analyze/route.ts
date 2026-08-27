import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { ANALYZE_LIMIT, checkRateLimit } from "@/lib/api/rate-limit";
import { fromPipelineError } from "@/lib/api/llm-error";
import { generateStructured, getLLM } from "@/lib/llm";
import { analysisSchema, buildAnalyzerPrompt, type Analysis } from "@/lib/prompts/analyzer";
import { fetchSite } from "@/lib/scrape/fetch-site";
import { captureScreenshot } from "@/lib/scrape/screenshot";
import { createClient } from "@/lib/supabase/server";

/**
 * Step 1 of the pipeline: fetch the target site, analyze it, persist the result.
 *
 * The project row is created HERE, after the analysis succeeds, rather than
 * beforehand. That is what makes "unreachable URL → nothing persisted"
 * structural instead of a cleanup path that can itself fail.
 */

// Vercel's default is 10s, and the worst case here is 8s of site fetch plus a
// 20s model call plus a 20s stricter retry. Hobby's ceiling is 60s, so the
// per-call timeout in lib/llm/providers/gemini.ts is sized to fit inside it —
// the handler must never be killed mid-flight, because that spends quota and
// persists nothing.
export const maxDuration = 60;

const analyzeRequestSchema = z.object({
  url: z.url("Enter a full website URL, including https://"),
  description: z
    .string()
    .trim()
    .min(10, "Describe what you want to build in at least 10 characters.")
    .max(2000, "Keep the description under 2000 characters."),
  targetCustomer: z
    .string()
    .trim()
    .min(3, "Say who this is for.")
    .max(500, "Keep the target customer under 500 characters."),
});

export type AnalyzeResult = {
  projectId: string;
  analysis: Analysis;
  /** The site was a client-rendered shell; the analysis leans on metadata. */
  siteWasThin: boolean;
  /** A screenshot was captured and analysed alongside the text. */
  sawScreenshot: boolean;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_input", "Expected a JSON body.");
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError("invalid_input", first?.message ?? "Invalid input.");
  }
  const { url, description, targetCustomer } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return apiError("unauthorized", "Sign in to analyze a website.");
  }

  // Before the network fetch and the model call, not after. This endpoint is
  // the expensive one — it spends a Gemini request every time, with no cache to
  // fall back on. See lib/api/rate-limit.ts for why the count comes from the
  // `projects` table rather than a counter.
  const limited = await checkRateLimit(supabase, ANALYZE_LIMIT, user.id);
  if (limited !== null) return limited;

  try {
    // Concurrent, not sequential. Both hit the network for the same target and
    // neither needs the other's result, so running them in series would add
    // microlink's latency straight onto a 60s budget that already has to fit a
    // model call plus its stricter retry.
    //
    // `fetchSite` rejecting is fatal — no text, no analysis. `captureScreenshot`
    // resolves to null instead of throwing, so it cannot fail the request; it
    // is awaited through the same Promise.all purely for the concurrency.
    // Only capture if the configured model can actually look at it. Skipping
    // the call outright is better than capturing and discarding: it saves a
    // round trip, and it keeps `hasScreenshot` below honest for every provider.
    const canSee = getLLM().supportsImages;
    const [site, screenshot] = await Promise.all([
      fetchSite(url),
      canSee ? captureScreenshot(url) : null,
    ]);

    const { system, prompt } = buildAnalyzerPrompt({
      site,
      description,
      targetCustomer,
      hasScreenshot: screenshot !== null,
    });

    const analysis = await generateStructured({
      schema: analysisSchema,
      schemaName: "product_analysis",
      system,
      prompt,
      // The image rides along on the call that was already being made, so
      // vision costs no extra request against the daily quota.
      ...(screenshot === null ? {} : { image: screenshot }),
      // Raised from 4096: the response now carries three more prose fields, and
      // this budget caps thinking AND output combined on this model family.
      maxOutputTokens: screenshot === null ? 4096 : 5120,
    });

    // Anon client with the request's cookies, so RLS enforces
    // user_id = auth.uid(). The service-role client has no business here.
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        url: site.finalUrl,
        description,
        target_customer: targetCustomer,
        analysis,
      })
      .select("id")
      .single();

    if (error !== null) {
      console.error("[analyze] failed to persist project", {
        code: error.code,
        message: error.message,
      });
      return apiError("internal_error", "We analyzed the site but couldn't save it. Please try again.");
    }

    return NextResponse.json<AnalyzeResult>({
      projectId: data.id,
      analysis,
      siteWasThin: site.thin,
      sawScreenshot: screenshot !== null,
    });
  } catch (error) {
    return fromPipelineError(error, "analyze");
  }
}
