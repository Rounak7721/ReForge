import "server-only";

import dns from "node:dns/promises";

import { parse } from "node-html-parser";

/**
 * Fetch a target website server-side and reduce it to prompt-sized text.
 *
 * The model cannot browse. Every analysis therefore starts here: fetch, strip,
 * truncate, and only then prompt.
 */

const FETCH_TIMEOUT_MS = 8_000;
/** Stop reading the body past this — some marketing pages ship megabytes of inlined SVG. */
const MAX_BYTES = 1_500_000;
/** Roughly 3k tokens of site text, which leaves the model room to think and answer. */
const MAX_TEXT_CHARS = 12_000;
/** Below this much body text the page is a JS shell and meta tags are all we have. */
const THIN_TEXT_CHARS = 200;
const MAX_REDIRECTS = 5;

const USER_AGENT =
  "Mozilla/5.0 (compatible; ReforgeBot/1.0; +https://reforge-blond-two.vercel.app)";

export type SiteContent = {
  finalUrl: string;
  title: string;
  description: string;
  text: string;
  /**
   * True when the page yielded almost no readable text — a client-rendered
   * shell. The analysis still runs off the metadata, but the UI says so rather
   * than presenting a thin guess as a confident answer.
   */
  thin: boolean;
};

export class SiteFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SiteFetchError";
  }
}

/* -------------------------------------------------------------------------- */
/* SSRF guard                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * This route fetches an untrusted, user-supplied URL from inside our
 * infrastructure, which is textbook SSRF. Cloud metadata endpoints
 * (169.254.169.254 on AWS/GCP) are the reason this is not optional.
 *
 * Two things make the naive version of this check useless, and both are handled
 * below:
 *
 * 1. **Redirects.** Validating only the URL the user typed is pointless when
 *    `fetch` will happily follow a 302 to anywhere. Redirects are therefore
 *    followed manually, one hop at a time, and every hop is re-validated.
 * 2. **Address encodings.** `http://2130706433/`, `http://127.1/` and
 *    `http://0x7f000001/` are all 127.0.0.1, and none of them match a
 *    dotted-quad pattern. Rather than trying to enumerate the encodings, the
 *    hostname is resolved and the resulting *addresses* are checked — the
 *    resolver canonicalises all of these for us.
 *
 * Residual limitation, accepted knowingly: this is resolve-then-fetch, not
 * resolve-then-pin. A hostname whose DNS answer changes between our lookup and
 * `fetch`'s own (DNS rebinding) is not caught. Closing that requires connecting
 * to a pinned IP with a `Host` header override, which `fetch` does not expose.
 */
const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

function isPrivateIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  const a = octets[0] ?? 0;
  const b = octets[1] ?? 0;
  return (
    a === 0 || // "this network"
    a === 10 || // private
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    a >= 224 // multicast and reserved
  );
}

/**
 * Expand an IPv6 address to its 16 bytes.
 *
 * Matching IPv6 by spelling does not work: the WHATWG URL parser rewrites
 * `::ffff:169.254.169.254` as `::ffff:a9fe:a9fe`, so a regex looking for a
 * dotted quad inside a v4-mapped address silently misses the metadata endpoint.
 * Parsing to bytes removes the whole class of encoding bugs.
 */
