import { afterEach, describe, expect, it, vi } from "vitest";

const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  QR_SIGNING_SECRET: "q".repeat(32),
};

async function loadWith(vars: Record<string, string | undefined>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv("SKIP_ENV_VALIDATION", "");
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("@/lib/env");
}

describe("env validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a complete config", async () => {
    const { env } = await loadWith(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
  });

  it("rejects a short auth secret", async () => {
    await expect(loadWith({ ...valid, BETTER_AUTH_SECRET: "short" })).rejects.toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("rejects a non-postgres database URL", async () => {
    await expect(loadWith({ ...valid, DATABASE_URL: "mysql://u:p@h/db" })).rejects.toThrow(
      /DATABASE_URL/,
    );
  });
});
