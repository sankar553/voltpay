import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { throttle } from "@/db/schema";

/** Best-effort client IP (Vercel sets x-forwarded-for; locally it's absent). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/**
 * Fixed-window rate limit stored in Postgres, so it works across serverless instances.
 * One atomic upsert per call: the window resets once `windowSec` has passed.
 * Returns ok=false once more than `max` calls were made inside the window.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const rows = await db.execute<{ count: number; age: number }>(sql`
    INSERT INTO ${throttle} (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN ${throttle.windowStart} < now() - make_interval(secs => ${windowSec})
                   THEN 1 ELSE ${throttle.count} + 1 END,
      window_start = CASE WHEN ${throttle.windowStart} < now() - make_interval(secs => ${windowSec})
                          THEN now() ELSE ${throttle.windowStart} END
    RETURNING count, extract(epoch FROM (now() - window_start))::int AS age
  `);
  const row = rows.rows[0];
  return { ok: row.count <= max, retryAfterSec: Math.max(1, windowSec - row.age) };
}

/** Drop counters whose window is long over (called from the daily job). */
export async function pruneThrottle() {
  await db.execute(sql`DELETE FROM ${throttle} WHERE window_start < now() - interval '1 day'`);
}
