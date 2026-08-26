import type { Analysis } from "@/lib/prompts/analyzer";

/**
 * Renders an analysis. A pure function of the object and nothing else — no
 * fetching, no state — so the same component serves a fresh result and one
 * loaded from the database years later.
 *
 * Phase 3's ConceptView mirrors this shape deliberately.
 */

function Section({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-card rounded-lg border p-5 ${className}`}>
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {hint ? <p className="text-muted-foreground/70 mt-0.5 text-xs">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Prose({ children }: { children: string }) {
  return <p className="text-sm leading-relaxed text-pretty">{children}</p>;
}

function Chips({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="bg-muted text-foreground/80 rounded-full px-3 py-1 text-xs font-medium"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
          <span aria-hidden className="bg-muted-foreground/40 mt-2 size-1.5 shrink-0 rounded-full" />
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Numbered({ items }: { items: readonly string[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed">
          <span className="bg-foreground text-background flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums">
            {index + 1}
          </span>
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function AnalysisView({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-4">
      <Section title="What this product does">
        <Prose>{analysis.whatItDoes}</Prose>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Target users">
          <Chips items={analysis.targetUsers} />
        </Section>
        <Section title="Core problem">
          <Prose>{analysis.coreProblem}</Prose>
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Key features">
          <Bullets items={analysis.keyFeatures} />
        </Section>
        <Section title="Business model">
          <Prose>{analysis.businessModel}</Prose>
        </Section>
      </div>

      {/* The two forward-looking fields. Visually separated because they are
          proposals rather than observations, and the distinction is the whole
          point of the analysis. */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Suggested improvements"
          hint="To the existing product"
          className="border-dashed"
        >
          <Bullets items={analysis.suggestedImprovements} />
        </Section>
        <Section
          title="Proposed MVP features"
          hint="For the product you described"
          className="border-dashed"
        >
          <Numbered items={analysis.mvpFeatures} />
        </Section>
      </div>
    </div>
  );
}
