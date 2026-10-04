import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request and does two jobs:
 *  1. Content-Security-Policy with a fresh per-request nonce (Next.js attaches the nonce to its own scripts).
 *  2. An optimistic auth redirect: no session cookie on a protected route → /login. This is NOT the
 *     security boundary — pages and actions still verify the session and role on the server
 *     (see src/server/authz.ts).
 */
const PROTECTED = ["/dashboard", "/admin", "/profile", "/meters", "/payments", "/complaints"];

const isDev = process.env.NODE_ENV === "development";
const httpsApp = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");

/** Razorpay Standard Checkout loads a script, opens an iframe and talks to its API. */
const RAZORPAY = "https://*.razorpay.com";

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets our nonce'd scripts load Razorpay's checkout.js; wasm is for the QR decoder.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    // Dev injects inline <style> for hot reload; production CSS is a static file.
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'", // style="" attributes can't run script
    `img-src 'self' data: blob: ${RAZORPAY}`,
    "font-src 'self'",
    `connect-src 'self' ${RAZORPAY}${isDev ? " ws: wss:" : ""}`,
    `frame-src ${RAZORPAY}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(httpsApp ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) &&
    !getSessionCookie(request)
  ) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip API routes, build assets, and static files in /public (the offline page has
      // its own inline script and must not receive a nonce-based policy).
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|icons/|zxing/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
