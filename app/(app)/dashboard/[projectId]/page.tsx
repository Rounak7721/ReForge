import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalysisView } from "@/components/analysis/analysis-view";
import {
  ProductStudio,
  type RefinementEntry,
} from "@/components/concept/product-studio";
import { analysisSchema } from "@/lib/prompts/analyzer";
import { conceptSchema } from "@/lib/prompts/builder";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Project — Reforge" };

/**
 * Renders a saved project entirely from Postgres.
 *
 * This page makes ZERO model calls — both a cost rule and requirement 6.
 * If you are ever tempted to regenerate something here, add a route and a
 * button instead.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  // RLS scopes this to the current user, so a valid id belonging to someone
  // else returns no row and falls through to notFound() — same as a typo.
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, url, description, target_customer, analysis, concept, created_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error !== null) {
    console.error("[project] failed to load", { code: error.code, message: error.message });
    throw new Error("Could not load this project.");
  }
  if (project === null) notFound();

  // The columns are `jsonb`, so their type is `Json` — validate rather than
  // cast. A row written by an older schema should degrade, not crash the page.
  const analysis = analysisSchema.safeParse(project.analysis);
  const concept = conceptSchema.safeParse(project.concept);

  // Refinement history. Ordered newest-first so the studio can prepend without
  // re-sorting. RLS on `refinements` is scoped through the parent project.
  const { data: refinementRows, error: refinementsError } = await supabase
    .from("refinements")
    .select("id, instruction, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (refinementsError !== null) {
    // Non-fatal — the concept still renders — but a silent empty history is
    // indistinguishable from "no refinements yet", so it must be logged.
    console.error("[project] failed to load refinements", {
      code: refinementsError.code,
      message: refinementsError.message,
    });
  }

  const refinements: RefinementEntry[] = (refinementRows ?? []).map((row) => ({
    id: row.id,
    instruction: row.instruction,
    createdAt: row.created_at,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Projects
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-pretty">
            {project.description}
          </h1>
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground/70">For</span> {project.target_customer}
          </p>
        </div>

        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-muted-foreground hover:text-foreground inline-flex text-xs underline underline-offset-4"
        >
          Analyzed from {new URL(project.url).hostname}
        </a>
      </div>

      {analysis.success ? (
        <>
          <AnalysisView analysis={analysis.data} />

          <div className="space-y-4 border-t pt-8">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Your product</h2>
              <p className="text-muted-foreground text-sm">
                {concept.success
                  ? "Refine it with an instruction — the whole concept updates."
                  : "The analysis is done. Now turn it into something to build."}
              </p>
            </div>

            <ProductStudio
              projectId={project.id}
              initialConcept={concept.success ? concept.data : null}
              initialRefinements={refinements}
            />
          </div>
        </>
      ) : (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          <p className="font-medium">This analysis couldn&apos;t be displayed</p>
          <p className="mt-1 opacity-90">
            It was saved in a format this version of Reforge doesn&apos;t
            recognise. Analyzing the site again will fix it.
          </p>
        </div>
      )}
    </div>
  );
}
