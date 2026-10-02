const express = require('express');
const { queryOne, queryAll } = require('../db/database');

const router = express.Router();

router.get('/scan/:qrCode', (req, res) => {
  try {
    const qrCode = (req.params.qrCode || '').toUpperCase();
    const meter = queryOne('SELECT * FROM meters WHERE qr_code = ?', [qrCode]);
    if (!meter) return res.status(404).json({ error: 'Meter not found. Invalid QR code.' });

    const bill = queryOne(`
      SELECT b.*, m.meter_no, m.consumer_no, m.consumer_name, m.address, m.district, m.connection_type, m.sanctioned_load
      FROM bills b JOIN meters m ON b.meter_id = m.id
      WHERE b.meter_id = ? AND b.status = 'unpaid' ORDER BY b.bill_date DESC LIMIT 1
    `, [meter.id]);

    res.json({ meter, bill: bill || null, message: bill ? undefined : 'No pending bills found' });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch bill', details: err.message }); }
});

router.get('/meter/:meterNo', (req, res) => {
  try {
    const meterNo = (req.params.meterNo || '').toUpperCase();
    const meter = queryOne('SELECT * FROM meters WHERE meter_no = ?', [meterNo]);
    if (!meter) return res.status(404).json({ error: 'Meter not found' });

    const bill = queryOne(`
      SELECT b.*, m.meter_no, m.consumer_no, m.consumer_name, m.address, m.district
      FROM bills b JOIN meters m ON b.meter_id = m.id
      WHERE b.meter_id = ? AND b.status = 'unpaid' ORDER BY b.bill_date DESC LIMIT 1
    `, [meter.id]);

    res.json({ meter, bill: bill || null });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch bill', details: err.message }); }
});

router.get('/history/:meterNo', (req, res) => {
  try {
    const meterNo = (req.params.meterNo || '').toUpperCase();
    const meter = queryOne('SELECT * FROM meters WHERE meter_no = ?', [meterNo]);
    if (!meter) return res.status(404).json({ error: 'Meter not found' });

    const bills = queryAll(`
      SELECT b.*, m.consumer_name, m.consumer_no
      FROM bills b JOIN meters m ON b.meter_id = m.id
      WHERE b.meter_id = ? ORDER BY b.bill_date DESC
    `, [meter.id]);

    res.json({ meter, bills });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch bill history', details: err.message }); }
});

router.get('/all', (req, res) => {
  try {
    const meters = queryAll('SELECT * FROM meters');
    meters.forEach(m => {
      const pending = queryOne("SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total FROM bills WHERE meter_id = ? AND status = 'unpaid'", [m.id]);
      m.pending_bills = pending ? pending.count : 0;
      m.pending_amount = pending ? pending.total : 0;
    });
    res.json({ meters });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch meters', details: err.message }); }
});

// ── Add a new meter ──────────────────────────────────────────
router.post('/add', (req, res) => {
  try {
    const { consumer_name, consumer_no, meter_no, address, district, connection_type, sanctioned_load } = req.body;
    if (!consumer_name || !consumer_no || !meter_no || !address || !district) {
      return res.status(400).json({ error: 'All required fields must be filled.' });
    }

    // Check duplicates
    const existingMeter = queryOne('SELECT id FROM meters WHERE meter_no = ? OR consumer_no = ?', [meter_no, consumer_no]);
    if (existingMeter) {
      return res.status(409).json({ error: 'A meter with this Meter No. or Consumer No. already exists.' });
    }

    // Auto-generate QR code from meter_no
    const qr_code = 'QR-' + meter_no.replace(/[^A-Z0-9]/gi, '-').toUpperCase();

    const { runSql } = require('../db/database');
    const { lastId } = runSql(
      `INSERT INTO meters (meter_no, qr_code, consumer_no, consumer_name, address, district, connection_type, sanctioned_load)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [meter_no, qr_code, consumer_no, consumer_name, address, district,
       connection_type || 'Domestic', sanctioned_load || '3 kW']
    );

    // Seed a demo pending bill for new meter
    const today = new Date();
    const month = today.toLocaleString('default', { month: 'long' }) + ' ' + today.getFullYear();
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().split('T')[0];
    const billDate = today.toISOString().split('T')[0];
    const units = 200;
    const rate = connection_type === 'Commercial' ? 9.50 : 7.50;
    const energy = parseFloat((units * rate).toFixed(2));
    const fixed = connection_type === 'Commercial' ? 150 : 50;
    const tax = parseFloat((energy * 0.05).toFixed(2));
    const total = parseFloat((energy + fixed + tax).toFixed(2));

    runSql(
      `INSERT INTO bills (meter_id, bill_month, bill_date, due_date, units_consumed, rate_per_unit, energy_charges, fixed_charges, tax, surcharge, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')`,
      [lastId, month, billDate, dueDate, units, rate, energy, fixed, tax, 0, total]
    );

    res.status(201).json({ message: 'Meter registered successfully!', meter_no, qr_code });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add meter', details: err.message });
  }
});

module.exports = router;
