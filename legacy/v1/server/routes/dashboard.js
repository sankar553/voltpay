const express = require('express');
const { queryOne, queryAll } = require('../db/database');

const router = express.Router();

router.get('/usage/:meterNo', (req, res) => {
  try {
    const meterNo = (req.params.meterNo || '').toUpperCase();
    const meter = queryOne('SELECT * FROM meters WHERE meter_no = ?', [meterNo]);
    if (!meter) return res.status(404).json({ error: 'Meter not found' });

    const usage = queryAll('SELECT * FROM usage_data WHERE meter_id = ? ORDER BY id ASC', [meter.id]);
    const units = usage.map(u => u.units);
    const avg = units.length ? Math.round(units.reduce((a, b) => a + b, 0) / units.length) : 0;
    const current = units.length ? units[units.length - 1] : 0;
    const prev = units.length > 1 ? units[units.length - 2] : 0;
    const trend = prev ? (((current - prev) / prev) * 100).toFixed(1) : 0;

    res.json({
      meter, usage,
      stats: { average: avg, max: units.length ? Math.max(...units) : 0, min: units.length ? Math.min(...units) : 0, current, previous: prev, trend_percent: parseFloat(trend) }
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch usage data', details: err.message }); }
});

router.get('/summary', (req, res) => {
  try {
    const s = (sql) => { const r = queryOne(sql); return r ? Object.values(r)[0] : 0; };
    res.json({
      stats: {
        total_users: s('SELECT COUNT(*) as c FROM users'),
        total_meters: s('SELECT COUNT(*) as c FROM meters'),
        total_payments: s('SELECT COUNT(*) as c FROM payments'),
        total_revenue: s('SELECT COALESCE(SUM(amount),0) as c FROM payments'),
        total_service_fees: s('SELECT COALESCE(SUM(service_fee),0) as c FROM payments'),
        pending_bills: s("SELECT COUNT(*) as c FROM bills WHERE status = 'unpaid'")
      }
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch summary', details: err.message }); }
});

module.exports = router;
