/**
 * The hero mockup, and the brief's required "product demo".
 *
 * Not a stock illustration and not a screenshot — it is the product's real
 * output in the product's real shape: typed keys on the left, values on the
 * right, then the concept those values produce. That is the honest version of
 * a demo, and it doubles as an explanation of what you get.
 *
 * Content is a genuine (abridged) run: linear.app in, a solo issue tracker out.
 *
 * Built as a double-bezel — an outer glass tray holding an inner plate — so it
 * reads as a physical object sitting on the page rather than a div with a
 * border.
 */

import { ArrowUpRight, Spark } from "@/components/ui/icons";

const ANALYSIS: [string, string][] = [
  [
    "what_it_does",
    "Issue tracking and planning built around cycles, for teams shipping software weekly.",
  ],
  ["target_users", "Engineering teams · Product managers · Startup founders"],
  [
    "core_problem",
    "Context is scattered across a wiki, a tracker and chat, so nobody knows the current state.",
  ],
  ["business_model", "Per-seat SaaS, free up to 250 issues. Enterprise adds SSO and audit logs."],
];

const NAV = ["Today", "Backlog", "Archive", "Settings"];

const PALETTE: [string, string][] = [
  ["primary", "#E4562A"],
  ["surface", "#FBFAF8"],
  ["text", "#1A1815"],
];

function Row({ k, v, i }: { k: string; v: string; i: number }) {
  return (
    <div
      className="border-hairline rise grid grid-cols-1 gap-x-5 gap-y-1 border-t px-4 py-3 sm:grid-cols-[132px_1fr]"
      style={{ "--i": i } as React.CSSProperties}
    >
      <dt className="text-ember font-mono text-[11px] leading-5 tracking-tight">{k}</dt>
      <dd className="text-[13px] leading-5 text-pretty">{v}</dd>
    </div>
  );
}

export function TeardownPanel() {
  return (
    <div className="bezel shadow-(--shadow-lifted)">
      <div className="bezel-core overflow-hidden">
        {/* Window chrome / the input */}
        <div className="border-hairline bg-shell/70 flex items-center gap-2 border-b px-4 py-3">
          <span aria-hidden className="flex gap-1.5">
            <span className="bg-hairline-strong size-2 rounded-full" />
            <span className="bg-hairline-strong size-2 rounded-full" />
            <span className="bg-hairline-strong size-2 rounded-full" />
          </span>
          <span className="text-faint ml-1 truncate font-mono text-xs">https://linear.app</span>
          <span className="text-ember ml-auto flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase">
            <span aria-hidden className="bg-ember pulse-dot size-1.5 rounded-full" />
            read
          </span>
        </div>

        {/* Analysis */}
        <div>
          <p className="eyebrow text-faint px-4 pt-4 pb-1">Analysis</p>
          <dl>
            {ANALYSIS.map(([k, v], i) => (
              <Row key={k} k={k} v={v} i={i} />
            ))}
          </dl>
        </div>

        {/* Concept */}
        <div
          className="border-hairline bg-shell/60 rise border-t"
          style={{ "--i": 5 } as React.CSSProperties}
        >
          <p className="eyebrow text-faint flex items-center gap-1.5 px-4 pt-4 pb-2">
            <Spark className="text-ember size-3" />
            Your product
          </p>

          <div className="px-4 pb-4">
            <p className="display-sm text-xl font-semibold">Solo</p>
            <p className="text-dim mt-1 text-[13px] leading-5 text-pretty">
              Issue tracking for one person. No sprints, no standups, no assignees.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {NAV.map((item) => (
                <span
                  key={item}
                  className="border-hairline bg-core rounded-full border px-2.5 py-1 text-[11px] font-medium"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              {PALETTE.map(([name, hex]) => (
                <div key={name} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="border-hairline-strong size-6 rounded-lg border shadow-(--inner-highlight)"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-faint font-mono text-[11px]">{hex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Refinement — shows the third capability without a second panel */}
        <div
          className="border-hairline rise flex items-center gap-2.5 border-t px-4 py-3"
          style={{ "--i": 6 } as React.CSSProperties}
        >
          <ArrowUpRight aria-hidden className="text-ember size-3.5 rotate-45" />
          <span className="text-dim truncate text-[13px]">
            &ldquo;Remove the pricing page.&rdquo;
          </span>
          <span className="border-hairline text-faint ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase">
            updated
          </span>
        </div>
      </div>
    </div>
  );
}
