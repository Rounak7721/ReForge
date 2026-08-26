"use client";

import { useEffect } from "react";

import { LogoMark } from "@/components/marketing/wordmark";
import { Button } from "@/components/ui/button";
import { Download } from "@/components/ui/icons";
import type { Analysis } from "@/lib/prompts/analyzer";
import type { Concept } from "@/lib/prompts/builder";
import { safeHostname } from "@/lib/utils";

/**
 * The printable brief.
 *
 * Everything here is laid out for A4/Letter, not for a screen: the whole
 * document is forced to the light palette (a dark-mode print would waste a
 * cartridge and render grey-on-grey), the toolbar is `print:hidden`, and
 * `break-inside-avoid` keeps cards from being sliced across a page boundary.
 *
 * The print dialog is opened on mount so "Download PDF" behaves like a
 * download rather than a navigation — the user gets the save sheet with the
 * finished document behind it. It is fired after `fonts.ready` because
 * printing mid-font-load renders the fallback face and reflows the page count.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const DATE = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Section({
  title,
  children,
  className = "",
  keepTogether = true,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Long sections must be allowed to flow across a page break. Forcing
   * `break-inside-avoid` on a section taller than a page does not keep it
   * together — it pushes the whole thing to the next page and leaves the
   * first one two-thirds empty, which is exactly what the teardown did.
   */
  keepTogether?: boolean;
}) {
  return (
    <section className={`${keepTogether ? "break-inside-avoid" : ""} ${className}`}>
      <h2 className="mb-3 border-b border-black/15 pb-1.5 font-mono text-[10px] tracking-[0.18em] text-black/55 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ExportDocument({
  project,
  analysis,
  concept,
  refinements,
}: {
  project: { description: string; targetCustomer: string; url: string; createdAt: string };
  analysis: Analysis | null;
  concept: Concept;
  refinements: string[];
}) {
  useEffect(() => {
    // `?print=0` opens the document without the dialog, for anyone who wants
    // to read it before committing to paper.
    if (new URLSearchParams(window.location.search).get("print") === "0") return;

    let cancelled = false;
    const open = () => {
      if (!cancelled) window.print();
    };
    // Fonts first: printing before Bricolage loads sets the whole document in
    // the fallback and changes where the pages break.
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => window.setTimeout(open, 250));
    } else {
      window.setTimeout(open, 600);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // `bg-white text-black` unconditionally — this document is paper.
    <div className="min-h-svh bg-white text-black">
      <style>{`
        @page { size: A4; margin: 16mm 14mm; }
        @media print {
          html, body { background: #fff !important; }
          /* Let the browser print our colours rather than stripping them. */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex w-full max-w-205 items-center justify-between gap-4 px-8 py-3">
          <p className="text-sm text-black/60">
            Your print dialog should be open. Choose{" "}
            <strong className="font-semibold text-black">Save as PDF</strong>.
          </p>
          <Button onClick={() => window.print()} size="sm">
            <Download />
            Print again
          </Button>
        </div>
      </div>

      <article className="mx-auto w-full max-w-205 px-8 py-10 print:px-0 print:py-0">
        {/* ---- Masthead ---- */}
        <header className="mb-9 flex items-start justify-between gap-6 border-b-2 border-black pb-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.18em] text-black/50 uppercase">
              Product brief
            </p>
            <h1
              className="display mt-2 text-[2.1rem] leading-[1.05] font-semibold"
              translate="no"
            >
              {concept.name}
            </h1>
            <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-black/70">
              {concept.description}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <LogoMark className="ml-auto size-9" />
            <p className="mt-2 font-mono text-[9px] tracking-[0.16em] text-black/45 uppercase">
              Reforge
            </p>
            <p className="mt-1 font-mono text-[9px] text-black/40">
              {DATE.format(new Date(project.createdAt))}
            </p>
          </div>
        </header>

        {/* ---- Brief ---- */}
        <Section title="The brief" className="mb-8">
          <dl className="grid grid-cols-[110px_1fr] gap-x-5 gap-y-2 text-[12.5px]">
            <dt className="font-mono text-[10px] text-black/50">building</dt>
            <dd className="leading-relaxed">{project.description}</dd>
            <dt className="font-mono text-[10px] text-black/50">for</dt>
            <dd className="leading-relaxed">{project.targetCustomer}</dd>
            <dt className="font-mono text-[10px] text-black/50">analyzed</dt>
            <dd className="font-mono text-[11px]">{safeHostname(project.url)}</dd>
          </dl>
        </Section>

        {/* ---- Teardown ---- */}
        {analysis !== null ? (
          <Section title="Teardown of the original" className="mb-8" keepTogether={false}>
            <div className="space-y-4 text-[12.5px] leading-relaxed">
              <div>
                <p className="mb-1 font-semibold">What it does</p>
                <p className="text-black/75">{analysis.whatItDoes}</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="mb-1 font-semibold">Target users</p>
                  <p className="text-black/75">{analysis.targetUsers.join(" · ")}</p>
                </div>
                <div>
                  <p className="mb-1 font-semibold">Business model</p>
                  <p className="text-black/75">{analysis.businessModel}</p>
                </div>
              </div>

              <div>
                <p className="mb-1 font-semibold">Core problem</p>
                <p className="text-black/75">{analysis.coreProblem}</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="mb-1 font-semibold">Key features</p>
                  <ul className="space-y-0.5 text-black/75">
                    {analysis.keyFeatures.map((item, i) => (
                      <li key={i}>· {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-semibold">Suggested improvements</p>
                  <ul className="space-y-0.5 text-black/75">
                    {analysis.suggestedImprovements.map((item, i) => (
                      <li key={i}>· {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <p className="mb-1 font-semibold">Proposed MVP features</p>
                <ol className="space-y-0.5 text-black/75">
                  {analysis.mvpFeatures.map((item, i) => (
                    <li key={i}>
                      {i + 1}. {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Section>
        ) : null}

        {/* ---- Features ---- */}
        <Section title="Features" className="mb-8" keepTogether={false}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
            {concept.features.map((feature, i) => (
              <div key={i} className="break-inside-avoid">
                <p className="text-[12.5px] font-semibold">{feature.name}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-black/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Navigation ---- */}
        <Section title="Navigation" className="mb-8">
          <div className="flex flex-wrap gap-1.5">
            {concept.navigation.map((item, i) => (
              <span
                key={i}
                className="rounded-full border border-black/20 px-2.5 py-1 text-[11px]"
              >
                {item.label}
                <span className="ml-1.5 font-mono text-[10px] text-black/45">{item.path}</span>
              </span>
            ))}
          </div>
        </Section>

        {/* ---- Pages ---- */}
        <Section
            title={`Page structure · ${concept.pages.length} pages`}
            className="mb-8"
            keepTogether={false}
          >
          <div className="space-y-3">
            {concept.pages.map((page, i) => (
              <div key={i} className="break-inside-avoid border border-black/15">
                <div className="flex items-baseline gap-2 border-b border-black/15 bg-black/3 px-3 py-1.5">
                  <span className="text-[12px] font-semibold">{page.name}</span>
                  <span className="font-mono text-[10px] text-black/50">{page.path}</span>
                </div>
                <ul>
                  {page.sections.map((section, j) => (
                    <li
                      key={j}
                      className="flex gap-3 border-b border-black/10 px-3 py-2 last:border-b-0"
                    >
                      <span className="shrink-0 pt-px font-mono text-[9px] tracking-wide text-black/45 uppercase">
                        {section.type}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11.5px] font-medium">
                          {section.headline}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-black/65">
                          {section.body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- UI direction ---- */}
        <Section title="UI direction" className="mb-8">
          <dl className="mb-4 grid grid-cols-3 gap-5 text-[12px]">
            {(
              [
                ["Style", concept.uiDirection.style],
                ["Mood", concept.uiDirection.mood],
                ["Typography", concept.uiDirection.typography],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] text-black/50">{label}</dt>
                <dd className="mt-0.5 leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Every colour, however many there are. */}
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {concept.uiDirection.palette.map((colour, i) => {
              const valid = HEX.test(colour.hex.trim());
              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-7 rounded border border-black/25"
                    style={valid ? { backgroundColor: colour.hex.trim() } : undefined}
                  />
                  <span>
                    <span className="block text-[11px] font-medium">{colour.name}</span>
                    <span className="block font-mono text-[10px] text-black/50">
                      {colour.hex}
                      {colour.role !== "accent" ? ` · ${colour.role}` : ""}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ---- Refinements ---- */}
        {refinements.length > 0 ? (
          <Section title="How this concept was refined" className="mb-8">
            <ol className="space-y-1 text-[11.5px] text-black/70">
              {refinements.map((instruction, i) => (
                <li key={i}>
                  {i + 1}. &ldquo;{instruction}&rdquo;
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        <footer className="mt-10 flex items-center justify-between border-t border-black/15 pt-4 font-mono text-[9px] tracking-wide text-black/45">
          <span>Generated by Reforge · reforge-blond-two.vercel.app</span>
          <span translate="no">{concept.name}</span>
        </footer>
      </article>
    </div>
  );
}
