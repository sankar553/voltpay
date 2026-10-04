import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth, ROLES } from "@/lib/auth";

/**
 * Authorization helpers — deny by default.
 * Every protected page, server action and route handler must call one of these
 * (proxy.ts only does an optimistic cookie check for fast redirects).
 */

/** Current session or null. Cached per request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Require a signed-in user; otherwise redirect to login and come back afterwards. */
export async function requireUser(returnTo?: string) {
  const session = await getSession();
  if (!session) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }
  return session;
}

/** Require an admin. Non-admins get a 404 so the admin area isn't advertised. */
export async function requireAdmin() {
  const session = await requireUser("/admin");
  if (session.user.role !== ROLES.admin) notFound();
  return session;
}
