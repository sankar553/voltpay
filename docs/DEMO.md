# VoltPay demo script (about 8 minutes)

For the semester evaluation and the startup pitch. Everything runs on the live URL; billing data is simulated and payments are in test mode.

## Before you start (5 minutes, the day before and again 15 minutes before)

- [ ] `/api/health` says `{"ok":true}`; the live site loads over HTTPS.
- [ ] Reset the demo data: `npm run db:seed -- --fresh` (pointed at the live database, see `docs/DEPLOY.md`). This restores the sample meters and bills and clears old complaints, messages and the audit log.
- [ ] Print the meter stickers: sign in as admin → **Admin → Meters → QR sheet**. Print at least `MTR1001` (the demo customer's meter) and `MTR1002`.
- [ ] Phone: Chrome (Android) or Safari (iPhone), camera allowed. Sign out of any old accounts.
- [ ] Test the Razorpay test payment once with `success@razorpay`.
- [ ] Have a backup: a screen recording of the full flow, in case the venue's Wi-Fi fails.

Demo logins (from the seed, change them for the live site): `customer@voltpay.test` / `admin@voltpay.test` (passwords in your seed settings).

## The story (30 seconds)

"Paying an electricity bill today means a portal, a login, and a consumer number you have to find on an old bill. VoltPay puts a QR code on the meter. Scan, see the bill, pay, done — and the utility gets a full admin console behind it."

## The flow

1. **Install** — open the live URL on the phone. Tap **Install app** in the footer (Android) or Share → **Add to Home Screen** (iPhone). Point out that it opens like a normal app and shows your last bill even offline.
2. **Scan** — tap **Scan a meter**, scan the printed `MTR1002` sticker. A masked bill appears (name shown as `A**** S*****`): anyone can pay a bill without logging in, but nobody sees private details.
3. **Log in** — sign in as the demo customer, open the `MTR1001` sticker: now the full details appear, because this account owns that meter.
4. **Pay** — tap **Pay ₹…**, choose UPI, use `success@razorpay`. You land on a receipt page; tap **Download PDF**.
5. **Dashboard** — the bill is now paid. Show **Bill history** and the **Usage** chart (hover a bar, or press **Show table**).
6. **Complaint** — **Complaints → New complaint**: "Meter display is blank". Submit it.
7. **Switch to admin** (second browser window) — **Admin → Complaints**: answer it and mark it resolved; refresh the customer's complaints page and show the reply. **Admin → Payments** shows the payment. **Admin → Billing → Run billing cycle** creates the next bills; the customer's dashboard now shows a new bill. **Run daily job now** sends reminder emails for bills that are due soon.
8. **Audit log** — **Admin → Audit log**: every admin action is recorded with who did it.

## Talking points: what changed from V1 (good for questions)

- Every page and action checks login and role on the server; customers get a 404 on admin pages and on other people's meters.
- QR codes are random and signed (not guessable); an admin can rotate a damaged or copied sticker and the old one stops working.
- Amounts always come from the database, never from the browser; payments are verified with Razorpay's signature and webhook, and a bill can be paid only once.
- Money is stored as whole paise, with slab tariffs (editable by admin) and unit tests for the maths.
- Passwords are hashed, sign-in and lookups are rate-limited, and a strict Content-Security-Policy is on.
- It is a real PWA (installable, offline page), has reminder emails, an automated test suite (unit + end-to-end + accessibility), and deploys on every push through GitHub, Vercel and Neon.

## If something goes wrong

| Problem                                  | Do this                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Camera won't scan                        | Use "Can't scan? Enter your consumer number" under the camera (`VP-2024-000101`)       |
| Razorpay window doesn't open             | Check the keys are test keys; check the browser console (see `docs/DEPLOY.md` step 4) |
| No bill to pay                           | Admin → Billing → **Run billing cycle**, or re-seed with `--fresh`                     |
| "Too many attempts" after repeated tries | Wait a minute (rate limit) — this is intentional                                       |
| Site down                                | Show the screen recording; check `/api/health` and the Vercel deployment logs          |

## Pitch angle (30 seconds at the end)

Problem: bill payment is clumsy and utilities field endless "where do I pay" and "what is my consumer number" calls. Solution: the meter itself is the entry point. Next steps: real DISCOM billing integration (BBPS), smart-meter readings, SMS/WhatsApp reminders, multi-utility support.
