# VoltPay V2.0 — Project Plan

> **Scan. Pay. Done.** — Smart QR electricity-bill payment system
> Plan version: 2.0 · Created: 2 Oct 2026 · Supersedes: `Older_VoltPay_Plan.pdf` (V1 / "PowerScan")

---

## 1. Goal of V2

Turn the V1 demo into a **polished, secure, deployed prototype** that works for both:

- **Semester evaluation** — the full customer flow and admin dashboard work end-to-end with simulated DISCOM data.
- **Startup pitch** — a live URL that investors or a DISCOM (e.g. APSPDCL) can open on a phone, scan a meter QR, pay through a real checkout (test mode), and get a real receipt.

**Delivery form:** responsive web app + installable **PWA** (Add to Home Screen, camera scanning, offline last-bill view). No separate native app in V2.

**Payments:** **Razorpay in test mode**: the real checkout UI, server-side signature verification and webhooks, with no real money.

---

## 2. What V2 fixes (from the V1 audit)

| # | V1 problem | V2 resolution |
|---|---|---|
| 1 | HTTPS broken (`selfsigned` v5 returns a Promise; crashes when no LAN IP) | Deployed on HTTPS hosting; local phone testing via a tunnel. No self-signed certs in app code. |
| 2 | Almost every API is public (payment history, all meters, admin stats, feedback PII) | Every route goes through auth + role checks; deny-by-default. |
| 3 | `DELETE /api/contact` wipes all feedback with no login | Admin-only, soft delete, written to audit log. |
| 4 | Anyone can register meters (`POST /bills/add`) | Meter creation is admin-only. |
| 5 | QR scan returns name + address to anyone; IDs sequential (`QR-AP-VJA-001`) | Random, signed QR tokens; public scan shows **masked** data only. |
| 6 | Users and meters not linked | `user_meters` link table with ownership verification. |
| 7 | No meter readings; units are random | `meter_readings` table; units = current − previous reading. |
| 8 | Flat rate per unit, no slabs | `tariffs` table with slab-based calculation (illustrative tariff, configurable). |
| 9 | Usage chart uses a separate random table | Usage derived from real readings/bills. |
| 10 | Receipt lives in `sessionStorage`; "Download" = print | Permanent receipt page `/receipts/[id]` + generated PDF. |
| 11 | Payment always "success"; insert + status update not atomic | Gateway-verified payments, DB transaction, idempotent webhook handling. |
| 12 | Money stored as floats | All money stored as **integer paise**. |
| 13 | Hardcoded JWT secret fallback | Secrets only from environment; app refuses to start without them. |
| 14 | No reminders, complaints page, profile page | Built in Phases 3–5. |
| 15 | Admin = feedback inbox only | Full role-based admin console. |
| 16 | QR page hardcodes 5 meters | QR generated per meter from DB; printable sticker sheet. |
| 17 | No validation, rate limiting, tests, backups | Zod validation, rate limits, Vitest + Playwright, managed DB backups. |
| 18 | Demo bills get "used up" | One-command `db:seed` / `db:reset` + admin "generate billing cycle". |
| 19 | Name split (VoltPay vs PowerScan), empty README | One brand everywhere, full README. |

---

## 3. Tech stack (current as of Oct 2026)

One language (TypeScript) end to end: one repo, one deploy.

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js 24 LTS** (move to Node 26 after it becomes Active LTS on 28 Oct 2026) | Current supported LTS line |
| Framework | **Next.js 16** (App Router, React 19, Server Actions, Route Handlers) | Frontend + backend API in one project; the current supported major |
| Language | **TypeScript** (strict) | Catches bugs early; shared types between UI and API |
| UI | **Tailwind CSS 4** + **shadcn/ui** | Fast, consistent, accessible components |
| Database | **PostgreSQL 18** (local via Docker; hosted on **Neon** free tier) | Real relational DB with transactions, constraints, JSONB |
| ORM / migrations | **Drizzle ORM** + `drizzle-kit` | SQL-like, type-safe, tiny bundle, versioned migrations. (Prisma 7 is an acceptable alternative.) |
| Auth | **Better Auth** (email + password, sessions, admin/roles plugin, built-in rate limiting) | Self-hosted, TypeScript-first, actively maintained |
| Validation | **Zod** | One schema validates forms, API input and env vars |
| Payments | **Razorpay** (test mode): Orders API + Checkout + signature verify + webhooks | Standard Indian gateway; supports UPI, cards, net-banking |
| QR generation | `qrcode` (npm) | Server-side PNG/SVG for meter stickers |
| QR scanning | Native **BarcodeDetector** API, with **zxing-wasm** fallback | Fast on Android/Chrome; works on iOS Safari via fallback |
| Charts | **Recharts** | Usage and admin charts |
| PDF receipts | **@react-pdf/renderer** | Receipt PDFs from React components |
| PWA | **Serwist** (service worker) + web app manifest | Approach referenced in the Next.js PWA guide for Next 16 |
| Email | **Resend** (free tier) | Due-date reminder emails |
| Scheduled jobs | **Vercel Cron** → protected route | Daily reminder + overdue marking job |
| Testing | **Vitest** (unit) + **Playwright** (end-to-end) | Tariff math unit tests; full scan→pay→receipt E2E |
| Quality | ESLint, Prettier, GitHub Actions CI | Lint + typecheck + tests on every push |
| Hosting | **Vercel** (app) + **Neon** (Postgres) | Free tiers, HTTPS by default, preview deploys per PR |

