import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@voltpay.test", password: "Admin@12345" };
export const CUSTOMER = { email: "customer@voltpay.test", password: "Customer@12345" };
export const AUTH = { admin: "e2e/.auth/admin.json", customer: "e2e/.auth/customer.json" };

export async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill("#email", who.email);
  await page.fill("#password", who.password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
}

/** Find a meter's bill page the way a visitor would: type the consumer number on /scan. */
export async function openMeterBySearch(page: Page, consumerNumber: string) {
  await page.goto("/scan");
  await page.fill("#consumer", consumerNumber);
  await page.getByRole("button", { name: "Find" }).click();
  await page.waitForURL("**/m/**");
  await expect(page.getByText(/^Meter /).first()).toBeVisible();
}

/** Fake client IP so a test gets its own rate-limit bucket (the app trusts x-forwarded-for). */
export const fromIp = (ip: string) => ({ "x-forwarded-for": ip });
