import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard — Reforge" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
        <p className="text-muted-foreground text-sm">
          Each project starts with a website you want to learn from.
        </p>
      </div>

      {/* Empty state. The project list and a working CTA arrive in Phase 4. */}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
        <div className="space-y-1">
          <p className="font-medium">No projects yet</p>
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">
            Paste a product&apos;s website, tell us what you want to build and
            who it&apos;s for, and Reforge takes it from there.
          </p>
        </div>
        <Button disabled>New project</Button>
        <p className="text-muted-foreground/70 text-xs">Coming in the next build.</p>
      </div>
    </div>
  );
}
