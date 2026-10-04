# VoltPay ⚡

**Scan. Pay. Done.** — pay your electricity bill by scanning the QR code on your meter.

VoltPay V2 is a secure, installable web app (PWA) built with Next.js. The full plan, including the V1 audit and the delivery phases, is in [`docs/PLAN_V2.md`](docs/PLAN_V2.md).

> **Prototype:** billing data is simulated and payments run in Razorpay **test mode**. No real money moves.

## Status

| Phase | Scope                                                               | Status  |
| ----- | ------------------------------------------------------------------- | ------- |
| 0     | Housekeeping: V1 archived to `legacy/v1/` (tag `v1.0`)              | ✅ Done |
| 1     | Foundation: Next.js 16, Postgres + Drizzle, Better Auth, roles, CI  | ✅ Done |
| 2     | Core flow: meters, signed QR, scanner, bills, Razorpay, receipts    | ✅ Done |
| 3     | Customer features: link meters, bills, usage chart, complaints      | ✅ Done |
| 4     | Admin console: meters, billing cycle, tariffs, complaints, audit    | ✅ Done |
| 5     | PWA (installable, offline page), reminder emails, contact inbox     | ✅ Done |
| 6     | Hardening & launch: CSP, rate limits, E2E + a11y tests, deploy docs | ✅ Done |

## Tech stack

Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS 4 + shadcn/ui-style components · PostgreSQL · Drizzle ORM · Better Auth · Zod · Vitest · GitHub Actions. Runtime: Node.js 24 LTS.

## Getting started

**Prerequisites:** Node.js 24+ and a free [Neon](https://neon.tech) Postgres database (create a project, then copy its connection string).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    then set DATABASE_URL (Neon), BETTER_AUTH_SECRET and QR_SIGNING_SECRET
#    (generate each with: openssl rand -base64 32)
#    and, when you have them, RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (test mode)

# 3. Create tables, demo accounts and demo meters/bills
npm run db:migrate
npm run db:seed

# 4. Run the app
npm run dev        # http://localhost:3000
```

> No Docker needed. A local Postgres via `docker compose up -d` also works if you prefer (use the `DATABASE_URL` from `docker-compose.yml`).

### Trying the payment flow

1. Sign in as admin → **Admin → View meter QR codes**, then scan one from your phone (the camera needs HTTPS or `localhost`; on a laptop you can also use the consumer-number box on `/scan`, e.g. `VP-2024-000101`).
2. Review the bill and pay. Until real Razorpay keys are set in `.env.local`, a **simulated checkout** is used (development only; it is disabled in production). With real test keys, the Razorpay checkout opens (use Razorpay's [test cards / UPI](https://razorpay.com/docs/payments/payments/test-card-details/)).
3. You'll land on the receipt page with a PDF download.
4. Bills are consumed by paying. Run `npm run db:seed -- --fresh` to reset the demo data, or sign in as admin and use **Billing → Run billing cycle** to create the next bills.

### Demo accounts (local only)

| Role     | Email                   | Password         |
| -------- | ----------------------- | ---------------- |
| Admin    | `admin@voltpay.test`    | `Admin@12345`    |
| Customer | `customer@voltpay.test` | `Customer@12345` |

In production, set `SEED_*` variables instead; the seed script refuses default passwords there.

### Installable app & reminders

- **Install as an app:** the service worker only registers in a production build, so try it with `npm run build && npm start`, then open the site on your phone/Chrome and choose _Install app_ (button in the footer) or _Add to Home Screen_. Offline, the app shows the last bill you viewed on that device (amount, due date, meter number only; cleared on sign-out).
- **Reminder emails:** a daily job (Vercel Cron → `/api/cron/daily`, protected by `CRON_SECRET`) marks past-due bills overdue and emails customers 3 days before the due date and once when overdue (each at most once; customers can turn them off on their profile). Without `RESEND_API_KEY`, emails are printed to the server console in development. Admins can run the job from **Admin → Billing → Run daily job now**.
- **Contact form:** public `/contact` page (rate-limited, honeypot) → **Admin → Inbox**.

## Scripts

| Command                                           | What it does                                       |
| ------------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                     | Dev server with hot reload                         |
| `npm run build` / `npm start`                     | Production build / serve                           |
| `npm run lint` · `npm run typecheck` · `npm test` | Quality checks (also run in CI)                    |
| `npm run e2e`                                     | Browser tests (Playwright) incl. accessibility     |
| `npm run format`                                  | Format with Prettier                               |
| `npm run db:generate`                             | Create a migration after editing `src/db/schema/*` |
| `npm run db:migrate`                              | Apply migrations                                   |
| `npm run db:seed`                                 | Create demo accounts                               |
| `npm run db:studio`                               | Browse the database in Drizzle Studio              |

## Project structure

```
src/
  app/            routes: /, /login, /signup, /dashboard, /meters/*, /payments, /complaints, /profile, /scan, /m/[code], /receipts/[id], /admin/* (meters, billing, bills, payments, tariffs, complaints, audit, qr), /api/auth/*, /api/webhooks/razorpay
  components/     UI (components/ui = shadcn-style primitives)
  db/             Drizzle schema, migrations, connection
  lib/            auth (server + client), env validation, utils
  server/         server-only logic: authorization helpers, services
  proxy.ts        optimistic auth redirect for protected routes
tests/unit/       Vitest unit tests
legacy/v1/        original V1 prototype (Express + SQLite), reference only
docs/             V2 plan, original plan PDF, legal notes
```

## Testing

`npm test` runs the unit tests. `npm run e2e` runs the browser tests against a dev server and re-seeds the database first, so point `DATABASE_URL` at a throw-away database, not data you care about. First time only: `npx playwright install chromium`. The suite covers the guest scan→pay→receipt flow, the customer area, the admin console, security headers, and WCAG A/AA accessibility checks on every main page.

## Deploying

See [`docs/DEPLOY.md`](docs/DEPLOY.md) (Vercel + Neon + Razorpay + Resend, backups) and [`docs/DEMO.md`](docs/DEMO.md) (the demo script).

## Security notes

- Every protected page/action calls `requireUser()` / `requireAdmin()` from `src/server/authz.ts`. `proxy.ts` is only a fast redirect, not the security boundary.
- Sessions use httpOnly cookies. Sign-in, sign-up, meter lookups and payment creation are rate-limited, with the limits stored in Postgres.
- A per-request-nonce Content-Security-Policy (set in `src/proxy.ts`) blocks injected scripts; Razorpay's checkout is explicitly allowed.
- QR codes are random 128-bit tokens signed with HMAC; forged or edited codes are rejected before any database lookup. People who aren't linked to a meter see a masked name and no street address.
- Payment amounts always come from the database. Razorpay checkout signatures and webhooks are verified with HMAC; payment capture is idempotent and one captured payment per bill is enforced by a database index.
- All money is stored as integer paise. Tariffs in the demo data are illustrative, not real DISCOM rates.
- Secrets come only from environment variables, validated at startup by `src/lib/env.ts`.
- Never commit `.env.local` or any `*.db` file. The V1 database contained real contact details and is deliberately git-ignored.

## Adding UI components

`components.json` is configured for shadcn/ui, so you can run `npx shadcn@latest add dialog` (for example) to add more components.
