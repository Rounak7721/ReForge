import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { TeardownPanel } from "@/components/marketing/teardown-panel";
import { Wordmark } from "@/components/marketing/wordmark";
import { Button, ButtonIcon } from "@/components/ui/button";
import {
  ArrowUpRight,
  Check,
  Fault,
  Layers,
  Route,
  Scan,
  Spark,
  Vault,
} from "@/components/ui/icons";
import { Reveal, Spotlight } from "@/components/ui/motion";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s · Reforge" template — this
  // title already ends in the brand, and the template would double it.
  title: { absolute: "Reforge — take any product apart, build yours from the pieces" },
  description:
    "Paste a URL. Reforge reads the site, names what the product does and who it serves, then drafts a complete concept for the product you want to build instead.",
};

/**
 * The landing page.
 *
 * Layout archetype: editorial split hero over an asymmetrical bento. The three
 * equal feature columns that every generated SaaS page ships are deliberately
 * absent — capabilities live in a 6-cell bento of varying spans, and the steps
 * alternate sides rather than sitting in a row.
 */

/** Section marker. The slash echoes the nav paths the product generates. */
function Marker({ children }: { children: string }) {
  return <p className="eyebrow text-ember">/{children}</p>;
}

const STEPS = [
  {
    n: "01",
    title: "Point it at a product",
    body: "Give it a URL, a sentence about what you want to build, and who it is for. Reforge fetches the page itself — it does not guess from the address.",
    Icon: Scan,
  },
  {
    n: "02",
    title: "Read the teardown",
    body: "What the product does, who it serves, the problem it solves, how it makes money, and where it leaves room. Seven fields, no essays.",
    Icon: Layers,
  },
  {
    n: "03",
    title: "Build yours, then argue with it",
    body: "One click turns the analysis into your product: name, features, navigation, pages, UI direction. Then change it by saying what you want.",
    Icon: Spark,
  },
];

/** Bento cells. `span` drives the asymmetry — deliberately not uniform. */
const CAPABILITIES = [
  {
    title: "Structure, not paragraphs",
    body: "Navigation comes back as paths. Pages come back as sections. Colours come back as hex. You can act on it, not just read it.",
    Icon: Route,
    span: "md:col-span-3",
  },
  {
    title: "Edits that hold together",
    body: "Remove the pricing page and the nav entry goes with it. The whole concept is rewritten as one object, so it cannot contradict itself.",
    Icon: Spark,
    span: "md:col-span-3",
  },
  {
    title: "Nothing is regenerated",
    body: "Every result is saved. Reopening a project reads from Postgres and never calls the model again, so your work cannot drift.",
    Icon: Vault,
    span: "md:col-span-2",
  },
  {
    title: "Honest about limits",
    body: "Free-tier AI has a daily ceiling. When it is reached, Reforge says so plainly instead of showing a spinner that never resolves.",
    Icon: Fault,
    span: "md:col-span-2",
  },
  {
    title: "Your projects stay yours",
    body: "Row-level security in Postgres, enforced per query — not a filter in the app that someone could forget to write.",
    Icon: Layers,
    span: "md:col-span-2",
  },
];

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    line: "Enough to find out whether the idea holds up.",
    items: [
      "3 projects",
      "Unlimited refinements",
      "Saved and reopenable",
      "Full teardown and concept",
    ],
    featured: false,
  },
  {
    name: "Studio",
    price: "$19",
    cadence: "per month",
    line: "For people shipping more than one thing a quarter.",
    items: [
      "Unlimited projects",
      "Refinement history",
      "Export to Markdown",
      "Priority generation",
    ],
    featured: true,
  },
  {
    name: "Team",
    price: "$49",
    cadence: "per month",
    line: "Shared teardowns, so nobody re-researches the same product.",
    items: ["Everything in Studio", "5 seats", "Shared workspace", "SSO"],
    featured: false,
  },
];

/** Example inputs, not customers — the copy says so explicitly. */
const TARGETS = ["linear.app", "stripe.com", "notion.so", "figma.com", "vercel.com"];

