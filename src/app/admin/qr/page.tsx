import QRCode from "qrcode";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/db";
import { meters } from "@/db/schema";
import { requireAdmin } from "@/server/authz";
import { qrUrl } from "@/server/qr";

export const metadata: Metadata = { title: "Meter QR codes" };

export default async function AdminQrPage() {
  await requireAdmin();
  const rows = await db.select().from(meters).orderBy(meters.meterNumber);

  const items = await Promise.all(
    rows.map(async (m) => ({
      ...m,
      svg: await QRCode.toString(qrUrl(m.qrToken), { type: "svg", margin: 1, width: 180 }),
    })),
  );

  return (
    <>
      <Link href="/admin/meters" className="text-sm text-primary hover:underline">
        ← Meters
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Meter QR codes</h1>
      <p className="mt-2 text-muted-foreground">
        Print these as stickers. Each code is signed; forged or edited codes are rejected. Rotate a
        meter’s code from its page if a sticker is damaged or copied.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <figure
            key={m.id}
            className="grid justify-items-center gap-2 rounded-xl border bg-white p-4 text-center text-black"
          >
            <div
              dangerouslySetInnerHTML={{ __html: m.svg }}
              aria-label={`QR code for meter ${m.meterNumber}`}
            />
            <figcaption className="text-sm">
              <p className="font-semibold">{m.meterNumber}</p>
              <p className="text-xs text-neutral-600">Consumer {m.consumerNumber}</p>
              <p className="text-xs text-neutral-600">{m.district}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
