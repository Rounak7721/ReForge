/**
 * Neutralise navigation links in a generated page before it goes in the frame.
 *
 * The page is rendered with `<iframe srcdoc>`, and a srcdoc document inherits
 * the *parent's* URL as its base. So an `<a href="/collections">` in the
 * generated site does not 404 — it navigates the frame to the app's own
 * `/collections`, which redirects to the Reforge login. The demo appears to
 * log itself out inside its own preview.
 *
 * `sandbox` cannot prevent this: a frame is always allowed to navigate itself,
 * with or without `allow-top-navigation`. The only lever is the href.
 *
 * The generator is told to emit in-page `#fragment` links (see
 * `lib/prompts/coder.ts`), which are genuinely functional on a one-page site.
 * This is the guard behind that instruction, and it is what fixes pages that
 * were generated before the instruction existed — the seeded demo site among
 * them. Fragment links are left alone; everything else becomes inert.
 *
 * Applied on the way to the frame, so the DB keeps the model's real output and
 * the download matches what is on screen.
 */

// ponytail: `[^>]*` mis-slices a tag with a ">" inside an attribute value
// (`<a title="a > b">`). Rare in generated marketing copy, and the failure is a
// missed rewrite rather than mangled HTML. Parse with DOMParser if it bites.
const ANCHOR = /<a\b[^>]*>/gi;
// The unquoted alternative is not pedantry: `<a href=/collections>` is valid
// HTML5, models emit it when compressing output, and it navigates just as far.
const HREF = /\shref\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/i;

// Schemes that hand off to another app instead of navigating the frame. The
// sandbox blocks them in the preview anyway, and they are the one kind of link
// that still has to work in the downloaded standalone page.
const HANDOFF = /^(mailto:|tel:|sms:)/i;

export function inertLinks(html: string): string {
  return html.replace(ANCHOR, (tag) =>
    tag.replace(HREF, (attr) => {
      const raw = attr.slice(attr.indexOf("=") + 1).trim();
      const quoted = raw.startsWith('"') || raw.startsWith("'");
      const value = (quoted ? raw.slice(1, -1) : raw).trim();
      return value.startsWith("#") || HANDOFF.test(value) ? attr : ' href="#"';
    }),
  );
}
