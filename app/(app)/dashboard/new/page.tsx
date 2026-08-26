import type { Metadata } from "next";
import Link from "next/link";

import { AnalyzeForm } from "@/components/analyze/analyze-form";

export const metadata: Metadata = { title: "New project — Reforge" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-1">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Analyze a product</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Point Reforge at a product you admire and tell it what you want to
          build instead. You&apos;ll get a breakdown of the original and an MVP
          plan for yours.
        </p>
      </div>

      <AnalyzeForm />
    </div>
  );
}
