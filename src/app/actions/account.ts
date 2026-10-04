"use server";

import { and, count, gt } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { auditLog, complaints, profiles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/server/authz";
import { getOwnedMeter, linkMeter } from "@/server/meters";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const linkSchema = z.object({
  consumerNumber: z.string().trim().min(5, "Enter your consumer number.").max(40),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter the amount in rupees, e.g. 554 or 554.00."),
  relation: z.enum(["owner", "family", "tenant"]),
});

export async function linkMeterAction(
  input: z.input<typeof linkSchema>,
): Promise<Result<{ meterId: string }>> {
  const { user } = await requireUser("/meters/link");
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    const res = await linkMeter({
      userId: user.id,
      consumerNumber: parsed.data.consumerNumber,
      amountPaise: Math.round(Number(parsed.data.amount) * 100),
      relation: parsed.data.relation,
    });
    if (!res.ok) return res;
    revalidatePath("/dashboard");
    return { ok: true, meterId: res.meterId };
  } catch (err) {
    console.error("linkMeterAction failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const complaintSchema = z.object({
  meterId: z.uuid("Choose a meter."),
  category: z.enum(["billing", "meter_fault", "supply", "other"]),
  subject: z.string().trim().min(5, "Add a short subject (5+ characters).").max(120),
  description: z.string().trim().min(10, "Please describe the problem (10+ characters).").max(1000),
});

export async function createComplaintAction(
  input: z.input<typeof complaintSchema>,
): Promise<Result> {
  const { user } = await requireUser("/complaints/new");
  const parsed = complaintSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  // Only for meters the user is linked to.
  if (!(await getOwnedMeter(user.id, parsed.data.meterId))) {
    return { ok: false, error: "You can only raise complaints for your own meters." };
  }

  // Basic abuse limit: 5 complaints per hour.
  const [{ n }] = await db
    .select({ n: count() })
    .from(complaints)
    .where(
      and(
        eq(complaints.userId, user.id),
        gt(complaints.createdAt, new Date(Date.now() - 3_600_000)),
      ),
    );
  if (n >= 5)
    return { ok: false, error: "You've raised several complaints recently. Please wait a while." };

  const [row] = await db
    .insert(complaints)
    .values({ userId: user.id, ...parsed.data })
    .returning({ id: complaints.id });
  await db.insert(auditLog).values({
    actorUserId: user.id,
    action: "complaint.created",
    entity: "complaint",
    entityId: row.id,
  });
  revalidatePath("/complaints");
  return { ok: true };
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9][0-9 ()-]{6,19})?$/, "Enter a valid phone number.")
    .optional()
    .default(""),
  address: z.string().trim().max(200, "Address is too long.").optional().default(""),
  notifyEmail: z.boolean(),
});

export async function updateProfileAction(input: z.input<typeof profileSchema>): Promise<Result> {
  const { user } = await requireUser("/profile");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, phone, address, notifyEmail } = parsed.data;

  try {
    if (name !== user.name) {
      await auth.api.updateUser({ headers: await headers(), body: { name } });
    }
    await db
      .insert(profiles)
      .values({ userId: user.id, phone: phone || null, address: address || null, notifyEmail })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { phone: phone || null, address: address || null, notifyEmail },
      });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("updateProfileAction failed", err);
    return { ok: false, error: "Could not save your profile. Please try again." };
  }
}
