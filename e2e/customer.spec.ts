import { expect, test } from "@playwright/test";

import { AUTH, fromIp, openMeterBySearch } from "./helpers";

test.describe("guest pays a bill", () => {
  test.use({ extraHTTPHeaders: fromIp("10.3.0.1") });

  test("scan → masked bill → pay → receipt with PDF", async ({ page, request }) => {
    await openMeterBySearch(page, "VP-2024-000103");
    await expect(page.getByText("Details are partly hidden")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Ravi Teja"); // name is masked for non-owners
    const billNumber = (await page.locator("body").innerText()).match(/BL-\d+-MTR1003/)![0];
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.waitForURL("**/receipts/**");
    await expect(page.getByRole("heading", { name: "Payment successful" })).toBeVisible();
    await expect(page.getByText(/Receipt VP-/)).toBeVisible();

    const pdf = await request.get(page.url() + "/pdf");
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");

    // A bill is consumed by paying: it can't be offered (or paid) again.
    await openMeterBySearch(page, "VP-2024-000103");
    await expect(page.locator("body")).not.toContainText(billNumber);
  });

  test("a forged QR link is rejected", async ({ page }) => {
    await page.goto("/m/AAAAAAAAAAAAAAAAAAAAAA.forgedsignature00");
    await expect(page.getByText("invalid or has been replaced")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay ₹/ })).toHaveCount(0);
  });
});

test.describe("signed-in customer", () => {
  test.use({ storageState: AUTH.customer, extraHTTPHeaders: fromIp("10.3.0.2") });

  test("dashboard shows only their meter, with dues and payments", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("MTR1001").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("MTR1002");
    await expect(page.getByText("Recent payments")).toBeVisible();
  });

  test("bill history and usage chart (with keyboard + table view)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Usage" }).first().click();
    const bars = page.locator("svg g[role=img]");
    await expect(bars).toHaveCount(6);
    await bars.nth(2).hover();
    await expect(page.getByRole("status").first()).toContainText("kWh");
    await page.getByRole("button", { name: "Show table" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(6);
    await page.getByRole("link", { name: "Bills" }).first().click();
    await expect(page.getByText(/BL-\d{6,8}-MTR1001/).first()).toBeVisible();
  });

  test("other customers' meters are 404", async ({ page }) => {
    await page.goto("/dashboard");
    const own = await page.getByRole("link", { name: "Bills" }).first().getAttribute("href");
    const res = await page.goto(
      own!.replace(/\/meters\/[^/]+/, "/meters/00000000-0000-4000-8000-000000000000"),
    );
    expect(res?.status()).toBe(404);
  });

  test("linking a meter needs the right last-paid amount, with no hints", async ({ page }) => {
    await page.goto("/meters/link");
    await page.fill("#consumerNumber", "VP-2024-000102");
    await page.fill("#amount", "1.00");
    await page.getByRole("button", { name: "Link meter" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("don't match");
    await page.fill("#consumerNumber", "VP-9999-000000");
    await page.getByRole("button", { name: "Link meter" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("don't match"); // same message: no enumeration
  });

  test("raise a complaint and see it listed", async ({ page }) => {
    await page.goto("/complaints/new");
    await page.selectOption("#meterId", { index: 1 });
    await page.selectOption("#category", "meter_fault");
    await page.fill("#subject", "Meter display is blank");
    await page.fill("#description", "The display has been blank since yesterday evening.");
    await page.getByRole("button", { name: "Submit complaint" }).click();
    await page.waitForURL("**/complaints");
    await expect(page.getByText("Meter display is blank")).toBeVisible();
  });

  test("profile saves and a wrong current password is refused", async ({ page }) => {
    await page.goto("/profile");
    await page.fill("#phone", "+91 98765 43210");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await page.fill("#currentPassword", "WrongPassword1");
    await page.fill("#newPassword", "NewPassword@123");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.locator("p[role=alert]").first()).toContainText(/password/i);
  });

  test("customers get a 404 on every admin page", async ({ page }) => {
    for (const path of [
      "/admin",
      "/admin/meters",
      "/admin/billing",
      "/admin/inbox",
      "/admin/audit",
    ]) {
      expect((await page.goto(path))?.status()).toBe(404);
    }
  });
});

test.describe("sign-up and sign-in", () => {
  test.use({ extraHTTPHeaders: fromIp("10.3.0.3") });

  test("a new account can sign up, and bad passwords are refused", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "nobody@example.com");
    await page.fill("#password", "Wrong-password-1");
    await page.click("button[type=submit]");
    await expect(page.locator("p[role=alert]").first()).toBeVisible();
    await expect(page.locator("#email")).toHaveValue("nobody@example.com"); // input kept

    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.fill("#name", "E2E Tester");
    await page.fill("#email", email);
    await page.fill("#password", "A-long-passw0rd!");
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Link your first meter")).toBeVisible();
  });
});
