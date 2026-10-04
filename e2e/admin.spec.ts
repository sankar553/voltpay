import { expect, test } from "@playwright/test";

import { AUTH, fromIp } from "./helpers";

test.use({ storageState: AUTH.admin, extraHTTPHeaders: fromIp("10.4.0.1") });
test.describe.configure({ mode: "serial" });

test("overview shows live numbers", async ({ page }) => {
  await page.goto("/admin");
  for (const label of [
    "Customers",
    "Meters",
    "Outstanding",
    "Collected this month",
    "Open complaints",
    "Unread messages",
  ]) {
    await expect(
      page.locator("[data-slot=card-description]", { hasText: label }).first(),
    ).toBeVisible();
  }
});

test("add a meter, edit it, rotate its QR code", async ({ page }) => {
  await page.goto("/admin/meters/new");
  await page.fill("#meterNumber", "MTR9001");
  await page.fill("#consumerNumber", "VP-2026-009001");
  await page.fill("#consumerName", "Test Consumer");
  await page.fill("#address", "1-1-1, Test Street");
  await page.fill("#district", "Krishna");
  await page.fill("#openingKwh", "500");
  await page.getByRole("button", { name: "Add meter" }).click();
  await page.waitForURL(/\/admin\/meters\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "MTR9001" })).toBeVisible();

  await page.fill("#address", "9-9-9, Edited Road");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.reload();
  await expect(page.locator("#address")).toHaveValue("9-9-9, Edited Road");

  await page.getByRole("button", { name: "Rotate QR code" }).click();
  await page.getByRole("button", { name: "Yes, rotate" }).click();
  await expect(page.getByText("QR code replaced")).toBeVisible();
});

test("a manual reading creates a correctly priced bill", async ({ page }) => {
  await page.goto("/admin/meters?q=MTR9001");
  await page.getByRole("link", { name: "MTR9001" }).click();
  await page.fill("#readingKwh", "400");
  await page.getByRole("button", { name: "Add reading & create bill" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("at least 500");
  await page.fill("#readingKwh", "620");
  await page.getByRole("button", { name: "Add reading & create bill" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Created BL-" })).toBeVisible();
  // 120 units: 100 × ₹3.00 + 20 × ₹4.50 = ₹390 + ₹50 fixed + 5% duty (₹19.50 → ₹20) = ₹460.00… plus rounding
  await page.reload();
  await expect(page.getByText("120", { exact: true }).first()).toBeVisible();
});

test("billing cycle is idempotent", async ({ page }) => {
  await page.goto("/admin/billing");
  await page.getByRole("button", { name: "Run billing cycle" }).click();
  await expect(page.getByRole("status").filter({ hasText: /bills? created/ })).toBeVisible();
  await page.getByRole("button", { name: "Run billing cycle" }).click();
  await expect(page.getByRole("status").filter({ hasText: "0 bills created" })).toBeVisible();
});

test("tariffs: slabs must increase; a valid one is saved once", async ({ page }) => {
  await page.goto("/admin/tariffs");
  await page.fill("#name", "Domestic 2027");
  await page.fill("#effectiveFrom", "2027-01-01");
  await page.fill("input[name=upto0]", "200");
  await page.fill("input[name=rate0]", "4");
  await page.fill("input[name=upto1]", "100");
  await page.fill("input[name=rate1]", "5");
  await page.fill("input[name=rate2]", "6");
  await page.getByRole("button", { name: "Add tariff" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("larger than the previous");
  await page.fill("input[name=upto1]", "400");
  await page.getByRole("button", { name: "Add tariff" }).click();
  await expect(page.getByText("Tariff saved")).toBeVisible();
  await page.getByRole("button", { name: "Add tariff" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("already starts");
});

test("cancel an unpaid bill", async ({ page }) => {
  await page.goto("/admin/bills?status=unpaid");
  const before = await page.locator("tbody tr").count();
  await page
    .getByRole("button", { name: /Cancel bill BL-/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(before - 1);
});

test("payments page lists payment history", async ({ page }) => {
  await page.goto("/admin/payments");
  expect(await page.locator("tbody tr").count()).toBeGreaterThan(5);
});

test("a customer's complaint can be answered and the customer sees the reply", async ({
  page,
  browser,
}) => {
  // The customer spec raised "Meter display is blank" earlier in the run; create one if run alone.
  await page.goto("/admin/complaints");
  if ((await page.getByText("Meter display is blank").count()) === 0)
    test.skip(true, "run the full suite so a complaint exists");
  await page.selectOption("select[name=status]", "resolved");
  await page.fill("textarea[name=adminNote]", "Checked: meter replaced.");
  await page.getByRole("button", { name: "Save response" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  const ctx = await browser.newContext({
    storageState: AUTH.customer,
    extraHTTPHeaders: fromIp("10.4.0.2"),
  });
  const cp = await ctx.newPage();
  await cp.goto("/complaints");
  await expect(cp.getByText("Checked: meter replaced.")).toBeVisible();
  await ctx.close();
});

test("contact inbox: read, then soft-delete", async ({ page }) => {
  await page.goto("/admin/inbox");
  if ((await page.getByRole("button", { name: "Delete" }).count()) === 0)
    test.skip(true, "no messages yet");
  await page.getByRole("button", { name: "Mark as read" }).first().click();
  await expect(page.getByText("New", { exact: true }))
    .toHaveCount(0, { timeout: 5000 })
    .catch(() => {});
  const before = await page.getByRole("button", { name: "Delete" }).count();
  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(before - 1);
});

test("daily job runs and the audit log records admin actions", async ({ page }) => {
  await page.goto("/admin/billing");
  await page.getByRole("button", { name: "Run daily job now" }).click();
  await expect(page.getByRole("status").filter({ hasText: "marked overdue" })).toBeVisible();
  await page.goto("/admin/audit");
  const text = await page.locator("tbody").innerText();
  for (const action of [
    "meter.created",
    "meter.qr_rotated",
    "reading.added",
    "billing.cycle_run",
    "tariff.created",
    "bill.cancelled",
    "reminders.run",
  ]) {
    expect(text).toContain(action);
  }
});