export default function LandingPage() {
  return (
    <div className="min-h-svh">
      <MarketingHeader />

      <main id="main">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="gridlines absolute inset-0 -z-10" />

          <div className="mx-auto grid w-full max-w-6xl gap-14 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pt-24 lg:pb-28">
            <Reveal>
              <span className="border-hairline bg-shell/60 text-dim inline-flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-sm">
                <span aria-hidden className="bg-ember pulse-dot size-1.5 rounded-full" />
                <span className="eyebrow">Teardown → concept</span>
              </span>

              <h1 className="display mt-6 text-[2.6rem] font-semibold sm:text-[3.4rem] lg:text-[3.8rem]">
                <span className="block">Take any product apart.</span>
                <span className="block">
                  <span className="ember-text">Build yours</span> from the pieces.
                </span>
              </h1>

              <p className="text-dim measure mt-6 text-[17px] leading-relaxed text-pretty">
                Paste a URL. Reforge reads the site, names what the product does and who it
                serves, then drafts a complete concept for the thing you actually want to
                build — and rewrites it as you talk to it.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Paste a URL
                    <ButtonIcon>
                      <ArrowUpRight />
                    </ButtonIcon>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#how">See how it works</a>
                </Button>
              </div>

              <p className="text-faint mt-6 font-mono text-[11px] tracking-wide">
                No card. The free tier is genuinely free.
              </p>
            </Reveal>

            <Reveal delay={140} className="lg:pl-4">
              <TeardownPanel />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Target strip ---------------- */}
        <section className="border-hairline border-y">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <Reveal className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
              <p className="text-faint eyebrow shrink-0">Point it at</p>
              <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
                {TARGETS.map((target) => (
                  <li
                    key={target}
                    className="text-dim font-mono text-sm tracking-tight"
                    translate="no"
                  >
                    {target}
                  </li>
                ))}
              </ul>
              <p className="text-faint ml-auto shrink-0 text-xs">or anything else with a homepage</p>
            </Reveal>
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        {/* Alternating sides rather than three columns: this genuinely is a
            sequence, and a row of equal cards flattens the order out. */}
        <section id="how" className="scroll-mt-28">
          <div className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6 lg:py-32">
            <Reveal>
              <Marker>how</Marker>
              <h2 className="display mt-4 max-w-2xl text-3xl font-semibold sm:text-[2.75rem]">
                Three steps, in order.
              </h2>
            </Reveal>

            <div className="mt-16 space-y-4">
              {STEPS.map((step, index) => (
                <Reveal key={step.n} delay={index * 90}>
                  <div
                    className={`plate plate-interactive flex flex-col gap-5 p-7 sm:flex-row sm:items-start sm:gap-8 sm:p-9 ${
                      index % 2 === 1 ? "sm:ml-auto sm:w-[92%]" : "sm:w-[92%]"
                    }`}
                  >
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="border-hairline bg-shell text-ember flex size-12 items-center justify-center rounded-2xl border text-xl">
                        <step.Icon />
                      </span>
                      <span className="text-faint font-mono text-xs tracking-[0.2em]" data-numeric>
                        {step.n}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="display-sm text-xl font-semibold text-pretty">
                        {step.title}
                      </h3>
                      <p className="text-dim measure mt-2.5 text-[15px] leading-relaxed text-pretty">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Capabilities (bento) ---------------- */}
        <section id="capabilities" className="border-hairline scroll-mt-28 border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
            <Reveal>
              <Marker>capabilities</Marker>
              <h2 className="display mt-4 max-w-2xl text-3xl font-semibold sm:text-[2.75rem]">
                Built to be acted on, not admired.
              </h2>
            </Reveal>

            <div className="mt-16 grid gap-4 md:grid-cols-6">
              {CAPABILITIES.map((item, index) => (
                <Reveal key={item.title} delay={index * 70} className={item.span}>
                  <Spotlight className="plate plate-interactive h-full p-7">
                    <span className="border-hairline bg-shell text-ember mb-5 flex size-11 items-center justify-center rounded-xl border text-lg">
                      <item.Icon />
                    </span>
                    <h3 className="text-[15px] font-semibold tracking-tight text-pretty">
                      {item.title}
                    </h3>
                    <p className="text-dim mt-2 text-sm leading-relaxed text-pretty">
                      {item.body}
                    </p>
                  </Spotlight>
                </Reveal>
              ))}

              {/* Sixth cell is the model note, styled as a statement rather
                  than another card — it breaks the grid's rhythm on purpose. */}
              <Reveal delay={350} className="md:col-span-4">
                <Spotlight className="plate h-full overflow-hidden p-7 sm:p-9">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="display-sm text-xl font-semibold text-pretty">
                        Swap the model with an environment variable.
                      </h3>
                      <p className="text-dim measure mt-2 text-sm leading-relaxed text-pretty">
                        Every call goes through one provider layer. Changing vendor is
                        config, not a refactor.
                      </p>
                    </div>
                    <code className="border-hairline bg-shell text-faint shrink-0 rounded-xl border px-4 py-3 font-mono text-xs">
                      <span className="text-ember">LLM_PROVIDER</span>=gemini
                    </code>
                  </div>
                </Spotlight>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section id="pricing" className="border-hairline scroll-mt-28 border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
            <Reveal>
              <Marker>pricing</Marker>
              <h2 className="display mt-4 max-w-2xl text-3xl font-semibold sm:text-[2.75rem]">
                Start free. Pay when it earns it.
              </h2>
            </Reveal>

            <div className="mt-16 grid gap-5 lg:grid-cols-3">
              {TIERS.map((tier, index) => (
                <Reveal key={tier.name} delay={index * 80} className="h-full">
                  <div
                    className={`relative flex h-full flex-col p-7 sm:p-8 ${
                      tier.featured
                        ? "bezel ember-glow border-ember/30"
                        : "plate plate-interactive"
                    }`}
                  >
                    <div className={tier.featured ? "bezel-core flex h-full flex-col p-7" : "contents"}>
                      {/* Fixed-height header block keeps the price, the line and
                          the feature list on the same baseline across all three
                          columns regardless of copy length. */}
                      <div className="flex h-6 items-center justify-between">
                        <h3 className="eyebrow text-dim" translate="no">
                          {tier.name}
                        </h3>
                        {tier.featured ? (
                          <span className="bg-ember-soft text-ember rounded-md px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase">
                            Recommended
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-5 flex items-baseline gap-1.5">
                        <span className="display text-4xl font-semibold" data-numeric>
                          {tier.price}
                        </span>
                        <span className="text-faint text-xs">{tier.cadence}</span>
                      </p>

                      <p className="text-dim mt-3 h-10 text-sm leading-relaxed text-pretty">
                        {tier.line}
                      </p>

                      <ul className="mt-6 grow space-y-3">
                        {tier.items.map((item) => (
                          <li key={item} className="flex gap-2.5 text-sm">
                            <Check
                              className={`mt-0.5 size-4 shrink-0 ${
                                tier.featured ? "text-ember" : "text-faint"
                              }`}
                            />
                            <span className="text-pretty">{item}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Pinned to the bottom so all three CTAs form one line. */}
                      <Button
                        asChild
                        variant={tier.featured ? "default" : "outline"}
                        className="mt-8 w-full"
                      >
                        <Link href="/signup">Start free</Link>
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="border-hairline relative overflow-hidden border-t">
          <div aria-hidden className="gridlines absolute inset-0 -z-10 rotate-180" />
          <div className="mx-auto w-full max-w-3xl px-4 py-28 text-center sm:px-6 lg:py-36">
            <Reveal>
              <h2 className="display text-3xl font-semibold sm:text-[2.9rem]">
                There is a product you keep thinking about.
              </h2>
              <p className="text-dim mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-balance">
                Find out what it is actually made of, and what yours would have to be.
              </p>
              <div className="mt-9 flex justify-center">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Start free
                    <ButtonIcon>
                      <ArrowUpRight />
                    </ButtonIcon>
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-hairline border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-14 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="max-w-sm">
            <Wordmark />
            <p className="text-dim mt-4 text-sm leading-relaxed text-pretty">
              Turn a product you admire into a spec for the one you want to build.
            </p>
          </div>

          <nav aria-label="Footer" className="flex gap-14 text-sm">
            <div>
              <p className="eyebrow text-faint">Product</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href="#how" className="text-dim hover:text-ink transition-colors">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#capabilities" className="text-dim hover:text-ink transition-colors">
                    Capabilities
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-dim hover:text-ink transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="eyebrow text-faint">Account</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link href="/login" className="text-dim hover:text-ink transition-colors">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-dim hover:text-ink transition-colors">
                    Sign up
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-dim hover:text-ink transition-colors">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="border-hairline border-t">
          <div className="text-faint mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} Reforge</p>
            {/* Said plainly rather than buried: the pricing above is illustrative. */}
            <p className="text-pretty">
              A demo build. The plans above are illustrative — there is no billing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
