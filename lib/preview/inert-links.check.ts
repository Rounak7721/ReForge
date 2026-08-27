/**
 * Self-check for `inertLinks`. `pnpm check`.
 *
 * This guards a bug that shipped: nav links in the generated site navigated the
 * srcdoc frame to the app's own routes and landed on the login page. The
 * regressions worth catching are both directions — leaving a path live, and
 * over-matching onto the Google Fonts <link> or a working in-page anchor.
 */
import assert from "node:assert/strict";

import { inertLinks, withSrcdocBase } from "./inert-links";

const out = inertLinks(`<!doctype html>
<html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
</head><body>
<nav>
  <a href="/">Home</a>
  <a href='/collections'>Collections</a>
  <a href="#features">Features</a>
  <a href=/journal>Unquoted</a>
  <a href="mailto:hello@roastery.test">Email us</a>
  <a class="cta" href="https://example.com/buy" target="_blank">Buy</a>
  <a>No href at all</a>
</nav>
</body></html>`);

assert.ok(!/href="\/"/.test(out), "a root path must not stay live — it navigates the frame to the app");
assert.ok(!/collections/.test(out), "a path in single quotes must be rewritten too");
assert.ok(!/example\.com/.test(out), "an absolute URL would load a third-party site inside the frame");
assert.ok(out.includes('href="#features"'), "in-page anchors are the whole point and must survive");
assert.ok(
  out.includes('href="https://fonts.googleapis.com/css2?family=Inter"'),
  "the Google Fonts <link> is not an <a> and must be untouched",
);
assert.ok(!/journal/.test(out), "an UNQUOTED href is valid HTML5 and navigates just as far");
assert.ok(
  out.includes('href="mailto:hello@roastery.test"'),
  "mailto hands off to another app and must still work in the download",
);
assert.ok(out.includes("<a>No href at all</a>"), "an anchor with no href is left alone");
assert.equal((out.match(/href="#"/g) ?? []).length, 4, "exactly the four off-page links are inert");
assert.ok(out.includes('class="cta"'), "other attributes on the anchor survive");

// `withSrcdocBase`. Measured on production: WITHOUT this tag a click on
// `href="#target"` inside the frame navigated to /login; WITH it the frame
// scrolled to 468 and kept its document. See docs/04-debugging-log.md entry 12.
const based = withSrcdocBase('<!doctype html><html><head><title>x</title></head><body></body></html>');
assert.ok(
  based.includes('<head><base href="about:srcdoc">'),
  "the base tag goes first in <head>, before anything that could resolve a URL",
);
assert.ok(based.includes("<title>x</title>"), "the rest of the head survives");

assert.ok(
  withSrcdocBase('<html><head base-like="no"><base href="/x"></head></html>').includes('href="/x"'),
  "an existing <base> is left alone rather than silently overridden",
);
assert.ok(
  withSrcdocBase("<p>no head at all</p>").startsWith('<base href="about:srcdoc">'),
  "a fragment with no <head> still gets a base rather than being dropped",
);
assert.ok(
  !inertLinks('<a href="#features">f</a>').includes('href="#"'),
  "inertLinks still leaves fragments for the base tag to make work",
);

console.log("inert-links: all checks passed");
