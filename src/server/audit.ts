import "server-only";
import { headers } from "next/headers";

import { db } from "@/db";
import { auditLog } from "@/db/schema";

/** Append an entry to the audit log (who did what to which record). */
export async function audit(input: {
  actorUserId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db.insert(auditLog).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    meta: input.meta ?? null,
    ip,
  });
}
