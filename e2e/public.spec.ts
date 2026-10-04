import { expect, test } from "@playwright/test";

import { fromIp } from "./helpers";

test.describe("public site", () => {
  test("protected pages send guests to sign in", async ({ page }) => {
    for (const path of [
      "/dashboard",
      "/payments",
      "/complaints",
      "/profile",
      "/meters/link",
      "/admin",
      "/admin/meters",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
  });

  test("security headers and a nonce-based CSP are set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBeTruthy();
    const csp = h["content-security-policy"];
    expect(csp).toMatch(/script-src [^;]*'nonce-[^']+'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://*.razorpay.com");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  test("health check, robots and manifest respond", async ({ request }) => {
    expect(await (await request.get("/api/health")).json()).toEqual({ ok: true });
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ short_name: "VoltPay", display: "standalone" });
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  test("service worker file is never cached", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test("cron route is closed without the secret", async ({ request }) => {
    expect((await request.get("/api/cron/daily")).status()).toBe(401);
    expect(
      (
        await request.get("/api/cron/daily", { headers: { authorization: "Bearer wrong" } })
      ).status(),
    ).toBe(401);
  });

  test("a page produces no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    await page.addInitScript(() =>
      document.addEventListener("securitypolicyviolation", (e) =>
        ((window as unknown as { __v: string[] }).__v ||= []).push(e.violatedDirective),
      ),
    );
    for (const path of ["/", "/login", "/scan", "/contact"]) {
      await page.goto(path);
      await page.waitForTimeout(500);
      violations.push(
        ...(await page.evaluate(() => (window as unknown as { __v?: string[] }).__v ?? [])),
      );
    }
    expect(violations).toEqual([]);
  });
});

test.describe("contact form", () => {
  test.use({ extraHTTPHeaders: fromIp("10.2.0.1") });

  test("validates, keeps typed input, then sends", async ({ page }) => {
    await page.goto("/contact");
    await page.fill("#name", "Test Visitor");
    await page.fill("#email", "visitor@example.com");
    await page.fill("#message", "short");
    await page.evaluate(() =>
      document.querySelectorAll("textarea,input").forEach((e) => e.removeAttribute("minlength")),
    );
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("at least 10");
    await expect(page.locator("#name")).toHaveValue("Test Visitor");
    await page.fill("#message", "Hello, this is an end-to-end test message.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks");
  });

  test("bots that fill the hidden field are quietly dropped", async ({ page }) => {
    await page.goto("/contact");
    await page.fill("#name", "Bot");
    await page.fill("#email", "bot@example.com");
    await page.fill("#message", "Buy cheap watches right now please");
    await page.evaluate(() => {
      (document.querySelector("input[name=website]") as HTMLInputElement).value =
        "http://spam.example";
    });
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks");
  });
});

test.describe("lookup rate limit", () => {
  test.use({ extraHTTPHeaders: fromIp("10.2.0.9") });

  test("repeated consumer-number lookups get throttled", async ({ page }) => {
    await page.goto("/scan");
    let throttled = false;
    for (let i = 0; i < 25 && !throttled; i++) {
      await page.fill("#consumer", `VP-0000-${String(i).padStart(6, "0")}`);
      await page.getByRole("button", { name: "Find" }).click();
      await expect(page.locator("p[role=alert]")).toBeVisible();
      throttled = /too many/i.test(await page.locator("p[role=alert]").innerText());
    }
    expect(throttled).toBe(true);
  });
});
