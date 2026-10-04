const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'powerscan.db');

let db = null;

async function getDb() {
  if (!db) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function initializeDatabase() {
  const db = await getDb();

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, phone TEXT, password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS meters (
      id INTEGER PRIMARY KEY AUTOINCREMENT, meter_no TEXT UNIQUE NOT NULL,
      qr_code TEXT UNIQUE NOT NULL, consumer_no TEXT UNIQUE NOT NULL,
      consumer_name TEXT NOT NULL, address TEXT NOT NULL, district TEXT NOT NULL,
      connection_type TEXT DEFAULT 'Domestic', sanctioned_load TEXT DEFAULT '3 kW'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT, meter_id INTEGER NOT NULL,
      bill_month TEXT NOT NULL, bill_date DATE NOT NULL, due_date DATE NOT NULL,
      units_consumed INTEGER NOT NULL, rate_per_unit REAL DEFAULT 7.50,
      energy_charges REAL NOT NULL, fixed_charges REAL DEFAULT 50.00,
      tax REAL DEFAULT 0, surcharge REAL DEFAULT 0, total_amount REAL NOT NULL,
      status TEXT DEFAULT 'unpaid', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meter_id) REFERENCES meters(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id TEXT UNIQUE NOT NULL,
      bill_id INTEGER NOT NULL, user_id INTEGER,
      amount REAL NOT NULL, service_fee REAL DEFAULT 5.00,
      payment_method TEXT NOT NULL, status TEXT DEFAULT 'success',
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id), FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT, meter_id INTEGER NOT NULL,
      month TEXT NOT NULL, units INTEGER NOT NULL,
      FOREIGN KEY (meter_id) REFERENCES meters(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      email TEXT NOT NULL, phone TEXT, message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed if empty
  const res = db.exec('SELECT COUNT(*) as count FROM meters');
  const count = res.length ? res[0].values[0][0] : 0;
  if (count === 0) seedData(db);

  saveDb();
  console.log('✅ Database initialized successfully');
}

function seedData(db) {
  // Demo user
  const hashedPw = bcrypt.hashSync('demo123', 10);
  db.run(`INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`,
    ['Rajesh Kumar Reddy', 'rajesh@example.com', '+91 98765 43210', hashedPw]);

  // Demo meters
  const meters = [
    ['MTR-AP-456821', 'QR-AP-VJA-001', 'AP-VJA-2024-098712', 'Rajesh Kumar Reddy', '12-5-84, Labbipet, Vijayawada', 'Krishna', 'Domestic', '7 kW'],
    ['MTR-AP-789234', 'QR-AP-GNT-002', 'AP-GNT-2024-054321', 'Sita Lakshmi Devi', '4-12-9, Brodipet, Guntur', 'Guntur', 'Domestic', '5 kW'],
    ['MTR-AP-321567', 'QR-AP-VSP-003', 'AP-VSP-2024-076543', 'Venkata Subrahmanyam', '22-8-1, MVP Colony, Visakhapatnam', 'Visakhapatnam', 'Commercial', '10 kW'],
    ['MTR-AP-654890', 'QR-AP-TPT-004', 'AP-TPT-2024-032198', 'Padmavathi Enterprises', '7-3-15, Tiruchanoor Road, Tirupati', 'Chittoor', 'Commercial', '15 kW'],
    ['MTR-AP-112233', 'QR-AP-NLR-005', 'AP-NLR-2024-087654', 'Mohan Krishna Murthy', '10-2-6, Dargamitta, Nellore', 'Nellore', 'Domestic', '3 kW'],
  ];
  meters.forEach(m => db.run(`INSERT INTO meters (meter_no,qr_code,consumer_no,consumer_name,address,district,connection_type,sanctioned_load) VALUES (?,?,?,?,?,?,?,?)`, m));

  // Bills (6 months per meter)
  const months = ['Dec 2025','Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026'];
  for (let meterId = 1; meterId <= 5; meterId++) {
    months.forEach((month, idx) => {
      const units = Math.floor(150 + Math.random() * 300);
      const rate = meterId > 3 ? 9.50 : 7.50;
      const energy = parseFloat((units * rate).toFixed(2));
      const fixed = meterId > 3 ? 150 : 50;
      const tax = parseFloat((energy * 0.05).toFixed(2));
      const total = parseFloat((energy + fixed + tax).toFixed(2));
      const status = idx < 5 ? 'paid' : 'unpaid';
      const billDate = `2026-${String(idx + 1).padStart(2, '0')}-01`;
      const dueDate = `2026-${String(idx + 1).padStart(2, '0')}-15`;
      db.run(`INSERT INTO bills (meter_id,bill_month,bill_date,due_date,units_consumed,rate_per_unit,energy_charges,fixed_charges,tax,surcharge,total_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [meterId, month, billDate, dueDate, units, rate, energy, fixed, tax, 0, total, status]);
    });
  }

  // Usage data (12 months)
  const usageMonths = ['Jun 2025','Jul 2025','Aug 2025','Sep 2025','Oct 2025','Nov 2025','Dec 2025','Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026'];
  for (let meterId = 1; meterId <= 5; meterId++) {
    usageMonths.forEach(m => {
      db.run(`INSERT INTO usage_data (meter_id, month, units) VALUES (?, ?, ?)`, [meterId, m, Math.floor(120 + Math.random() * 300)]);
    });
  }

  // Demo payments for paid bills
  const paid = db.exec("SELECT id, total_amount FROM bills WHERE status = 'paid'");
  if (paid.length && paid[0].values) {
    const methods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'];
    paid[0].values.forEach(row => {
      const txnId = `TXN-PS-${Date.now()}-${row[0]}`;
      db.run(`INSERT INTO payments (transaction_id,bill_id,user_id,amount,service_fee,payment_method) VALUES (?,?,?,?,?,?)`,
        [txnId, row[0], 1, row[1], 5.00, methods[Math.floor(Math.random() * methods.length)]]);
    });
  }

  console.log('🌱 Demo data seeded');
}

// Helper to run queries and return objects
function queryAll(sql, params = []) {
  const d = db;
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length ? rows[0] : null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { lastId: db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] || 0 };
}

module.exports = { getDb, initializeDatabase, queryAll, queryOne, runSql, saveDb };
