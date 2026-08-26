import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { TeardownPanel } from "@/components/marketing/teardown-panel";
import { Wordmark } from "@/components/marketing/wordmark";

export const metadata: Metadata = {
  title: "Reforge — take any product apart, build yours from the pieces",
  description:
    "Paste a URL. Reforge reads the site, names what the product does and who it serves, then drafts a complete concept for the product you want to build instead.",
};

/**
 * The landing page.
 *
 * Direction: a spec sheet. The product emits typed, labelled, structured data,
 * so the page is built the same way — mono keys, visible rules, one accent
 * (`--signal`), and section markers written as paths (`/how`, `/pricing`)
 * because paths are literally part of what Reforge outputs.
 */

/** Section marker. The slash echoes the nav paths the product generates. */
function Marker({ children }: { children: string }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.18em] text-[var(--signal)] uppercase">
      /{children}
    </p>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Point it at a product",
    body: "Give it a URL, a sentence about what you want to build, and who it's for. Reforge fetches the page itself — it doesn't guess from the address.",
  },
  {
    n: "02",
    title: "Read the teardown",
    body: "What the product does, who it serves, the problem it solves, how it makes money, and where it leaves room. Seven fields, no essays.",
  },
  {
    n: "03",
    title: "Build yours, then argue with it",
    body: "One click turns the analysis into your product: name, features, navigation, pages, UI direction. Then change it by saying what you want.",
  },
];

const FEATURES = [
  {
    title: "Structure, not paragraphs",
    body: "Navigation comes back as paths. Pages come back as sections. Colours come back as hex. You can act on it, not just read it.",
  },
  {
    title: "Edits that hold together",
    body: "Remove the pricing page and the nav entry goes with it. The whole concept is rewritten as one object, so it can't contradict itself.",
  },
  {
    title: "Nothing is regenerated",
    body: "Every result is saved. Reopening a project reads from the database and never calls the model again — so your work can't drift.",
  },
  {
    title: "Honest about limits",
    body: "Free-tier AI has a daily ceiling. When it's reached, Reforge says so plainly instead of showing a spinner that never resolves.",
  },
  {
    title: "Your projects stay yours",
    body: "Row-level security in Postgres, enforced per query. Not a filter in the app that someone could forget to write.",
  },
  {
    title: "Swappable model",
    body: "Every call goes through one provider layer. Changing model or vendor is an environment variable, not a refactor.",
  },
];

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    line: "Enough to find out whether the idea holds up.",
    items: ["3 projects", "Unlimited refinements", "Saved and reopenable", "Full teardown and concept"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Studio",
    price: "$19",
    cadence: "per month",
    line: "For people shipping more than one thing a quarter.",
    items: ["Unlimited projects", "Refinement history", "Export to Markdown", "Priority generation"],
    cta: "Start free",
    featured: true,
  },
  {
    name: "Team",
    price: "$49",
    cadence: "per month",
    line: "Shared teardowns, so nobody re-researches the same product.",
    items: ["Everything in Studio", "5 seats", "Shared workspace", "SSO"],
    cta: "Start free",
    featured: false,
  },
];

