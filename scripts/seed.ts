/**
 * Seed demo accounts.  Usage:  npm run db:seed
 *
 * Creates (if missing):
 *   - an admin user     (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *   - a demo customer   (SEED_CUSTOMER_EMAIL / SEED_CUSTOMER_PASSWORD)
 *
 * Defaults are for local development only; production requires explicit values.
 * Demo data is fictional — never seed real customer details.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const { user } = await import("@/db/schema");
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
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
