# VoltPay ⚡

**Scan. Pay. Done.** — pay your electricity bill by scanning the QR code on your meter.

VoltPay V2 is a secure, installable web app (PWA) built with Next.js. The full plan, including the V1 audit and the delivery phases, is in [`docs/PLAN_V2.md`](docs/PLAN_V2.md).

> **Prototype:** billing data is simulated and payments run in Razorpay **test mode**. No real money moves.

## Status

| Phase | Scope                                                              | Status  |
| ----- | ------------------------------------------------------------------ | ------- |
| 0     | Housekeeping: V1 archived to `legacy/v1/` (tag `v1.0`)             | ✅ Done |
| 1     | Foundation: Next.js 16, Postgres + Drizzle, Better Auth, roles, CI | ✅ Done |
| 2     | Core flow: meters, signed QR, scanner, bills, Razorpay, receipts   | ⏳ Next |
| 3     | Customer features                                                  | —       |
| 4     | Admin console                                                      | —       |
| 5     | PWA & reminders                                                    | —       |
| 6     | Hardening & launch                                                 | —       |

## Tech stack

Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS 4 + shadcn/ui-style components · PostgreSQL · Drizzle ORM · Better Auth · Zod · Vitest · GitHub Actions. Runtime: Node.js 24 LTS.

## Getting started

**Prerequisites:** Node.js 24+, and either Docker Desktop (for the local database) or a free [Neon](https://neon.tech) Postgres database.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    then set BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)
#    and DATABASE_URL if you're not using the Docker default

# 3. Start Postgres (skip if using Neon)
docker compose up -d

# 4. Create tables and demo accounts
npm run db:migrate
npm run db:seed

# 5. Run the app
npm run dev        # http://localhost:3000
```

### Demo accounts (local only)

| Role     | Email                   | Password         |
| -------- | ----------------------- | ---------------- |
| Admin    | `admin@voltpay.test`    | `Admin@12345`    |
| Customer | `customer@voltpay.test` | `Customer@12345` |

In production, set `SEED_*` variables instead; the seed script refuses default passwords there.

## Scripts

| Command                                           | What it does                                       |
| ------------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                     | Dev server with hot reload                         |
| `npm run build` / `npm start`                     | Production build / serve                           |
| `npm run lint` · `npm run typecheck` · `npm test` | Quality checks (also run in CI)                    |
| `npm run format`                                  | Format with Prettier                               |
| `npm run db:generate`                             | Create a migration after editing `src/db/schema/*` |
| `npm run db:migrate`                              | Apply migrations                                   |
| `npm run db:seed`                                 | Create demo accounts                               |
| `npm run db:studio`                               | Browse the database in Drizzle Studio              |

## Project structure

```
src/
  app/            routes: /, /login, /signup, /dashboard, /admin, /api/auth/*
  components/     UI (components/ui = shadcn-style primitives)
  db/             Drizzle schema, migrations, connection
  lib/            auth (server + client), env validation, utils
  server/         server-only logic: authorization helpers, services
  proxy.ts        optimistic auth redirect for protected routes
tests/unit/       Vitest unit tests
legacy/v1/        original V1 prototype (Express + SQLite), reference only
docs/             V2 plan, original plan PDF, legal notes
```

## Security notes

- Every protected page/action calls `requireUser()` / `requireAdmin()` from `src/server/authz.ts`. `proxy.ts` is only a fast redirect, not the security boundary.
- Sessions use httpOnly cookies. Sign-in and sign-up are rate-limited and the limits are stored in Postgres.
- Secrets come only from environment variables, validated at startup by `src/lib/env.ts`.
- Never commit `.env.local` or any `*.db` file. The V1 database contained real contact details and is deliberately git-ignored.

## Adding UI components

`components.json` is configured for shadcn/ui, so you can run `npx shadcn@latest add dialog` (for example) to add more components.
