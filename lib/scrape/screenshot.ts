import "server-only";

import { z } from "zod";

/**
 * Capture a screenshot of the target site for the Analyzer to look at.
 *
 * This is bonus #1, and it costs **no extra model quota**: the image is
 * attached to the analyzer call that was already going to happen, as a second
 * part alongside the scraped text. Gemini Flash is multimodal, so one call
 * reads both.
 *
 * It exists to fix a real, documented weakness rather than to add a trick. The
 * analyzer is text-only today, so a JS-heavy landing page with almost no copy
 * — `SiteContent.thin` — analyses badly. A picture is exactly what that case
 * is missing.
 *
 * ## Every failure returns null. None of them throws.
 *
 * microlink's anonymous tier is slow (measured 0.4-8s) and rate-limits without
 * warning. Neither is a reason to fail an analysis that would otherwise
 * succeed on text alone, so the contract is deliberately lossy: callers get an
 * image or they get `null`, and the prompt adapts. A screenshot is an
 * enhancement to the analysis, never a precondition for it.
 */

/**
 * Whole-operation budget: the API call and the image download share it.
 *
 * Deliberately the same 8s ceiling `fetchSite` uses, because the two run
 * concurrently and the LONGER of them sets the pre-model latency. At 12s this
 * quietly moved the route's worst case to 52s (12 + 20s call + 20s retry)
 * against a 60s `maxDuration`, where a slow capture plus a schema retry gets
 * the function killed by the platform and the user sees a 504 instead of the
 * typed error. 8s keeps the documented 48s worst case true. Measured captures
 * are 0.4-1.2s, so this is generous rather than tight.
 */
const TOTAL_TIMEOUT_MS = 8_000;

/**
 * Cap on the decoded image.
 *
 * Sized for a viewport PNG (measured: 40-200kB). Anything dramatically larger
 * is a redirect to something that isn't a screenshot, and base64 inflates
 * whatever we accept by a third before it reaches the request body.
 */
const MAX_IMAGE_BYTES = 3_000_000;

const microlinkResponseSchema = z.object({
  status: z.string(),
  data: z
    .object({
      screenshot: z.object({ url: z.string(), type: z.string().optional() }).optional(),
    })
    .optional(),
});

export type Screenshot = {
  /** base64, no data: prefix — what Gemini's inlineData part expects. */
  data: string;
  mimeType: string;
};

/**
 * The image URL comes back inside a response body, so it is not automatically
 * trustworthy just because we chose the API. Pinning it to microlink's own
 * hosts keeps a compromised or redirecting response from turning this into a
 * server-side fetch of anywhere the body names.
 */
function isMicrolinkAsset(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && /(^|\.)microlink\.io$/.test(url.hostname);
  } catch {
    return false;
  }
}

export async function captureScreenshot(target: string): Promise<Screenshot | null> {
  // One budget for both round trips. The analyze route runs this concurrently
  // with the site fetch, so the ceiling that matters is this one, not the sum.
  const signal = AbortSignal.timeout(TOTAL_TIMEOUT_MS);

  try {
    const endpoint = new URL("https://api.microlink.io/");
    endpoint.searchParams.set("url", target);
    endpoint.searchParams.set("screenshot", "true");
    // We only want the image. Asking for metadata makes microlink do more work
    // and makes the response slower for no benefit here.
    endpoint.searchParams.set("meta", "false");

    const response = await fetch(endpoint, { signal, headers: { accept: "application/json" } });
    // 429 lands here like any other non-200. Anonymous rate limiting is
    // expected under load, not exceptional, so it is not logged as an error.
    if (!response.ok) return null;

    const body = microlinkResponseSchema.safeParse(await response.json());
    if (!body.success || body.data.status !== "success") return null;

    const shot = body.data.data?.screenshot;
    if (shot === undefined || !isMicrolinkAsset(shot.url)) return null;

    // `redirect: "error"` is what makes the host check above mean anything.
    // Validating the URL and then letting fetch follow a 302 is not a check at
    // all: a microlink.io URL that redirects to 169.254.169.254 or any internal
    // address would be fetched by the server and base64'd into the prompt.
    // Measured: the CDN serves the image directly, so nothing legitimate is
    // lost by refusing.
    const image = await fetch(shot.url, { signal, redirect: "error" });
    if (!image.ok) return null;

    // Checked before buffering. `arrayBuffer()` reads the whole body into
    // memory first, so testing its length afterwards enforces nothing — the
    // allocation the cap exists to prevent has already happened.
    const declared = Number(image.headers.get("content-length") ?? Number.NaN);
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) return null;

    const bytes = await image.arrayBuffer();
    // Re-checked: content-length is optional, and a chunked response can
    // exceed the cap without ever declaring a length.
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;

    // Trust the response's own content-type over the API's `type` field, and
    // fall back to PNG, which is what the endpoint returns by default.
    const mimeType = image.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png";
    if (!mimeType.startsWith("image/")) return null;

    return { data: Buffer.from(bytes).toString("base64"), mimeType };
  } catch {
    // Timeout, DNS failure, malformed JSON, aborted download — all the same
    // outcome to the caller. The analysis proceeds on text.
    return null;
  }
}
