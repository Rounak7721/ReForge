import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExportDocument } from "@/components/project/export-document";
import { analysisSchema } from "@/lib/prompts/analyzer";
import { storedConceptSchema } from "@/lib/prompts/builder";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Export",
  // A print sheet has no business being indexed.
  robots: { index: false, follow: false },
};

/**
 * The printable product brief.
 *
 * Rendered as a real page with a print stylesheet rather than generated with a
 * PDF library, for three reasons:
 *
 * 1. **No new dependency.** Every package with an install script has to be
 *    declared in `pnpm-workspace.yaml`'s `allowBuilds` or `pnpm install` exits
 *    1 and silently breaks lint, build and the deploy — that has bitten this
 *    project twice (`docs/04-debugging-log.md` 4). A PDF library is a large addition
 *    to dodge for a single button.
 * 2. **Better output.** The browser's print engine hyphenates, kerns, breaks
 *    pages on real box boundaries and embeds the same webfonts the app uses.
 *    Hand-laying that out in jsPDF produces something visibly worse.
 * 3. **Zero cost and zero server work.** No rendering service, no headless
 *    Chromium on serverless — both of which the project's cost rules exclude.
 *
 * Like the project page, this makes ZERO model calls: it reads the saved row.
 */
export default async function ExportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  // RLS scopes this to the owner, so someone else's id returns no row and
  // falls through to notFound() — the export cannot leak a project.
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, url, description, target_customer, analysis, concept, created_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error !== null) {
    console.error("[export] failed to load", { code: error.code, message: error.message });
    throw new Error("Could not load this project.");
  }
  if (project === null) notFound();

  const analysis = analysisSchema.safeParse(project.analysis);
  const concept = storedConceptSchema.safeParse(project.concept);

  // Nothing to export without a concept — that is what the button gates on,
  // but a hand-typed URL must not render a half-empty document.
  if (!concept.success) notFound();

  const { data: refinementRows } = await supabase
    .from("refinements")
    .select("id, instruction, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return (
    <ExportDocument
      project={{
        description: project.description,
        targetCustomer: project.target_customer,
        url: project.url,
        createdAt: project.created_at,
      }}
      analysis={analysis.success ? analysis.data : null}
      concept={concept.data}
      refinements={(refinementRows ?? []).map((row) => row.instruction)}
    />
  );
}
