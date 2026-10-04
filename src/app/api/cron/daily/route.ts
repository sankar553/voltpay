import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { runDailyJob } from "@/server/reminders";

export const dynamic = "force-dynamic";

const digest = (v: string) => createHash("sha256").update(v).digest();

/**
 * Daily job (marks overdue bills, sends reminders). Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET`. With no CRON_SECRET configured the route is closed.
 */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  const sent = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(digest(sent), digest(`Bearer ${secret}`))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runDailyJob();
  return Response.json({ ok: true, ...summary });
}
