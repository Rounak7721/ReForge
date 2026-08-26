import type { Analysis } from "@/lib/prompts/analyzer";
import {
  Fault,
  Layers,
  Scan,
  Spark,
  Steps,
  Users,
  Vault,
} from "@/components/ui/icons";
import { Reveal, Spotlight } from "@/components/ui/motion";

/**
 * Renders an analysis. A pure function of the object and nothing else — no
 * fetching, no state — so the same component serves a fresh result and one
 * loaded from the database years later.
 *
 * Laid out as an asymmetrical bento rather than seven identical stacked cards.
 * The fields are not equally important and the layout now says so: what the
 * product does gets the full width and display type, the two forward-looking
 * fields get their own visually distinct row at the bottom, and everything
 * between is paired by relationship.
 *
 * ConceptView mirrors this shape deliberately.
 */

function Cell({
  title,
  icon: Icon,
  hint,
  children,
  className = "",
  tone = "default",
  delay = 0,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "proposal";
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <Spotlight
        as="section"
        className={`plate plate-interactive flex h-full flex-col p-6 ${
          tone === "proposal" ? "border-ember/25 bg-ember-soft/40" : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon
            className={`size-4 shrink-0 ${tone === "proposal" ? "text-ember" : "text-faint"}`}
          />
          <h3 className={`eyebrow ${tone === "proposal" ? "text-ember" : "text-faint"}`}>
            {title}
          </h3>
        </div>
        {hint ? <p className="text-faint mt-1.5 text-xs">{hint}</p> : null}
        <div className="mt-4">{children}</div>
      </Spotlight>
    </Reveal>
  );
}

function Prose({ children, large = false }: { children: string; large?: boolean }) {
  return (
    <p
      className={`text-pretty ${
        large ? "text-[17px] leading-relaxed sm:text-lg" : "text-[14.5px] leading-relaxed"
      }`}
    >
      {children}
    </p>
  );
}

function Chips({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="border-hairline bg-shell rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-[14.5px] leading-relaxed">
          <span aria-hidden className="bg-ember/50 mt-2 size-1.5 shrink-0 rounded-full" />
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Numbered({ items }: { items: readonly string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-[14.5px] leading-relaxed">
          <span
            className="bg-ember text-ember-contrast flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
            data-numeric
          >
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
    <section aria-labelledby="teardown-heading">
      <Reveal className="flex items-center gap-3">
        <Scan className="text-ember size-4" />
        <h2 id="teardown-heading" className="eyebrow text-faint">
          Teardown
        </h2>
        <span aria-hidden className="bg-hairline h-px flex-1" />
      </Reveal>

      <div className="mt-6 grid gap-4 md:grid-cols-6">
        {/* The headline finding gets the full width and display type. */}
        <Cell title="What this product does" icon={Scan} className="md:col-span-6">
          <Prose large>{analysis.whatItDoes}</Prose>
        </Cell>

        <Cell title="Target users" icon={Users} className="md:col-span-2" delay={60}>
          <Chips items={analysis.targetUsers} />
        </Cell>

        <Cell title="Core problem" icon={Fault} className="md:col-span-4" delay={100}>
          <Prose>{analysis.coreProblem}</Prose>
        </Cell>

        {/* Equal spans here, not 4/2: key features is a list of short phrases
            and the business model is a paragraph, so the wide cell would sit
            half-empty while the prose was squeezed into a column. */}
        <Cell title="Key features" icon={Layers} className="md:col-span-3" delay={140}>
          <Bullets items={analysis.keyFeatures} />
        </Cell>

        <Cell title="Business model" icon={Vault} className="md:col-span-3" delay={180}>
          <Prose>{analysis.businessModel}</Prose>
        </Cell>

        {/* The two forward-looking fields. Tinted rather than merely dashed —
            these are proposals, not observations, and the distinction is the
            whole point of the analysis. */}
        <Cell
          title="Suggested improvements"
          icon={Steps}
          hint="To the existing product"
          tone="proposal"
          className="md:col-span-3"
          delay={220}
        >
          <Bullets items={analysis.suggestedImprovements} />
        </Cell>

        <Cell
          title="Proposed MVP features"
          icon={Spark}
          hint="For the product you described"
          tone="proposal"
          className="md:col-span-3"
          delay={260}
        >
          <Numbered items={analysis.mvpFeatures} />
        </Cell>
      </div>
    </section>
  );
}
