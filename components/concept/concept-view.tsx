import type { Concept } from "@/lib/prompts/builder";
import { Layers, Palette, Route, Spark } from "@/components/ui/icons";
import { Reveal, Spotlight } from "@/components/ui/motion";

/**
 * Renders a concept. A pure function of the object — no fetching, no state —
 * so it serves a freshly built concept, a refined one, and one loaded from
 * Postgres a week later, identically.
 *
 * Deliberately renders the *structure* rather than listing fields: navigation
 * as a real nav bar, pages as an outline, the palette applied to a working
 * mock rather than shown as three loose swatches. That is already the shape a
 * visual preview or a code generator needs, so adding one later is a sibling
 * component reading this same object rather than a rewrite.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The model returns a hex string. Anything else must degrade, not throw. */
function hex(value: string, fallback: string): string {
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed : fallback;
}

/**
 * First colour carrying `role`, else the fallback.
 *
 * The palette is an open list now, so nothing guarantees a surface or a text
 * exists — the user can refine it down to two accents. The mock has to render
 * regardless, so every lookup has a literal fallback.
 */
function byRole(palette: Concept["uiDirection"]["palette"], role: string, fallback: string) {
  return hex(palette.find((entry) => entry.role === role)?.hex ?? "", fallback);
}

function Cell({
  title,
  icon: Icon,
  hint,
  children,
  className = "",
  delay = 0,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <Spotlight as="section" className="plate plate-interactive flex h-full flex-col p-6">
        <div className="flex items-center gap-2.5">
          <Icon className="text-faint size-4 shrink-0" />
          <h3 className="eyebrow text-faint">{title}</h3>
          {hint ? <span className="text-faint ml-auto font-mono text-[11px]">{hint}</span> : null}
        </div>
        <div className="mt-4 flex-1">{children}</div>
      </Spotlight>
    </Reveal>
  );
}

/**
 * The palette, applied rather than described.
 *
 * Three swatches tell you the model picked #E4562A. A mock frame painted in
 * those three colours tells you whether they actually work together, which is
 * the only question the user has.
 */
function PalettePreview({ concept }: { concept: Concept }) {
  const palette = concept.uiDirection.palette;
  const primary = byRole(palette, "primary", "#E4562A");
  const surface = byRole(palette, "surface", "#FBFAF8");
  const text = byRole(palette, "text", "#1A1815");
  const accents = palette.filter((entry) => entry.role === "accent");

  return (
    <div
      className="border-hairline-strong overflow-hidden rounded-xl border shadow-(--inner-highlight)"
      style={{ backgroundColor: surface, color: text }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: `1px solid ${text}14` }}
      >
        <span
          aria-hidden
          className="size-4 shrink-0 rounded-[5px]"
          style={{ backgroundColor: primary }}
        />
        <span className="truncate text-[11px] font-semibold" translate="no">
          {concept.name}
        </span>
        <span
          aria-hidden
          className="ml-auto rounded-full px-2 py-1 text-[9px] font-medium"
          style={{ backgroundColor: primary, color: surface }}
        >
          Action
        </span>
      </div>

      <div className="space-y-2 px-3 py-3">
        <span aria-hidden className="block h-1.5 w-3/4 rounded-full" style={{ backgroundColor: `${text}26` }} />
        <span aria-hidden className="block h-1.5 w-1/2 rounded-full" style={{ backgroundColor: `${text}14` }} />

        {/* Accents shown in the mock rather than only in the swatch list — a
            palette of six is a claim about the product, and it should be
            visible that they actually sit together. */}
        {accents.length > 0 ? (
          <span aria-hidden className="flex gap-1 pt-1">
            {accents.slice(0, 6).map((entry, index) => (
              <span
                key={`${entry.hex}-${index}`}
                className="h-1.5 flex-1 rounded-full"
                style={{ backgroundColor: hex(entry.hex, text) }}
              />
            ))}
          </span>
        ) : (
          <span aria-hidden className="block h-1.5 w-2/3 rounded-full" style={{ backgroundColor: `${text}14` }} />
        )}
      </div>
    </div>
  );
}

