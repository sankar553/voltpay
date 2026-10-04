"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.email("Enter a valid email address.").max(120),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(1500),
  /** Honeypot: real people never see or fill this field. */
  website: z.string().max(200).optional(),
});

const PER_IP_PER_HOUR = 3;
const GLOBAL_PER_HOUR = 60;

export async function submitContactAction(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  // Bots that fill the hidden field get a fake "thanks" and nothing is stored.
  if (parsed.data.website) return { ok: true };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const since = new Date(Date.now() - 3_600_000);

  const [[perIp], [global]] = await Promise.all([
    ip
      ? db
          .select({ n: count() })
          .from(contactMessages)
          .where(and(eq(contactMessages.ip, ip), gt(contactMessages.createdAt, since)))
      : Promise.resolve([{ n: 0 }]),
    db.select({ n: count() }).from(contactMessages).where(gt(contactMessages.createdAt, since)),
  ]);
  if (perIp.n >= PER_IP_PER_HOUR || global.n >= GLOBAL_PER_HOUR) {
    return { ok: false, error: "You've sent several messages recently. Please try again later." };
  }

  await db.insert(contactMessages).values({
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    ip,
  });
  return { ok: true };
}