export default function LandingPage() {
  return (
    <div className="marketing min-h-svh">
      <MarketingHeader />

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="border-b border-[var(--rule)]">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[1.08fr_1fr] lg:items-center lg:gap-16 lg:py-20">
            <div>
              <Marker>teardown</Marker>

              {/* Each sentence balances its own lines. One `text-balance` across
                  both leaves "pieces." orphaned on a line of its own. */}
              <h1 className="font-display mt-5 text-[2.4rem] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[3.1rem] lg:text-[3.4rem]">
                <span className="block text-balance">Take any product apart.</span>
                <span className="block text-balance">
                  <span className="text-[var(--signal)]">Build yours</span> from the
                  pieces.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--dim)] text-pretty">
                Paste a URL. Reforge reads the site, names what the product does
                and who it serves, then drafts a complete concept for the thing
                you actually want to build — and rewrites it as you talk to it.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="rounded-lg bg-[var(--ink)] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Paste a URL
                </Link>
                <a
                  href="#how"
                  className="rounded-lg border border-[var(--rule)] px-5 py-3 text-sm font-medium transition-colors hover:bg-[var(--wash)]"
                >
                  See how it works
                </a>
              </div>

              <p className="mt-5 font-mono text-[11px] tracking-wide text-[var(--dim)]">
                No card. Free tier is genuinely free.
              </p>
            </div>

            <div className="lg:pl-4">
              <TeardownPanel />
            </div>
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        {/* Numbered because this genuinely is a sequence — you cannot build
            before you analyze, or refine before you build. */}
        <section id="how" className="scroll-mt-16 border-b border-[var(--rule)]">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
            <Marker>how</Marker>
            <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
              Three steps, in order.
            </h2>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step) => (
                <li key={step.n} className="border-t-2 border-[var(--ink)] pt-4">
                  <span className="font-mono text-xs tracking-widest text-[var(--dim)]">
                    {step.n}
                  </span>
                  <h3 className="mt-3 text-[17px] font-semibold tracking-tight text-pretty">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--dim)] text-pretty">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        {/* Deliberately unnumbered: these are simultaneous properties, not a
            sequence, and numbering them would imply an order that isn't real. */}
        <section className="border-b border-[var(--rule)] bg-[var(--wash)]">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
            <Marker>features</Marker>
            <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
              Built to be acted on, not admired.
            </h2>

            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="bg-[var(--paper)] p-6">
                  <h3 className="text-[15px] font-semibold tracking-tight text-pretty">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--dim)] text-pretty">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section id="pricing" className="scroll-mt-16 border-b border-[var(--rule)]">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
            <Marker>pricing</Marker>
            <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
              Start free. Pay when it earns it.
            </h2>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`flex flex-col rounded-xl border p-6 ${
                    tier.featured
                      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                      : "border-[var(--rule)] bg-[var(--paper)]"
                  }`}
                >
                  <div className="flex h-6 items-center justify-between">
                    <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase">
                      {tier.name}
                    </h3>
                    {tier.featured ? (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase">
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-semibold tracking-[-0.03em]">
                      {tier.price}
                    </span>
                    <span
                      className={`text-xs ${tier.featured ? "text-white/60" : "text-[var(--dim)]"}`}
                    >
                      {tier.cadence}
                    </span>
                  </p>

                  <p
                    className={`mt-3 text-sm leading-relaxed text-pretty ${
                      tier.featured ? "text-white/70" : "text-[var(--dim)]"
                    }`}
                  >
                    {tier.line}
                  </p>

                  <ul className="mt-6 grow space-y-2.5">
                    {tier.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm">
                        <span
                          aria-hidden
                          className={`mt-[7px] size-1.5 shrink-0 rounded-full ${
                            tier.featured ? "bg-white/40" : "bg-[var(--signal)]"
                          }`}
                        />
                        <span className={tier.featured ? "text-white/90" : ""}>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                      tier.featured
                        ? "bg-white text-[var(--ink)]"
                        : "bg-[var(--ink)] text-white"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="border-b border-[var(--rule)]">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center lg:py-28">
            <h2 className="font-display mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-[2.75rem] sm:leading-[1.05]">
              There is a product you keep thinking about.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-balance text-[var(--dim)]">
              Find out what it&apos;s actually made of, and what yours would have to be.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-lg bg-[var(--ink)] px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Start free
            </Link>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Wordmark />
            <p className="mt-3 text-sm leading-relaxed text-[var(--dim)] text-pretty">
              Turn a product you admire into a spec for the one you want to
              build.
            </p>
          </div>

          <nav className="flex gap-12 text-sm">
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--dim)] uppercase">
                Product
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a href="#how" className="text-[var(--dim)] hover:text-[var(--ink)]">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-[var(--dim)] hover:text-[var(--ink)]">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--dim)] uppercase">
                Account
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/login" className="text-[var(--dim)] hover:text-[var(--ink)]">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-[var(--dim)] hover:text-[var(--ink)]">
                    Sign up
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="border-t border-[var(--rule)]">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-[var(--dim)] sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Reforge</p>
            {/* Said plainly rather than hidden: the pricing above is illustrative. */}
            <p className="text-pretty">
              A demo build. The plans above are illustrative — there is no billing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
