/**
 * Only allow same-site relative paths as post-login redirects
 * (prevents open-redirect phishing like ?next=https://evil.example).
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
