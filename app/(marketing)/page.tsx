import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reforge — turn any product into your own",
};

export default function LandingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
          <span
            className="bg-primary size-1.5 rounded-full"
            aria-hidden="true"
          />
          Coming soon
        </div>

        <div className="space-y-5">
          <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Reforge
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg text-pretty">
            Point us at any product&apos;s website. We analyze what it does, who
            it serves and where it falls short — then generate your own product
            concept, and refine it in plain English.
          </p>
        </div>

        <p className="text-muted-foreground/70 text-sm">
          Currently in active development.
        </p>
      </div>
    </main>
  );
}
