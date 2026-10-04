import "server-only";
import { z } from "zod";

/**
 * Server environment variables, validated once at startup.
 * The app refuses to run with missing/weak secrets (fixes V1's hardcoded JWT secret).
 *
 * Set SKIP_ENV_VALIDATION=1 only for CI builds that never talk to a database.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters (use: openssl rand -base64 32)"),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return process.env as unknown as Env;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}\nSee .env.example`);
  }
  return parsed.data;
}

export const env = loadEnv();
