import type { Concept } from "@/lib/prompts/builder";

/**
 * Renders a concept. A pure function of the object — no fetching, no state —
 * so it serves a freshly built concept, a refined one, and one loaded from
 * Postgres a week later, identically.
 *
 * Deliberately renders the *structure* rather than listing fields: navigation
 * as a mock nav bar, pages as an outline, the palette as swatches. That is
 * already the shape a visual preview needs, so adding one later is a sibling
 * component reading this same object rather than a rewrite.
 */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-lg border p-5">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {hint ? <p className="text-muted-foreground/70 mt-0.5 text-xs">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Swatch({ label, value }: { label: string; value: string }) {
  // The model returns a hex string; anything else still renders, just without
  // a colour chip, rather than throwing.
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-md border"
        style={isHex ? { backgroundColor: value.trim() } : undefined}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-muted-foreground font-mono text-xs">{value}</p>
      </div>
    </div>
  );
}

export function ConceptView({ concept }: { concept: Concept }) {
  return (
    <div className="space-y-4">
      <section className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold tracking-tight">{concept.name}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
          {concept.description}
        </p>
      </section>

      <Section title="Navigation">
        <div className="bg-muted/40 flex flex-wrap items-center gap-1 rounded-md border px-3 py-2">
          {concept.navigation.map((item, index) => (
            <span
              key={`${item.path}-${item.label}-${index}`}
              className="text-foreground/80 rounded px-2.5 py-1 text-xs font-medium"
            >
              {item.label}
            </span>
          ))}
        </div>
        <ul className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
          {concept.navigation.map((item, index) => (
            <li key={`path-${item.path}-${index}`}>{item.path}</li>
          ))}
        </ul>
      </Section>

      <Section title="Features">
        <ul className="grid gap-3 sm:grid-cols-2">
          {/* Composite keys: the model can legitimately repeat a name or path,
              and a duplicate React key misreconciles the list on refine. */}
          {concept.features.map((feature, index) => (
            <li key={`${feature.name}-${index}`} className="bg-muted/40 rounded-md px-3.5 py-3">
              <p className="text-sm font-medium">{feature.name}</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed text-pretty">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Page structure" hint={`${concept.pages.length} pages`}>
        <div className="space-y-3">
          {concept.pages.map((page, pageIndex) => (
            <div key={`${page.path}-${pageIndex}`} className="rounded-md border">
              <div className="flex flex-wrap items-baseline gap-2 border-b px-3.5 py-2">
                <span className="text-sm font-medium">{page.name}</span>
                <span className="text-muted-foreground font-mono text-xs">{page.path}</span>
              </div>
              <ul className="divide-y">
                {page.sections.map((section, index) => (
                  <li key={`${page.path}-${pageIndex}-${index}`} className="flex gap-3 px-3.5 py-2.5">
                    <span className="bg-muted text-muted-foreground mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase">
                      {section.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-pretty">{section.headline}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed text-pretty">
                        {section.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="UI direction">
        <dl className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Style", concept.uiDirection.style],
              ["Mood", concept.uiDirection.mood],
              ["Typography", concept.uiDirection.typography],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
              <dd className="mt-0.5 text-sm text-pretty">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Swatch label="Primary" value={concept.uiDirection.palette.primary} />
          <Swatch label="Surface" value={concept.uiDirection.palette.surface} />
          <Swatch label="Text" value={concept.uiDirection.palette.text} />
        </div>
      </Section>
    </div>
  );
}
