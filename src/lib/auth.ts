import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

export const ROLES = { customer: "customer", admin: "admin" } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const auth = betterAuth({
  appName: "VoltPay",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],

  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
  },

  // Stored in Postgres so limits hold across serverless instances.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/change-password": { window: 60, max: 5 },
    },
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
  },

  plugins: [
    admin({ defaultRole: ROLES.customer, adminRoles: [ROLES.admin] }),
    nextCookies(), // must be last: lets server actions set auth cookies
  ],
});

export type Session = typeof auth.$Infer.Session;
