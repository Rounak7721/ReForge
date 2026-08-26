import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalysisView } from "@/components/analysis/analysis-view";
import {
  ProductStudio,
  type RefinementEntry,
} from "@/components/concept/product-studio";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Spark } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";
import { analysisSchema } from "@/lib/prompts/analyzer";
import { conceptSchema } from "@/lib/prompts/builder";
import { createClient } from "@/lib/supabase/server";
import { safeHostname } from "@/lib/utils";

export const metadata: Metadata = { title: "Project" };

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
    <div className="space-y-12">
      {/* ---------------- Project header ---------------- */}
      <Reveal>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/dashboard">
            {/* aria-hidden on the glyph: without it a screen reader announces
                "left arrow Projects". */}
            <ArrowLeft />
            Projects
          </Link>
        </Button>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="display max-w-3xl text-3xl font-semibold text-pretty sm:text-[2.5rem]">
              {project.description}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="border-hairline bg-shell text-dim rounded-full border px-3 py-1.5 text-[13px]">
                <span className="text-faint">For</span> {project.target_customer}
              </span>

              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="border-hairline text-dim hover:border-ember/40 hover:text-ink inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors duration-300"
              >
                {safeHostname(project.url)}
                <ExternalLink className="size-3" />
              </a>

              {concept.success ? (
                <span className="bg-ember-soft text-ember inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] tracking-wide uppercase">
                  <Spark className="size-3" />
                  Built
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Reveal>

      {analysis.success ? (
        <>
          <AnalysisView analysis={analysis.data} />

          <section aria-labelledby="product-heading" className="border-hairline border-t pt-12">
            <Reveal className="flex items-center gap-3">
              <Spark className="text-ember size-4" />
              <h2 id="product-heading" className="eyebrow text-faint">
                {concept.success ? "Your product" : "Next step"}
              </h2>
              <span aria-hidden className="bg-hairline h-px flex-1" />
            </Reveal>

            <div className="mt-6">
              <ProductStudio
                projectId={project.id}
                initialConcept={concept.success ? concept.data : null}
                initialRefinements={refinements}
              />
            </div>
          </section>
        </>
      ) : (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/10 text-destructive rounded-2xl border px-5 py-4 text-sm"
        >
          <p className="font-medium">This analysis couldn’t be displayed</p>
          <p className="mt-1 opacity-90">
            It was saved in a format this version of Reforge doesn’t recognise. Analyzing
            the site again will fix it.
          </p>
        </div>
      )}
    </div>
  );
}
