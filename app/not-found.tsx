import Link from "next/link";

import { Wordmark } from "@/components/marketing/wordmark";
import { Button, ButtonIcon } from "@/components/ui/button";
import { ArrowUpRight } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-8 px-6 text-center">
      <div aria-hidden className="gridlines absolute inset-0" />

      <div className="relative flex flex-col items-center gap-8">
        <Link href="/" aria-label="Reforge home" className="rounded-full">
          <Wordmark size="lg" />
        </Link>

        <div>
          <p className="display text-ember/30 text-7xl font-semibold sm:text-8xl" data-numeric>
            404
          </p>
          <h1 className="display mt-4 text-3xl font-semibold sm:text-4xl">
            That page doesn’t exist.
          </h1>
          <p className="text-dim mt-3 text-[15px] text-pretty">
            It may have been removed, or the link may be wrong.
          </p>
        </div>

        {/* Two ways back, because a signed-out visitor landing here has no
            dashboard to go to. */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/dashboard">
              Your projects
              <ButtonIcon>
                <ArrowUpRight />
              </ButtonIcon>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
