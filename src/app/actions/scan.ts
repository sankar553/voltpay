"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { meters } from "@/db/schema";
import { buildQrCode } from "@/server/qr";

/**
 * Manual fallback when the camera can't read a sticker: look up by consumer number.
 * Only the masked bill page is reachable from here (same as scanning).
 */
export async function lookupByConsumerNumber(
  value: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const parsed = z.string().trim().min(5).max(40).safeParse(value);
  if (!parsed.success) return { ok: false, error: "Enter a valid consumer number." };

  const [meter] = await db
    .select({ qrToken: meters.qrToken })
    .from(meters)
    .where(eq(meters.consumerNumber, parsed.data.toUpperCase()))
    .limit(1);
  if (!meter) return { ok: false, error: "No meter found for that consumer number." };
  return { ok: true, path: `/m/${buildQrCode(meter.qrToken)}` };
}
