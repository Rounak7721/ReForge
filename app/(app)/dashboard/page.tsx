import type { Metadata } from "next";
import Link from "next/link";

import { Button, ButtonIcon } from "@/components/ui/button";
import { ArrowUpRight, Plus, Scan, Spark } from "@/components/ui/icons";
import { Reveal, Spotlight } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/server";
import { safeHostname } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const supabase = await createClient();

  // RLS scopes this to the current user; no user_id filter is needed and
  // adding one would imply the policy is optional.
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, url, description, target_customer, concept, created_at")
    .order("created_at", { ascending: false });

  if (error !== null) {
    console.error("[dashboard] failed to list projects", {
      code: error.code,
      message: error.message,
    });
  }

  const rows = projects ?? [];
  const built = rows.filter((row) => row.concept !== null).length;

  return (
    <div className="space-y-10">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-ember">/projects</p>
          <h1 className="display mt-3 text-4xl font-semibold sm:text-5xl">Your projects</h1>
          <p className="text-dim mt-3 text-[15px] text-pretty">
            Each project starts with a website you want to learn from.
          </p>
        </div>

        {rows.length > 0 ? (
          <div className="flex items-center gap-5">
            <dl className="hidden gap-5 sm:flex">
              <div>
                <dt className="eyebrow text-faint">Projects</dt>
                <dd className="display-sm mt-1.5 text-2xl font-semibold" data-numeric>
                  {rows.length}
                </dd>
              </div>
              <div className="border-hairline border-l pl-5">
                <dt className="eyebrow text-faint">Built</dt>
                <dd className="display-sm text-ember mt-1.5 text-2xl font-semibold" data-numeric>
                  {built}
                </dd>
              </div>
            </dl>
            <Button asChild>
              <Link href="/dashboard/new">
                New project
                <ButtonIcon>
                  <Plus />
                </ButtonIcon>
              </Link>
            </Button>
          </div>
        ) : null}
      </Reveal>

      {error !== null ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/10 text-destructive rounded-2xl border px-5 py-4 text-sm"
        >
          <p className="font-medium">Couldn’t load your projects</p>
          <p className="mt-1 opacity-90">Refresh the page to try again.</p>
        </div>
      ) : rows.length === 0 ? (
        /* Composed empty state — a first run should explain the product, not
           show an empty box with a button in it. */
        <Reveal>
          <div className="bezel relative overflow-hidden">
            <div aria-hidden className="gridlines absolute inset-0" />
            <div className="bezel-core relative px-6 py-16 text-center sm:px-12 sm:py-20">
              <span className="border-hairline bg-shell text-ember mx-auto flex size-14 items-center justify-center rounded-2xl border text-2xl">
                <Scan />
              </span>

              <h2 className="display-sm mx-auto mt-6 max-w-md text-2xl font-semibold text-pretty">
                Point Reforge at a product you admire.
              </h2>
              <p className="text-dim mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-pretty">
                Paste its website, say what you want to build instead and who it is for.
                You get a teardown of the original and a complete concept for yours.
              </p>

              <ol className="text-dim mx-auto mt-9 grid max-w-lg gap-3 text-left sm:grid-cols-3">
                {[
                  { n: "01", label: "Paste a URL" },
                  { n: "02", label: "Read the teardown" },
                  { n: "03", label: "Build your concept" },
                ].map((step) => (
                  <li
                    key={step.n}
                    className="border-hairline bg-shell/60 rounded-xl border px-3.5 py-3"
                  >
                    <span className="text-ember font-mono text-[10px] tracking-[0.2em]" data-numeric>
                      {step.n}
                    </span>
                    <p className="mt-1.5 text-[13px] font-medium">{step.label}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-10 flex justify-center">
                <Button asChild size="lg">
                  <Link href="/dashboard/new">
                    Start your first project
                    <ButtonIcon>
                      <ArrowUpRight />
                    </ButtonIcon>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((project, index) => (
            <Reveal as="li" key={project.id} delay={Math.min(index, 8) * 55} className="h-full">
              <Spotlight className="plate plate-interactive h-full">
                <Link
                  href={`/dashboard/${project.id}`}
                  className="flex h-full flex-col gap-4 rounded-[inherit] p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="border-hairline bg-shell text-faint truncate rounded-full border px-2.5 py-1 font-mono text-[11px]">
                      {safeHostname(project.url)}
                    </span>
                    {project.concept !== null ? (
                      <span className="bg-ember-soft text-ember flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] tracking-wide uppercase">
                        <Spark className="size-3" />
                        Built
                      </span>
                    ) : (
                      <span className="border-hairline text-faint shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] tracking-wide uppercase">
                        Analyzed
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-3 text-[15px] leading-relaxed font-medium text-pretty">
                    {project.description}
                  </p>

                  <p className="text-dim line-clamp-2 text-[13px] text-pretty">
                    <span className="text-faint">For</span> {project.target_customer}
                  </p>

                  <div className="border-hairline mt-auto flex items-center justify-between border-t pt-4">
                    <time
                      className="text-faint text-xs"
                      dateTime={new Date(project.created_at).toISOString()}
                    >
                      {DATE_FORMAT.format(new Date(project.created_at))}
                    </time>
                    <ArrowUpRight className="text-faint size-4" />
                  </div>
                </Link>
              </Spotlight>
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
