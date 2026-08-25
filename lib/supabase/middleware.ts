import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import type { Database } from "@/lib/types/database";

/** Prefixes that require an authenticated user. */
const PROTECTED_PREFIXES = ["/dashboard"];

/** Routes an authenticated user has no reason to see. */
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Refreshes the Supabase session on every matched request and enforces route
 * protection.
 *
 * The response object is rebuilt inside `setAll` rather than created once up
 * front. That looks redundant but isn't: a refreshed token has to be written to
 * *both* the request (so the handlers below see it) and the outgoing response
 * (so the browser stores it). Getting this wrong is the documented cause of
 * random logouts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
          // Responses that set auth cookies must never be cached by a CDN, or
          // one user's session token can be served to another.
          for (const [key, value] of Object.entries(headers)) {
            supabaseResponse.headers.set(key, value);
          }
        },
      },
    },
  );

  // getUser() revalidates against the auth server. Do not swap this for
  // getSession(), which trusts the cookie and can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Preserve the full deep link, query string included, so a shared
    // /dashboard/<id>?tab=x survives the round trip through login.
    // Sanitised because a request to `https://host//evil.com` has pathname
    // `//evil.com`, which would otherwise be echoed into the redirect param.
    const safeNext = safeRedirectPath(`${pathname}${request.nextUrl.search}`);
    if (safeNext !== "/dashboard") url.searchParams.set("next", safeNext);
    return redirectPreservingCookies(url, supabaseResponse);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectPreservingCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

/**
 * Redirects while carrying over any cookies Supabase just rotated.
 *
 * `getUser()` can refresh the session as a side effect, writing new tokens into
 * `supabaseResponse` via `setAll`. Returning a bare `NextResponse.redirect`
 * throws that response away — and with it the refreshed tokens — so the browser
 * keeps the stale ones and the user is silently logged out on the next request.
 * The same applies in reverse: after a failed refresh Supabase emits
 * cookie-clearing headers that must also survive.
 */
function redirectPreservingCookies(url: URL, carrying: NextResponse) {
  const response = NextResponse.redirect(url);
  for (const cookie of carrying.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}
