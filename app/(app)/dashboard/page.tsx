import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — Reforge" };

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const supabase = await createClient();

  // RLS scopes this to the current user; no user_id filter is needed and
  // adding one would imply the policy is optional.
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, url, description, target_customer, concept, created_at")
    .order("created_at", { ascending: false });

  if (error !== null) {
    console.error("[dashboard] failed to list projects", {
      code: error.code,
      message: error.message,
    });
  }

  const rows = projects ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
          <p className="text-muted-foreground text-sm">
            Each project starts with a website you want to learn from.
          </p>
        </div>
        {rows.length > 0 ? (
          <Button asChild>
            <Link href="/dashboard/new">New project</Link>
          </Button>
        ) : null}
      </div>

      {error !== null ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          <p className="font-medium">Couldn&apos;t load your projects</p>
          <p className="mt-1 opacity-90">Refresh the page to try again.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
          <div className="space-y-1">
            <p className="font-medium">No projects yet</p>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm text-pretty">
              Paste a product&apos;s website, tell us what you want to build and
              who it&apos;s for, and Reforge takes it from there.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/new">New project</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((project) => (
            <li key={project.id}>
              <Link
                href={`/dashboard/${project.id}`}
                className="bg-card hover:border-foreground/20 focus-visible:ring-ring block h-full rounded-lg border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <p className="line-clamp-2 font-medium text-pretty">
                  {project.description}
                </p>
                <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                  For {project.target_customer}
                </p>
                <div className="text-muted-foreground/70 mt-4 flex items-center gap-2 text-xs">
                  <span>{new URL(project.url).hostname}</span>
                  <span aria-hidden>·</span>
                  <span>{DATE_FORMAT.format(new Date(project.created_at))}</span>
                  {project.concept !== null ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-foreground/70 font-medium">Built</span>
                    </>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
