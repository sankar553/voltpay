import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { AUTH, fromIp, openMeterBySearch } from "./helpers";

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes
          .slice(0, 2)
          .map((n) => n.target.join(" "))
          .join(" | ")}`,
    ),
  ).toEqual([]);
}

test.describe("accessibility: public pages", () => {
  test.use({ extraHTTPHeaders: fromIp("10.5.0.1") });
  for (const path of ["/", "/login", "/signup", "/scan", "/contact"]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await audit(page);
    });
  }
  test("bill page", async ({ page }) => {
    await openMeterBySearch(page, "VP-2024-000102");
    await audit(page);
  });
});

test.describe("accessibility: customer pages", () => {
  test.use({ storageState: AUTH.customer, extraHTTPHeaders: fromIp("10.5.0.2") });
  for (const path of [
    "/dashboard",
    "/payments",
    "/complaints",
    "/complaints/new",
    "/profile",
    "/meters/link",
  ]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await audit(page);
    });
  }
  test("usage chart", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Usage" }).first().click();
    await page.waitForSelector("svg g[role=img]");
    await audit(page);
  });
});

test.describe("accessibility: admin pages", () => {
  test.use({ storageState: AUTH.admin, extraHTTPHeaders: fromIp("10.5.0.3") });
  for (const path of [
    "/admin",
    "/admin/meters",
    "/admin/meters/new",
    "/admin/billing",
    "/admin/bills",
    "/admin/payments",
    "/admin/tariffs",
    "/admin/complaints",
    "/admin/inbox",
    "/admin/audit",
  ]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await audit(page);
    });
  }
});