function Swatch({ label, value, role }: { label: string; value: string; role?: string }) {
  const isHex = HEX.test(value.trim());
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="border-hairline-strong size-9 shrink-0 rounded-lg border shadow-(--inner-highlight)"
        style={isHex ? { backgroundColor: value.trim() } : undefined}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{label}</p>
        <p className="text-faint truncate font-mono text-[11px]">
          {value}
          {role !== undefined && role !== "accent" ? (
            <span className="text-faint/70"> · {role}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function ConceptView({ concept }: { concept: Concept }) {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      {/* Identity. Display type and an ember edge — this is the answer the
          whole pipeline exists to produce. */}
      <Reveal className="md:col-span-6">
        <section className="bezel ember-glow border-ember/25">
          <div className="bezel-core p-7 sm:p-9">
            <div className="flex items-center gap-2.5">
              <Spark className="text-ember size-4" />
              <p className="eyebrow text-ember">Your product</p>
            </div>
            <h3 className="display mt-4 text-3xl font-semibold sm:text-4xl" translate="no">
              {concept.name}
            </h3>
            <p className="text-dim measure mt-4 text-[15px] leading-relaxed text-pretty sm:text-base">
              {concept.description}
            </p>
          </div>
        </section>
      </Reveal>

      <Cell
        title="Navigation"
        icon={Route}
        hint={`${concept.navigation.length} routes`}
        className="md:col-span-4"
        delay={60}
      >
        {/* Rendered as the nav bar it describes, not as a list of strings. */}
        <div className="border-hairline bg-shell flex flex-wrap items-center gap-1 rounded-xl border p-1.5">
          {concept.navigation.map((item, index) => (
            <span
              key={`${item.path}-${item.label}-${index}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                index === 0 ? "bg-core border-hairline border shadow-(--inner-highlight)" : "text-dim"
              }`}
            >
              {item.label}
            </span>
          ))}
        </div>
        <ul className="text-faint mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
          {concept.navigation.map((item, index) => (
            <li key={`path-${item.path}-${index}`}>{item.path}</li>
          ))}
        </ul>
      </Cell>

      <Cell title="UI direction" icon={Palette} className="md:col-span-2" delay={100}>
        <PalettePreview concept={concept} />
        <dl className="mt-4 space-y-2.5">
          {(
            [
              ["Style", concept.uiDirection.style],
              ["Mood", concept.uiDirection.mood],
              ["Typography", concept.uiDirection.typography],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-faint text-[11px] font-medium">{label}</dt>
              <dd className="mt-0.5 text-[13px] leading-snug text-pretty">{value}</dd>
            </div>
          ))}
        </dl>
      </Cell>

      <Cell
        title="Features"
        icon={Layers}
        hint={`${concept.features.length}`}
        className="md:col-span-3"
        delay={140}
      >
        <ul className="space-y-2.5">
          {/* Composite keys: the model can legitimately repeat a name or path,
              and a duplicate React key misreconciles the list on refine. */}
          {concept.features.map((feature, index) => (
            <li
              key={`${feature.name}-${index}`}
              className="border-hairline bg-shell/60 rounded-xl border px-4 py-3"
            >
              <p className="text-[14px] font-medium">{feature.name}</p>
              <p className="text-dim mt-1 text-[13px] leading-relaxed text-pretty">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </Cell>

      <Cell
        title="Page structure"
        icon={Layers}
        hint={`${concept.pages.length} pages`}
        className="md:col-span-3"
        delay={180}
      >
        <div className="space-y-3">
          {concept.pages.map((page, pageIndex) => (
            <div
              key={`${page.path}-${pageIndex}`}
              className="border-hairline overflow-hidden rounded-xl border"
            >
              <div className="border-hairline bg-shell flex flex-wrap items-baseline gap-2 border-b px-4 py-2.5">
                <span className="text-[13px] font-semibold">{page.name}</span>
                <span className="text-faint font-mono text-[11px]">{page.path}</span>
              </div>
              <ul className="divide-hairline divide-y">
                {page.sections.map((section, index) => (
                  <li
                    key={`${page.path}-${pageIndex}-${index}`}
                    className="flex gap-3 px-4 py-3"
                  >
                    <span className="bg-secondary text-faint mt-0.5 h-fit shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase">
                      {section.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-pretty">{section.headline}</p>
                      <p className="text-dim mt-0.5 text-xs leading-relaxed text-pretty">
                        {section.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Cell>

      <Cell
        title="Palette"
        icon={Palette}
        hint={`${concept.uiDirection.palette.length}`}
        className="md:col-span-6"
        delay={220}
      >
        {/* Wraps to however many colours the concept actually has. The old
            three-column grid was hardcoded to primary/surface/text, which is
            what made a four-colour request impossible to display even once the
            model could return one. */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {concept.uiDirection.palette.map((entry, index) => (
            <Swatch
              key={`${entry.hex}-${entry.name}-${index}`}
              label={entry.name}
              role={entry.role}
              value={entry.hex}
            />
          ))}
        </div>
      </Cell>
    </div>
  );
}
