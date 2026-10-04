/**
 * Seed demo data.  Usage:  npm run db:seed            (idempotent)
 *                          npm run db:seed -- --fresh   (wipe billing + demo activity data and rebuild,
 *                                                        so the demo always has a bill to pay)
 *
 * Creates (if missing):
 *   - an admin user     (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *   - a demo customer   (SEED_CUSTOMER_EMAIL / SEED_CUSTOMER_PASSWORD)
 *   - demo tariffs, 5 fictional meters, 7 monthly readings and 6 bills per meter
 *
 * Defaults are for local development only; production requires explicit values.
 * Demo data is fictional — never seed real customer details.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const iso = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { user } = schema;
  const { auth, ROLES } = await import("@/lib/auth");

  const isProd = process.env.NODE_ENV === "production";
  const accounts = [
    {
      name: "VoltPay Admin",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@voltpay.test",
      password: process.env.SEED_ADMIN_PASSWORD ?? (isProd ? "" : "Admin@12345"),
      role: ROLES.admin,
    },
    {
      name: "Demo Customer",
      email: process.env.SEED_CUSTOMER_EMAIL ?? "customer@voltpay.test",
      password: process.env.SEED_CUSTOMER_PASSWORD ?? (isProd ? "" : "Customer@12345"),
      role: ROLES.customer,
    },
  ];

  for (const acc of accounts) {
    if (!acc.password) throw new Error(`Set a password for ${acc.email} via env in production.`);

    const existing = await db.query.user.findFirst({ where: eq(user.email, acc.email) });
    if (existing) {
      console.log(`• ${acc.email} already exists (role: ${existing.role})`);
      continue;
    }

    const res = await auth.api.signUpEmail({
      body: { name: acc.name, email: acc.email, password: acc.password },
    });
    await db.update(user).set({ role: acc.role }).where(eq(user.id, res.user.id));
    console.log(`✓ created ${acc.role.padEnd(8)} ${acc.email}`);
  }

  const customer = await db.query.user.findFirst({
    where: eq(user.email, accounts[1].email),
  });
  await seedBilling(customer?.id ?? null);
}

async function seedBilling(customerId: string | null) {
  const { count } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const s = await import("@/db/schema");
  const { calculateBill } = await import("@/server/tariff");
  const { generateQrToken } = await import("@/server/qr");

  if (process.argv.includes("--fresh")) {
    for (const t of [
      s.payments,
      s.webhookEvents,
      s.complaints,
      s.contactMessages,
      s.auditLog,
      s.throttle,
      s.rateLimit,
      s.bills,
      s.meterReadings,
      s.userMeters,
      s.meters,
      s.tariffs,
    ]) {
      await db.delete(t);
    }
    console.log("• wiped billing data");
  }

  const [{ n }] = await db.select({ n: count() }).from(s.meters);
  if (n > 0) {
    console.log(`• ${n} meters already exist (use --fresh to rebuild demo billing data)`);
    return;
  }

  // Illustrative tariffs — NOT real DISCOM rates.
  const [domestic, commercial] = await db
    .insert(s.tariffs)
    .values([
      {
        name: "Demo domestic",
        connectionType: "domestic",
        effectiveFrom: "2026-01-01",
        slabs: [
          { uptoUnits: 100, paisePerUnit: 300 },
          { uptoUnits: 200, paisePerUnit: 450 },
          { uptoUnits: 400, paisePerUnit: 650 },
          { uptoUnits: null, paisePerUnit: 800 },
        ],
        fixedChargePaise: 5000,
        dutyBps: 500,
      },
      {
        name: "Demo commercial",
        connectionType: "commercial",
        effectiveFrom: "2026-01-01",
        slabs: [
          { uptoUnits: 100, paisePerUnit: 600 },
          { uptoUnits: 300, paisePerUnit: 750 },
          { uptoUnits: null, paisePerUnit: 900 },
        ],
        fixedChargePaise: 15000,
        dutyBps: 600,
      },
    ])
    .returning();

  const demo = [
    {
      no: "MTR1001",
      cons: "VP-2024-000101",
      name: "Demo Customer",
      addr: "12-5-84, Lake View Road",
      district: "Krishna",
      type: "domestic",
      kw: "5",
      base: 210,
    },
    {
      no: "MTR1002",
      cons: "VP-2024-000102",
      name: "Anita Sharma",
      addr: "4-12-9, Market Street",
      district: "Guntur",
      type: "domestic",
      kw: "3",
      base: 140,
    },
    {
      no: "MTR1003",
      cons: "VP-2024-000103",
      name: "Ravi Teja Traders",
      addr: "22-8-1, Station Road",
      district: "Visakhapatnam",
      type: "commercial",
      kw: "10",
      base: 520,
    },
    {
      no: "MTR1004",
      cons: "VP-2024-000104",
      name: "Lakshmi Enterprises",
      addr: "7-3-15, Temple Road",
      district: "Chittoor",
      type: "commercial",
      kw: "15",
      base: 780,
    },
    {
      no: "MTR1005",
      cons: "VP-2024-000105",
      name: "Mohan Rao",
      addr: "10-2-6, Canal Bank Road",
      district: "Nellore",
      type: "domestic",
      kw: "3",
      base: 95,
    },
  ] as const;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const y = today.getUTCFullYear();
  const mo = today.getUTCMonth();
  // Reading dates: first of each month, last one = first of the current month.
  const readDates = Array.from({ length: 7 }, (_, i) => iso(y, mo - 6 + i, 1));

  for (const [mi, d] of demo.entries()) {
    const [meter] = await db
      .insert(s.meters)
      .values({
        meterNumber: d.no,
        consumerNumber: d.cons,
        qrToken: generateQrToken(),
        consumerName: d.name,
        address: d.addr,
        district: d.district,
        connectionType: d.type,
        sanctionedLoadKw: d.kw,
      })
      .returning();

    if (mi === 0 && customerId) {
      await db
        .insert(s.userMeters)
        .values({ userId: customerId, meterId: meter.id, relation: "owner" });
    }

    // Cumulative readings with deterministic month-to-month variation.
    let cumulative = 12_000 + mi * 1_500;
    const readings = [] as { id: string; kwh: number; at: string }[];
    for (const [ri, at] of readDates.entries()) {
      if (ri > 0) cumulative += Math.round(d.base * (0.85 + 0.3 * (((ri * 7 + mi * 3) % 10) / 10)));
      const [r] = await db
        .insert(s.meterReadings)
        .values({ meterId: meter.id, readingKwh: cumulative, readAt: at, source: "simulated" })
        .returning();
      readings.push({ id: r.id, kwh: cumulative, at });
    }

    const tariff = d.type === "domestic" ? domestic : commercial;
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const cur = readings[i];
      const amounts = calculateBill(cur.kwh - prev.kwh, tariff);
      const [yy, mm] = cur.at.split("-").map(Number);
      const due = iso(yy, mm - 1, 15);
      const isLatest = i === readings.length - 1;
      const status = isLatest ? (due < todayIso ? "overdue" : "unpaid") : "paid";

      const [bill] = await db
        .insert(s.bills)
        .values({
          billNumber: `BL-${cur.at.slice(0, 7).replace("-", "")}-${d.no}`,
          meterId: meter.id,
          tariffId: tariff.id,
          periodStart: prev.at,
          periodEnd: cur.at,
          previousReadingId: prev.id,
          currentReadingId: cur.id,
          ...amounts,
          dueDate: due,
          status,
          paidAt: status === "paid" ? new Date(`${iso(yy, mm - 1, 8)}T10:00:00Z`) : null,
        })
        .returning();

      if (status === "paid") {
        await db.insert(s.payments).values({
          billId: bill.id,
          userId: mi === 0 ? customerId : null,
          amountPaise: amounts.totalPaise,
          gateway: "mock",
          gatewayOrderId: `order_seed_${d.no}_${i}`,
          gatewayPaymentId: `pay_seed_${d.no}_${i}`,
          method: ["upi", "card", "netbanking"][(mi + i) % 3],
          status: "captured",
          receiptNumber: `VP-${iso(yy, mm - 1, 8).replaceAll("-", "")}-S${mi}${i}00`,
          capturedAt: new Date(`${iso(yy, mm - 1, 8)}T10:00:00Z`),
        });
      }
    }
  }
  console.log("✓ seeded tariffs, 5 demo meters, readings, bills and payment history");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
