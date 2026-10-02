# ⚡ PowerScan

**Scan. Pay. Done.** — The fastest and safest way to pay your electricity bill.

PowerScan is a smart electricity bill payment platform for Andhra Pradesh. Every electricity meter has a unique QR code. Customers scan the QR code and instantly view their bill. They can pay securely without entering their consumer number.

---

## 🚀 Quick Start

```bash
cd server
npm install
npm start
```

Open **http://localhost:3000** in your browser.

## 🔑 Demo Credentials

| Field | Value |
|-------|-------|
| Email | rajesh@example.com |
| Password | demo123 |
| QR Codes | QR-AP-VJA-001 through QR-AP-NLR-005 |

## 📄 Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page with all sections |
| Scanner | `/scanner.html` | Demo QR code scanner |
| Login | `/auth.html` | Login / Register |
| Dashboard | `/dashboard.html` | Usage charts, bills, payments |
| Payment Success | `/payment-success.html` | Receipt page |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/profile` | Get user profile |
| GET | `/api/bills/scan/:qr` | Fetch bill by QR code |
| GET | `/api/bills/meter/:no` | Fetch bill by meter number |
| GET | `/api/bills/history/:no` | Bill history |
| GET | `/api/bills/all` | List all meters |
| POST | `/api/payments/pay` | Process payment |
| GET | `/api/payments/receipt/:txnId` | Get receipt |
| GET | `/api/payments/history` | Payment history |
| GET | `/api/dashboard/usage/:no` | Usage data |
| GET | `/api/dashboard/summary` | Platform stats |
| POST | `/api/contact` | Submit contact form |

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite (sql.js)
- **Auth**: JWT + bcrypt
- **Security**: Helmet, CORS

## 📁 Project Structure

```
VoltPay/
├── index.html              # Landing page
├── scanner.html            # QR scanner demo
├── auth.html               # Login / Register
├── dashboard.html          # User dashboard
├── payment-success.html    # Payment receipt
├── style.css               # All styles
├── script.js               # Frontend JavaScript
├── assets/
│   └── hero-illustration.png
└── server/
    ├── server.js           # Express server
    ├── package.json
    ├── db/
    │   └── database.js     # SQLite setup & seed data
    ├── routes/
    │   ├── auth.js         # Authentication
    │   ├── bills.js        # Bill management
    │   ├── payments.js     # Payment processing
    │   ├── dashboard.js    # Usage & stats
    │   └── contact.js      # Contact form
    └── middleware/
        └── auth.js         # JWT middleware
```

## 📜 License

MIT © 2026 PowerScan
