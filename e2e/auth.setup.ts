import { test as setup } from "@playwright/test";

import { ADMIN, AUTH, CUSTOMER, fromIp, signIn } from "./helpers";

// Sign in once per role and reuse the session, so tests don't trip the sign-in rate limit.
setup("sign in as customer", async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: fromIp("10.1.0.1") });
  await signIn(await ctx.newPage(), CUSTOMER);
  await ctx.storageState({ path: AUTH.customer });
  await ctx.close();
});

setup("sign in as admin", async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: fromIp("10.1.0.2") });
  await signIn(await ctx.newPage(), ADMIN);
  await ctx.storageState({ path: AUTH.admin });
  await ctx.close();
});