function ipv6ToBytes(address: string): number[] | undefined {
  let text = address;

  // A trailing dotted quad (::ffff:1.2.3.4) becomes two hex groups.
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (dotted?.[1] !== undefined) {
    const octets = dotted[1].split(".").map(Number);
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return undefined;
    const hi = ((octets[0] ?? 0) << 8) | (octets[1] ?? 0);
    const lo = ((octets[2] ?? 0) << 8) | (octets[3] ?? 0);
    text = `${text.slice(0, dotted.index)}${hi.toString(16)}:${lo.toString(16)}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return undefined;

  const toGroups = (part: string | undefined): number[] | undefined => {
    if (part === undefined || part.length === 0) return [];
    const groups: number[] = [];
    for (const chunk of part.split(":")) {
      if (!/^[0-9a-f]{1,4}$/i.test(chunk)) return undefined;
      groups.push(Number.parseInt(chunk, 16));
    }
    return groups;
  };

  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  if (head === undefined || tail === undefined) return undefined;

  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 0 : missing !== 0) return undefined;

  const groups = [...head, ...new Array<number>(Math.max(missing, 0)).fill(0), ...tail];
  if (groups.length !== 8) return undefined;

  return groups.flatMap((g) => [(g >> 8) & 0xff, g & 0xff]);
}

function isPrivateIPv6(address: string): boolean {
  const bytes = ipv6ToBytes(address.toLowerCase());
  // Unparseable is treated as private: refusing an address we cannot reason
  // about is the safe direction to fail.
  if (bytes === undefined) return true;

  const b0 = bytes[0] ?? 0;
  const b1 = bytes[1] ?? 0;

  // ::ffff:0:0/96 — IPv4-mapped. Reaches the same host as the bare IPv4.
  if (bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isPrivateIPv4(bytes.slice(12).join("."));
  }

  // :: (unspecified) and ::1 (loopback).
  if (bytes.slice(0, 15).every((b) => b === 0)) return true;

  return (
    (b0 & 0xfe) === 0xfc || // fc00::/7  unique-local
    (b0 === 0xfe && (b1 & 0xc0) === 0x80) || // fe80::/10 link-local
    b0 === 0xff // ff00::/8  multicast
  );
}

function isPrivateAddress(address: string, family: number): boolean {
  return family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SiteFetchError("Only http and https URLs can be analyzed.");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new SiteFetchError("That host can't be analyzed.");
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true });
  } catch (cause) {
    throw new SiteFetchError(
      "We couldn't reach that site. Check the URL and try again.",
      { cause },
    );
  }

  // Every answer must be public — one private address is enough to refuse.
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address, a.family))) {
    throw new SiteFetchError("That host can't be analyzed.");
  }
}

/* -------------------------------------------------------------------------- */
/* Fetch                                                                       */
/* -------------------------------------------------------------------------- */

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function fetchSite(rawUrl: string): Promise<SiteContent> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SiteFetchError("That doesn't look like a valid URL.");
  }

  const { response, finalUrl } = await fetchFollowingRedirects(url);

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new SiteFetchError(
      `That site responded with ${response.status}. Check the URL and try again.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("xml")) {
    await response.body?.cancel().catch(() => {});
    throw new SiteFetchError("That URL isn't a web page we can read.");
  }

  const html = await readCapped(response);
  return extract(html, finalUrl);
}

/**
 * Follow redirects by hand so that each hop passes the SSRF guard.
 * `redirect: "follow"` would let hop 0 be a harmless public URL and hop 1 be
 * the metadata endpoint.
 */
async function fetchFollowingRedirects(
  startUrl: URL,
): Promise<{ response: Response; finalUrl: string }> {
  let url = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en",
        },
      });
    } catch (cause) {
      throw new SiteFetchError(fetchFailureMessage(cause), { cause });
    }

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { response, finalUrl: url.toString() };
    }

    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => {});

    if (location === null || location.trim().length === 0) {
      throw new SiteFetchError("That site sent an invalid redirect.");
    }

    try {
      url = new URL(location, url);
    } catch (cause) {
      throw new SiteFetchError("That site sent an invalid redirect.", { cause });
    }
  }

  throw new SiteFetchError("That site redirected too many times.");
}

function fetchFailureMessage(cause: unknown): string {
  const name = cause instanceof Error ? cause.name : "";
  return name === "TimeoutError" || name === "AbortError"
    ? "That site took too long to respond. Check the URL and try again."
    : "We couldn't reach that site. Check the URL and try again.";
}

/**
 * Read the body but stop at the byte cap instead of buffering an enormous page.
 *
 * Wrapped in the same typed error as the request itself: a connection reset
 * mid-body is still "we couldn't read that site", not an internal error.
 */
async function readCapped(response: Response): Promise<string> {
  const body = response.body;
  if (body === null) return "";

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  const chunks: string[] = [];
  let bytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;

      bytes += value.byteLength;
      chunks.push(decoder.decode(value, { stream: true }));
      if (bytes >= MAX_BYTES) break;
    }
  } catch (cause) {
    throw new SiteFetchError(fetchFailureMessage(cause), { cause });
  } finally {
    await reader.cancel().catch(() => {});
  }

  return chunks.join("");
}

/* -------------------------------------------------------------------------- */
/* Extraction                                                                  */
/* -------------------------------------------------------------------------- */

function extract(html: string, finalUrl: string): SiteContent {
  const root = parse(html, { blockTextElements: { script: false, style: false } });

  // `||` not `??`: an empty <title> is exactly the thin-site case, and it must
  // fall through to og:title rather than winning with "".
  const title =
    root.querySelector("title")?.text.trim() ||
    meta(root, 'meta[property="og:title"]') ||
    "";

  const description =
    meta(root, 'meta[name="description"]') ||
    meta(root, 'meta[property="og:description"]') ||
    "";

  // Chrome and navigation are noise that crowds out the actual copy, and the
  // budget is measured in characters.
  for (const selector of ["script", "style", "noscript", "svg", "nav", "footer", "iframe"]) {
    for (const node of root.querySelectorAll(selector)) node.remove();
  }

  const body = root.querySelector("body") ?? root;
  const text = collapse(body.text);

  return {
    finalUrl,
    title,
    description,
    text: text.slice(0, MAX_TEXT_CHARS),
    thin: text.length < THIN_TEXT_CHARS,
  };
}

function meta(root: ReturnType<typeof parse>, selector: string): string {
  return root.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
}

function collapse(text: string): string {
  return text
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
