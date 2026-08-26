import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Reforge stores, why, and how to have it deleted.",
};

/**
 * Linking to a privacy page and then 404-ing is worse than not linking at all,
 * so this is a real page. It is deliberately short and specific rather than
 * boilerplate — everything below is a claim about what the code actually does.
 */

const SECTIONS = [
  {
    heading: "What this is",
    body: "Reforge is a portfolio demo, not a commercial service. There is no billing, no analytics, no advertising and no third-party tracking of any kind.",
  },
  {
    heading: "What is stored",
    body: "Your email address and a hashed password, held by Supabase Auth. For each project: the URL you submitted, the description and target customer you typed, the analysis and concept the model returned, and the text of every refinement instruction.",
  },
  {
    heading: "Who can read it",
    body: "Only you. Every table is protected by Postgres row-level security, enforced per query at the database rather than by a filter in application code.",
  },
  {
    heading: "What is sent to the AI provider",
    body: "The text of the page you asked Reforge to analyze, plus your description and target customer, are sent to Google’s Gemini API to produce the analysis. Your email address is never included in a model call.",
  },
  {
    heading: "Sites you analyze",
    body: "Reforge fetches the URL you submit from its own server and reads the page text. It only follows public HTTP(S) addresses, and requests to private network ranges are blocked.",
  },
  {
    heading: "Deletion",
    body: "Deleting a project removes its analysis, concept and refinement history. To have an account and everything in it removed, email the address on the GitHub repository.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-svh">
      <MarketingHeader />

      <main id="main" className="mx-auto w-full max-w-3xl px-4 pt-16 pb-24 sm:px-6 lg:pt-24">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/">
            <ArrowLeft />
            Back
          </Link>
        </Button>

        <h1 className="display mt-6 text-4xl font-semibold sm:text-5xl">Privacy</h1>
        <p className="text-dim mt-4 text-[17px] leading-relaxed text-pretty">
          The short version: your projects are yours, nothing is sold, and nothing is
          tracked.
        </p>

        <div className="mt-14 space-y-px overflow-hidden rounded-2xl">
          {SECTIONS.map((section) => (
            <section key={section.heading} className="bg-core/60 border-hairline border p-7">
              <h2 className="display-sm text-lg font-semibold">{section.heading}</h2>
              <p className="text-dim measure mt-2.5 text-[15px] leading-relaxed text-pretty">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <p className="text-faint mt-10 text-sm">
          Last updated 26 August 2026.
        </p>
      </main>
    </div>
  );
}