> Pin exact versions in `package.json` when scaffolding (Phase 1) and record them in the README.

---

## 4. Architecture

```
 Phone / Browser (PWA)
   │  scan QR  → https://<domain>/m/<token>
   ▼
 Next.js 16 app (Vercel)
   ├─ Pages (React Server Components + client components)
   ├─ Server Actions / Route Handlers  (/api/...)
   │    ├─ auth (Better Auth)        ├─ bills / tariff engine
   │    ├─ meters / QR tokens        ├─ payments (Razorpay orders, verify)
   │    ├─ complaints                ├─ admin (role = admin)
   │    └─ webhooks/razorpay  ◄────── Razorpay servers
   ├─ Cron: /api/cron/daily  (reminders, mark overdue)
   ▼
 PostgreSQL 18 (Neon) — via Drizzle ORM
```

**Rules**
- All business logic lives in `src/server/` services, never in UI components.
- Every handler: validate input (Zod) → check session → check role/ownership → act in a DB transaction → write audit log.
- The client never sends an amount; the server always computes it from the bill.

---

## 5. QR code design (secure)

- Each meter gets a **random 128-bit token** (`qr_token`), stored in DB, **not** derived from meter/consumer number.
- QR content = URL: `https://<domain>/m/<token>.<hmac>`. The HMAC is signed with a server secret, so forged or edited QRs are rejected before any DB lookup.
- The in-app scanner only accepts URLs on our domain. Anything else shows a "Not a VoltPay meter QR" warning, which protects against fake stickers that point to phishing sites.
- **Public (not logged in) scan** shows only: masked consumer name (`R**** K**** R****`), district, bill month, amount, due date. The user can still pay (paying someone's bill is allowed, as in BBPS).
- **Owner (linked, logged in)** sees full details, history and usage.
- Admin can **revoke/rotate** a meter's token (sticker damaged or copied); old QR stops working.
- Scan endpoint is rate-limited per IP to stop token guessing.

---

## 6. Data model (PostgreSQL)

Money = `integer` paise. Timestamps = `timestamptz`. IDs = `uuid` (public) unless noted.

| Table | Key fields |
|---|---|
| `user` / `session` / `account` / `verification` | Managed by Better Auth. `user.role` ∈ `customer`, `admin` |
| `profiles` | `user_id` FK, phone, address, notification prefs |
| `meters` | `id`, `meter_number` (unique), `consumer_number` (unique), `qr_token` (unique), `qr_token_rotated_at`, consumer_name, address, district, `connection_type` (domestic/commercial), `sanctioned_load_kw`, `status` (active/disconnected) |
| `user_meters` | `user_id` FK, `meter_id` FK, `relation` (owner/family/tenant), `verified_at` — PK(user_id, meter_id) |
| `tariffs` | `id`, connection_type, `effective_from`, `slabs` JSONB `[{upto_units, paise_per_unit}]`, `fixed_charge_paise`, `duty_bps` |
| `meter_readings` | `id`, `meter_id` FK, `reading_kwh`, `read_at`, `source` (simulated/manual/smart) |
| `bills` | `id`, `bill_number` (unique), `meter_id` FK, `tariff_id` FK, `period_start`, `period_end`, `previous_reading_id` FK, `current_reading_id` FK, `units`, `energy_paise`, `fixed_paise`, `duty_paise`, `adjustment_paise`, `total_paise`, `due_date`, `status` (unpaid/paid/overdue/cancelled) |
| `payments` | `id`, `bill_id` FK, `user_id` FK nullable (guest), `amount_paise`, `gateway` (razorpay), `gateway_order_id` (unique), `gateway_payment_id` (unique), `method`, `status` (created/authorized/captured/failed/refunded), `receipt_number` (unique), `created_at`, `captured_at` |
| `webhook_events` | `id`, `provider`, `event_id` (unique → idempotency), `type`, `payload` JSONB, `processed_at` |
| `complaints` | `id`, `user_id` FK, `meter_id` FK, `category` (billing/meter fault/supply/other), `description`, `status` (open/in_progress/resolved), `admin_note`, timestamps |
| `notifications` | `id`, `user_id`, `bill_id`, `channel` (email/push), `kind` (due_soon/overdue/payment), `sent_at` |
| `push_subscriptions` | `user_id`, `endpoint`, keys |
| `contact_messages` | public contact form; `deleted_at` (soft delete) |
| `audit_log` | `actor_user_id`, `action`, `entity`, `entity_id`, `meta` JSONB, `ip`, `created_at` |

**Key constraints**
- Partial unique index: only **one captured payment per bill** (`UNIQUE(bill_id) WHERE status = 'captured'`).
- `bills.units = current.reading_kwh − previous.reading_kwh` checked at creation; must be ≥ 0.

Relationship chain (fulfils V1 plan §8): **User ⇄ Meter (via user_meters) → Readings → Bills → Payments → Receipt**.

---

## 7. Bill calculation

```
units      = current_reading − previous_reading
energy     = Σ over slabs (units in slab × slab rate)
fixed      = tariff.fixed_charge (by connection type / load)
duty       = energy × duty_bps / 10000
total      = energy + fixed + duty + adjustments          (all in paise, rounded once)
```

- Tariff slabs are **illustrative demo values** stored in the `tariffs` table and editable by admin. Real tariffs must come from the authorised regulator/DISCOM.
- The tariff engine is a pure function → fully unit-tested (boundary units, zero usage, commercial vs domestic).
- Overdue bills: daily cron marks `overdue` after due date (optional late fee as an `adjustment`).

---

## 8. Payment & receipt flow (Razorpay test mode)

1. Customer taps **Pay** on a bill → server checks bill is `unpaid/overdue`, creates a **Razorpay Order** for `total_paise`, saves `payments(status=created)`.
2. Browser opens **Razorpay Checkout** with the `order_id` (test UPI / test cards).
3. On success, browser sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to server.
4. Server **verifies the HMAC-SHA256 signature** with the key secret, then in **one DB transaction**: payment → `captured`, bill → `paid`, receipt number assigned, audit log written.
5. **Webhook** `payment.captured` / `payment.failed` is also handled (signature-verified, deduplicated via `webhook_events`) so the result is correct even if the user closes the tab.
6. User lands on `/receipts/[id]` → permanent receipt page + **Download PDF** + share.
7. Confirmation email sent (Resend).

No service fee in V2 (removed; can be reintroduced as a business decision).

---

## 9. Features & screens

### Customer
| Screen | Route | Notes |
|---|---|---|
| Landing | `/` | Brand, how it works, CTA to scan |
| Sign up / Login | `/login`, `/signup` | Email + password; optional phone |
| Scanner | `/scan` | Camera scan + manual consumer-number entry fallback |
| Meter bill (from QR) | `/m/[token]` | Masked for public, full for owner |
| Payment | Razorpay Checkout overlay | Test mode |
| Receipt | `/receipts/[id]` | Page + PDF |
| Dashboard | `/dashboard` | Linked meters, current dues, due-date banner |
| Link a meter | `/meters/link` | Scan QR or enter consumer no. + verify via last bill amount (demo verification) |
| Bill history | `/meters/[id]/bills` | All bills with status filters |
| Payment history | `/payments` | Only the user's own payments |
| Usage | `/meters/[id]/usage` | Monthly kWh chart, average, trend vs last month |
| Complaints | `/complaints`, `/complaints/new` | Raise + track status |
| Profile & settings | `/profile` | Details, password, reminder preferences, push opt-in |

### Admin (`role = admin`)
| Screen | Purpose |
|---|---|
| Overview | Revenue (test), payments today, pending/overdue bills, open complaints (charts) |
| Meters | Create/edit meters, rotate QR token, print QR sticker sheet (PDF) |
| Readings & billing | Enter readings or **"Run billing cycle"** (simulated readings → bills) |
| Tariffs | Edit slabs / fixed charges |
| Bills & payments | Search, view, refund (test mode) |
| Complaints | Queue, assign status, add notes |
| Contact messages | Inbox (soft delete) |
| Audit log | Who did what, when |

### Future scope (not in V2)
Smart-meter integration, real DISCOM/BBPS integration, outage map & reporting, multi-provider support, native app, multi-language (Telugu/Hindi), live payments (KYC + Razorpay live keys).

---

## 10. Security requirements (V2 checklist)

- [ ] HTTPS everywhere (Vercel); HSTS header.
- [ ] Better Auth sessions in **httpOnly, Secure, SameSite** cookies (no tokens in `localStorage`).
- [ ] Deny-by-default authorization helper: `requireUser()`, `requireAdmin()`, `requireMeterAccess(meterId)`.
- [ ] Zod validation on every input; never trust client amounts.
- [ ] Rate limiting: login/signup, scan endpoint, payment creation, contact form.
- [ ] Razorpay signature verification + webhook signature verification + idempotency.
- [ ] Signed, rotatable QR tokens; masked public data.
- [ ] Security headers: CSP, X-Content-Type-Options, Referrer-Policy, frame-ancestors.
- [ ] Generic error messages to clients; details only in server logs.
- [ ] Secrets only in env vars (`.env.local` git-ignored; Vercel env settings); env validated with Zod at startup.
- [ ] Audit log for admin actions and payment state changes.
- [ ] Neon automated backups / point-in-time restore; documented restore steps.
- [ ] Dependency checks (`npm audit`, Dependabot) in CI.
- [ ] No real customer PII in seed data (current V1 DB contains real emails; do not migrate it).

---

## 11. Repository layout

```
voltpay/
├─ legacy/v1/            # V1 code moved here for reference (tag v1.0 also kept)
├─ docs/
│  ├─ PLAN_V2.md         # this file
│  └─ Older_VoltPay_Plan.pdf
├─ src/
│  ├─ app/               # Next.js routes (customer, admin, api, webhooks, cron)
│  ├─ components/        # UI (shadcn/ui)
│  ├─ server/            # services: auth, meters, qr, tariff, bills, payments, complaints, audit
│  ├─ db/                # Drizzle schema, migrations, seed
│  └─ lib/               # shared utils, zod schemas, env
├─ tests/                # vitest unit + playwright e2e
├─ public/               # icons, manifest
├─ .github/workflows/ci.yml
└─ README.md
```

---

## 12. Delivery phases

Each phase ends with: working build, passing CI, a commit + push, and a short demo note in the README changelog.

| Phase | Scope | Done when |
|---|---|---|
| **0. Housekeeping** | Tag current code `v1.0`; move V1 into `legacy/v1/`; move plan PDF to `docs/`; decide brand name | Tag pushed; repo restructured |
| **1. Foundation** | Scaffold Next.js 16 + TS + Tailwind + shadcn; Drizzle + Postgres (Docker local, Neon cloud); env validation; Better Auth (signup/login/logout, roles); CI pipeline; deploy skeleton to Vercel | Can sign up/log in on the live URL; CI green |
| **2. Core flow** | Schema + migrations + seed; tariff engine (+ unit tests); meters & signed QR tokens; scanner page; `/m/[token]` bill view; Razorpay order → checkout → verify → webhook; receipt page + PDF | Scan demo QR on a phone → pay with Razorpay test UPI → receipt PDF |
| **3. Customer features** | Dashboard, link meter, bill history, payment history, usage chart, complaints, profile | All customer screens in §9 work with own-data-only access |
| **4. Admin console** | Overview stats, meters CRUD + QR sheet, readings & "run billing cycle", tariffs, bills/payments, complaints queue, contact inbox, audit log | Admin can run a full billing month for the demo |
| **5. PWA & reminders** | Serwist service worker, manifest, install prompt, offline last-bill view; daily cron → due-soon/overdue emails; optional web push | Installs on Android; reminder email received in test |
| **6. Hardening & launch** | Rate limits, headers/CSP, Playwright E2E for full flow, accessibility pass, README + demo script, seed reset, backups note | E2E green; demo script runs start-to-finish on live URL |

Suggested pace: ~1–1.5 weeks per phase (≈ 8–10 weeks total), adjustable to the semester calendar.

---

## 13. Demo script (target for evaluation & pitch)

1. Open the live URL on a phone → **Install** the app.
2. Scan a printed meter QR → masked bill shown → **Log in** → full details appear.
3. **Pay** with Razorpay test UPI → success → **receipt PDF** downloaded.
4. Dashboard: bill marked paid, usage chart, history.
5. Raise a **complaint**.
6. Switch to **admin**: see the payment, the complaint, run the next billing cycle → new bill appears for the customer, reminder email goes out.

---

## 14. Environment variables

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
QR_SIGNING_SECRET=
RAZORPAY_KEY_ID=            # test key (rzp_test_...)
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RESEND_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

---

## 15. Open decisions

1. **Brand name:** VoltPay or PowerScan? (V1 uses both; the repo is `voltpay`.)
2. **Domain** for the live demo (Vercel subdomain is fine for the semester).
3. **Accounts needed from you:** Vercel, Neon, Razorpay (test mode), Resend — all free tiers; connect them to the GitHub repo.
4. Keep `legacy/v1/` in the repo permanently, or remove it after V2 ships (the `v1.0` tag preserves it either way).
