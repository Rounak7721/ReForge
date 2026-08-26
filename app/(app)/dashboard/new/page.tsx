import type { Metadata } from "next";
import Link from "next/link";

import { AnalyzeForm } from "@/components/analyze/analyze-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Reveal>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/dashboard">
            <ArrowLeft />
            Projects
          </Link>
        </Button>

        <p className="eyebrow text-ember mt-6">/new</p>
        <h1 className="display mt-3 text-4xl font-semibold sm:text-5xl">
          Analyze a product.
        </h1>
        <p className="text-dim mt-4 text-[16px] leading-relaxed text-pretty">
          Point Reforge at a product you admire and tell it what you want to build
          instead. You get a breakdown of the original and an MVP plan for yours.
        </p>
      </Reveal>

      <Reveal delay={100} className="mt-10">
        <AnalyzeForm />
      </Reveal>
    </div>
  );
}
