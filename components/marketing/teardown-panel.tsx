/**
 * The signature element, and the required "product demo / mockup".
 *
 * It is not a stock illustration or a screenshot — it is the product's real
 * output, in the product's real shape: typed keys on the left, values on the
 * right, then the concept it produces. That is the honest version of a demo,
 * and it doubles as an explanation of what you get.
 *
 * Content is a genuine (abridged) run: linear.app in, a solo issue tracker out.
 */

const ANALYSIS: [string, string][] = [
  ["what_it_does", "Issue tracking and planning built around cycles, for teams shipping software weekly."],
  ["target_users", "Engineering teams · Product managers · Startup founders"],
  ["core_problem", "Context is scattered across a wiki, a tracker and chat, so nobody knows the current state."],
  ["business_model", "Per-seat SaaS, free tier up to 250 issues, Enterprise adds SSO and audit logs."],
];

const NAV = ["Today", "Backlog", "Archive", "Settings"];

const PALETTE: [string, string][] = [
  ["primary", "#1F4BE0"],
  ["surface", "#FBFBF9"],
  ["text", "#14181D"],
];

function Row({ k, v, i }: { k: string; v: string; i: number }) {
  return (
    <div
      data-rise
      style={{ "--i": i } as React.CSSProperties}
      className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-t border-[var(--rule)] px-4 py-3 sm:grid-cols-[128px_1fr]"
    >
      <dt className="font-mono text-[11px] leading-5 tracking-tight text-[var(--signal)]">
        {k}
      </dt>
      <dd className="text-[13px] leading-5 text-pretty text-[var(--ink)]">{v}</dd>
    </div>
  );
}

export function TeardownPanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper)] shadow-[0_1px_2px_rgba(20,24,29,0.04),0_12px_32px_-12px_rgba(20,24,29,0.12)]">
      {/* Input */}
      <div className="flex items-center gap-2 border-b border-[var(--rule)] bg-[var(--wash)] px-4 py-3">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2 rounded-full bg-[var(--rule)]" />
          <span className="size-2 rounded-full bg-[var(--rule)]" />
          <span className="size-2 rounded-full bg-[var(--rule)]" />
        </span>
        <span className="ml-1 truncate font-mono text-xs text-[var(--dim)]">
          https://linear.app
        </span>
      </div>

      {/* Analysis */}
      <div>
        <p className="px-4 pt-4 pb-1 font-mono text-[10px] tracking-[0.18em] text-[var(--dim)] uppercase">
          Analysis
        </p>
        <dl>
          {ANALYSIS.map(([k, v], i) => (
            <Row key={k} k={k} v={v} i={i} />
          ))}
        </dl>
      </div>

      {/* Concept */}
      <div className="border-t border-[var(--rule)] bg-[var(--wash)]">
        <p className="px-4 pt-4 pb-2 font-mono text-[10px] tracking-[0.18em] text-[var(--dim)] uppercase">
          Your product
        </p>

        <div
          data-rise
          style={{ "--i": 5 } as React.CSSProperties}
          className="px-4 pb-4"
        >
          <p className="font-display text-lg font-semibold tracking-[-0.02em]">Solo</p>
          <p className="mt-0.5 text-[13px] leading-5 text-[var(--dim)] text-pretty">
            Issue tracking for one person. No sprints, no standups, no assignees.
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {NAV.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--rule)] bg-[var(--paper)] px-2.5 py-1 text-[11px] font-medium"
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
                  className="size-6 rounded-md border border-[var(--rule)]"
                  style={{ backgroundColor: hex }}
                />
                <span className="font-mono text-[11px] text-[var(--dim)]">{hex}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Refinement — shows the third capability without a second panel */}
      <div
        data-rise
        style={{ "--i": 6 } as React.CSSProperties}
        className="flex items-center gap-2 border-t border-[var(--rule)] px-4 py-3"
      >
        <span aria-hidden className="font-mono text-xs text-[var(--signal)]">
          ↳
        </span>
        <span className="truncate text-[13px] text-[var(--dim)]">
          &ldquo;Remove the pricing page.&rdquo;
        </span>
        <span className="ml-auto shrink-0 font-mono text-[10px] tracking-wide text-[var(--dim)] uppercase">
          updated
        </span>
      </div>
    </div>
  );
}
