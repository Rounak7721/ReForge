"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Wordmark } from "@/components/marketing/wordmark";
import { ArrowUpRight } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button, ButtonIcon } from "@/components/ui/button";

/**
 * The floating island nav.
 *
 * Detached from the top edge rather than glued to it, so the page visibly
 * scrolls *underneath* the glass instead of butting against a full-width bar.
 *
 * The condensed-on-scroll state is driven by an IntersectionObserver watching a
 * sentinel at the top of the document — not a scroll listener, which would fire
 * every frame and force a reflow each time.
 */

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function SiteNav({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Condense once the hero's first 80px have gone by.
  useEffect(() => {
    const node = sentinel.current;
    if (node === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry !== undefined) setCondensed(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Escape closes; the body locks while the overlay is up so the page behind
  // does not scroll under the user's thumb.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div ref={sentinel} aria-hidden className="absolute top-20 h-px w-full" />

      <header
        className={`pointer-events-none sticky top-0 pt-[env(safe-area-inset-top)] ${open ? "z-nav-open" : "z-nav"}`}
      >
        <div className="mx-auto flex w-full max-w-6xl justify-center px-4 pt-4 sm:pt-6">
          <nav
            aria-label="Main"
            className={`border-hairline bg-shell/70 pointer-events-auto flex w-full items-center gap-2 rounded-full border p-2 backdrop-blur-xl transition-[max-width,box-shadow,background-color] duration-700 ease-expo motion-reduce:transition-none ${
              condensed
                ? "max-w-3xl shadow-(--shadow-lifted)"
                : "max-w-6xl shadow-(--shadow-ambient)"
            }`}
          >
            <Link
              href="/"
              aria-label="Reforge home"
              className="rounded-full pr-2 pl-1.5 transition-opacity hover:opacity-80"
            >
              <Wordmark />
            </Link>

            <div className="hidden items-center gap-0.5 md:flex">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-dim hover:text-ink hover:bg-secondary rounded-full px-3.5 py-2 text-sm transition-colors duration-300"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle className="hidden sm:inline-flex" />

              {authed ? (
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link href="/dashboard">
                    Dashboard
                    <ButtonIcon>
                      <ArrowUpRight />
                    </ButtonIcon>
                  </Link>
                </Button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-dim hover:text-ink hidden rounded-full px-3 py-2 text-sm transition-colors duration-300 sm:inline-block"
                  >
                    Log in
                  </Link>
                  <Button asChild size="sm" className="hidden sm:inline-flex">
                    <Link href="/signup">
                      Start free
                      <ButtonIcon>
                        <ArrowUpRight />
                      </ButtonIcon>
                    </Link>
                  </Button>
                </>
              )}

              {/* Hamburger. Two bars that rotate into an X rather than swapping
                  for a close icon — the morph is the affordance. */}
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={open ? "Close menu" : "Open menu"}
                className="border-hairline bg-core/60 relative flex size-9 items-center justify-center rounded-full border transition-colors duration-300 md:hidden"
              >
                <span
                  aria-hidden
                  className={`bg-ink absolute h-[1.5px] w-4 rounded-full transition-transform duration-500 ease-spring motion-reduce:transition-none ${
                    open ? "rotate-45" : "-translate-y-0.75"
                  }`}
                />
                <span
                  aria-hidden
                  className={`bg-ink absolute h-[1.5px] w-4 rounded-full transition-transform duration-500 ease-spring motion-reduce:transition-none ${
                    open ? "-rotate-45" : "translate-y-0.75"
                  }`}
                />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Full-screen glass overlay. Rendered always so the exit transition can
          play; `invisible` keeps it out of the a11y tree and off the tab order
          when closed. */}
      <div
        id={panelId}
        className={`z-overlay bg-background/85 fixed inset-0 backdrop-blur-2xl transition-opacity duration-500 ease-expo md:hidden motion-reduce:transition-none ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="flex h-full flex-col px-6 pt-[calc(6rem+env(safe-area-inset-top))] pb-10">
          <ul className="space-y-2">
            {LINKS.map((link, index) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`display-sm block py-3 text-3xl font-semibold transition-[opacity,transform] duration-500 ease-expo motion-reduce:transition-none ${
                    open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${120 + index * 60}ms` : "0ms" }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div
            className={`mt-auto space-y-3 transition-[opacity,transform] duration-500 ease-expo motion-reduce:transition-none ${
              open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
            style={{ transitionDelay: open ? "320ms" : "0ms" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-dim text-sm">Theme</span>
              <ThemeToggle />
            </div>

            {authed ? (
              <Button asChild size="lg" className="w-full">
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  Open dashboard
                  <ButtonIcon>
                    <ArrowUpRight />
                  </ButtonIcon>
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="w-full">
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Start free
                    <ButtonIcon>
                      <ArrowUpRight />
                    </ButtonIcon>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
