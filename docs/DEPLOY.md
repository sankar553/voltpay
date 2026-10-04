# Deploying VoltPay (Vercel + Neon)

Everything here uses free tiers. Do the steps in order; the whole thing takes about 30 minutes.

## 1. Accounts

| Service            | Used for                  | Needed?                                                  |
| ------------------ | ------------------------- | -------------------------------------------------------- |
| GitHub             | the repo                  | yes (already set up)                                     |
| Neon               | Postgres database         | yes                                                      |
| Vercel             | hosting + daily cron      | yes                                                      |
| Razorpay (test)    | payments                  | yes — payments don't work in production without the keys |
| Resend             | reminder emails           | optional (reminders are skipped without it)              |

## 2. Database (Neon)

You already use Neon for development. For the live site, either reuse that database (fine for the semester demo) or, better, create a second branch/project called `production` so demo experiments never touch live data.

Use the **pooled** connection string (the host contains `-pooler`) and keep `?sslmode=verify-full&channel_binding=require` at the end.

Apply the tables once from your computer (PowerShell):

```powershell
$env:DATABASE_URL = "<neon connection string>"
npm run db:migrate
```

Create the admin account and demo meters (use your own admin password, 12+ characters; the seed refuses the default one in production):

```powershell
$env:NODE_ENV = "production"
$env:BETTER_AUTH_SECRET = "<same value you will set on Vercel>"
$env:BETTER_AUTH_URL = "https://<your-domain>"
$env:NEXT_PUBLIC_APP_URL = "https://<your-domain>"
$env:QR_SIGNING_SECRET = "<same value you will set on Vercel>"
$env:SEED_ADMIN_EMAIL = "you@example.com"
$env:SEED_ADMIN_PASSWORD = "<strong password>"
$env:SEED_CUSTOMER_EMAIL = "demo.customer@example.com"
$env:SEED_CUSTOMER_PASSWORD = "<another strong password>"
npm run db:seed
```

## 3. Vercel

1. Vercel → **Add New → Project** → import `sankar553/voltpay`. Framework: Next.js (auto-detected). Node.js version: 24.x (Project Settings → General).
2. Add these **Environment Variables** (Production):

   | Name                      | Value                                                                                 |
   | ------------------------- | ------------------------------------------------------------------------------------- |
   | `DATABASE_URL`            | Neon pooled connection string                                                         |
   | `BETTER_AUTH_SECRET`      | `openssl rand -base64 32` (any 32+ character random string)                           |
   | `BETTER_AUTH_URL`         | `https://<your-domain>`                                                               |
   | `NEXT_PUBLIC_APP_URL`     | `https://<your-domain>` (it is baked in at build time, so redeploy after changing it) |
   | `QR_SIGNING_SECRET`       | another random 32+ characters. Changing it later invalidates every printed sticker    |
   | `RAZORPAY_KEY_ID`         | `rzp_test_…` (test mode)                                                              |
   | `RAZORPAY_KEY_SECRET`     | the matching test secret                                                              |
   | `RAZORPAY_WEBHOOK_SECRET` | from step 4                                                                           |
   | `CRON_SECRET`             | random 32+ characters (Vercel sends it to the cron route automatically)               |
   | `RESEND_API_KEY`          | optional, from step 5                                                                 |
   | `EMAIL_FROM`              | optional, e.g. `VoltPay <onboarding@resend.dev>`                                      |

3. **Deploy.** The first deploy gives you a `https://<project>.vercel.app` address. If you used a placeholder for the two URL variables, set the real address now and **redeploy**.
4. Open `https://<your-domain>/api/health` — it should say `{"ok":true}`.

## 4. Razorpay (test mode)

1. Dashboard → switch to **Test Mode** → Account & Settings → **API Keys** → generate. Put the key id and secret in Vercel.
2. Account & Settings → **Webhooks → Add**: URL `https://<your-domain>/api/webhooks/razorpay`, events `payment.captured` and `payment.failed`, and a secret you invent. Put that secret in `RAZORPAY_WEBHOOK_SECRET` and redeploy.
3. Test pay with UPI id `success@razorpay` (or Razorpay's [test cards](https://razorpay.com/docs/payments/payments/test-card-details/)).

If the Razorpay window does not open, open the browser console. A message starting "Refused to …" names a host the Content-Security-Policy blocked; add it in `src/proxy.ts` (`RAZORPAY` / `buildCsp`).

## 5. Emails (optional)

Create a Resend API key and set `RESEND_API_KEY`. With the default `onboarding@resend.dev` sender, Resend only delivers to the email address of your own Resend account; to email other people, verify a domain in Resend and set `EMAIL_FROM` to an address on it.

The daily job (`vercel.json`) runs at 02:30 UTC (08:00 IST). Test it any time from **Admin → Billing → Run daily job now**.

## 6. Smoke test (after every deploy)

1. `/api/health` is OK, the home page loads over HTTPS.
2. Sign in as admin → **Admin → Billing → Run billing cycle**.
3. Open `/scan`, enter a consumer number, pay with `success@razorpay`, and check the receipt PDF.
4. Install the app on a phone (see `docs/DEMO.md`).

## 7. Backups and recovery

- Neon keeps a point-in-time restore history for your project (how far back depends on your plan, so check it in the Neon console under Backup & Restore). Restoring to a new branch is the safest way to recover from a mistake.
- Before a risky change, take your own copy: `pg_dump "<neon connection string>" --no-owner -f voltpay-backup.sql` (the backup contains customer data — keep it private and never commit it).
- A bad deploy can be undone in Vercel → Deployments → **Instant Rollback**.

## 8. Before showing it to real people

- Change or remove the seeded demo accounts, and use strong, unique passwords for admins.
- Billing data is simulated and payments are in Razorpay test mode. The footer says so; keep it until you have a real DISCOM agreement and a live Razorpay account.
- Keep `.env.local` out of Git (it already is), and rotate any secret that was ever pasted into a chat or screenshot.
