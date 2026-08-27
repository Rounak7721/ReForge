"use client";

import { withSrcdocBase } from "@/lib/preview/inert-links";

/**
 * Renders an HTML document string in an isolated frame.
 *
 * Shared by both preview sources: the deterministic template render of the
 * concept (free, always available) and, from phase 2, model-generated code.
 * The frame does not know or care which it was handed — that is the point of
 * making "one HTML string" the substrate.
 *
 * ## The sandbox is the whole security story, so it is worth being precise
 *
 * `sandbox="allow-scripts"` **without** `allow-same-origin` is the load-bearing
 * pair. Together they give the document a unique opaque origin, so scripts
 * inside it cannot reach `parent.document`, `document.cookie`, `localStorage`,
 * or the Supabase session — the frame is a different origin from the app and
 * the same-origin policy does the rest.
 *
 * Adding `allow-same-origin` alongside `allow-scripts` would undo both flags:
 * the frame would run script *as the app's own origin* and could read the
 * session directly. If you are ever tempted to add it to fix a height or
 * styling problem, don't — the height is solved below without it.
 *
 * `allow-scripts` is granted because generated pages legitimately contain
 * interactive JS, and the template render is inert either way.
 *
 * ## Why the document gets a `<base>` tag on the way in
 *
 * A srcdoc document inherits the PARENT's base URL, so even an in-page
 * `href="#features"` resolves to a URL on the app's own origin and navigates
 * the frame there — in this app, straight to `/login`. `withSrcdocBase` points
 * the base at `about:srcdoc` so fragments resolve to the document itself and
 * scroll. Frame-only: the download must not carry it.
 */
export function PreviewFrame({ html, title }: { html: string; title: string }) {
  return (
    <div className="border-hairline bg-core relative overflow-hidden rounded-2xl border shadow-(--inner-highlight)">
      {/* A browser chrome strip. Cosmetic, but it frames the content as "a
          website we are proposing" rather than "part of this app", which is
          exactly the distinction the preview needs to make. */}
      <div className="border-hairline bg-shell/70 flex items-center gap-2 border-b px-4 py-2.5 backdrop-blur-xl">
        <span aria-hidden className="flex gap-1.5">
          <span className="bg-faint/40 size-2.5 rounded-full" />
          <span className="bg-faint/40 size-2.5 rounded-full" />
          <span className="bg-faint/40 size-2.5 rounded-full" />
        </span>
        <span className="text-faint mx-auto truncate font-mono text-[11px]">{title}</span>
      </div>

      <iframe
        // Keyed on the document itself so a refinement swaps the frame outright
        // instead of mutating srcdoc in place — some browsers keep the old
        // scroll position and stale styles when srcdoc changes on a live frame.
        // Keying on `html.length` instead would collide on any edit that
        // happens to preserve the document's length, which is exactly the
        // in-place mutation this is here to prevent.
        key={html}
        title={title}
        srcDoc={withSrcdocBase(html)}
        sandbox="allow-scripts"
        // Referrer and any credentialed subresource request are pointless for a
        // srcdoc document and are worth denying explicitly.
        referrerPolicy="no-referrer"
        // Fixed viewport with the document scrolling inside it. The alternative
        // — auto-sizing to content — needs the frame to post its height out,
        // which needs same-origin access. Not worth trading the sandbox for.
        className="block h-[72vh] max-h-[820px] min-h-[480px] w-full border-0 bg-white"
      />
    </div>
  );
}
