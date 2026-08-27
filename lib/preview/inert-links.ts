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
 * `inertLinks` handles the off-page hrefs: anything that is not a `#fragment`
 * becomes inert, which stops a stray `/collections` from escaping no matter
 * what the generator emits. The generator is also told to emit fragments (see
 * `lib/prompts/coder.ts`), but a prompt constrains the next generation and does
 * nothing for the pages already in Postgres — the seeded demo site among them.
 *
 * ## Fragments navigate too, which is the non-obvious half
 *
 * `#features` is NOT safe by default here. A srcdoc document's own URL is
 * `about:srcdoc`, but its *base* URL is the parent's, so `#features` resolves
 * to `https://reforge…/dashboard/…#features` — a different document — and the
 * browser performs a real navigation instead of scrolling. Measured on
 * production: the frame landed on `/login`, exactly like a path link.
 *
 * `withSrcdocBase` fixes that with one tag. Pointing `<base>` at `about:srcdoc`
 * makes a fragment resolve to `about:srcdoc#features` — the same document — so
 * the browser scrolls. Measured against the same page: `scrollY` 468, document
 * intact. A click-interceptor script does the same job and was tested
 * alongside; the tag wins because it needs no `allow-scripts` and no script.
 *
 * The base tag is frame-only. In a downloaded standalone file the document has
 * a real `file:` URL, where fragments already work and `about:srcdoc` would
 * break them — so the download gets `inertLinks` and not this.
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

/**
 * Point the document's base URL at itself, so in-page fragment links scroll
 * rather than navigating the frame to the host app. Frame-only — see above.
 */
export function withSrcdocBase(html: string): string {
  // Already has one: the generator was told not to emit `<base>`, but if a page
  // ever does, overriding it silently would be worse than leaving it.
  if (/<base\b/i.test(html)) return html;
  const head = html.match(/<head\b[^>]*>/i);
  const tag = '<base href="about:srcdoc">';
  if (head?.index === undefined) return tag + html;
  return html.slice(0, head.index + head[0].length) + tag + html.slice(head.index + head[0].length);
}
