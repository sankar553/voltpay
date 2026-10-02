const express = require('express');
const { queryOne, queryAll, runSql } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/pay', optionalAuth, (req, res) => {
  try {
    const { bill_id, payment_method } = req.body;
    if (!bill_id || !payment_method) return res.status(400).json({ error: 'bill_id and payment_method are required' });

    const bill = queryOne(`
      SELECT b.*, m.consumer_name, m.consumer_no, m.meter_no, m.address, m.district
      FROM bills b JOIN meters m ON b.meter_id = m.id WHERE b.id = ?
    `, [bill_id]);

    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (bill.status === 'paid') return res.status(400).json({ error: 'Bill is already paid' });

    const txnId = `TXN-PS-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const serviceFee = 5.00;
    const userId = req.user ? req.user.id : null;

    runSql(`INSERT INTO payments (transaction_id, bill_id, user_id, amount, service_fee, payment_method) VALUES (?, ?, ?, ?, ?, ?)`,
      [txnId, bill_id, userId, bill.total_amount, serviceFee, payment_method]);
    runSql('UPDATE bills SET status = ? WHERE id = ?', ['paid', bill_id]);

    const receipt = {
      transaction_id: txnId, consumer_name: bill.consumer_name, consumer_no: bill.consumer_no,
      meter_no: bill.meter_no, address: bill.address, district: bill.district,
      bill_month: bill.bill_month, units_consumed: bill.units_consumed,
      amount_paid: bill.total_amount, service_fee: serviceFee,
      total_charged: parseFloat((bill.total_amount + serviceFee).toFixed(2)),
      payment_method, status: 'success', paid_at: new Date().toISOString()
    };

    res.json({ message: 'Payment successful!', receipt });
  } catch (err) { res.status(500).json({ error: 'Payment failed', details: err.message }); }
});

router.get('/receipt/:txnId', (req, res) => {
  try {
    const payment = queryOne(`
      SELECT p.*, b.bill_month, b.units_consumed, b.total_amount as bill_amount,
        m.consumer_name, m.consumer_no, m.meter_no, m.address, m.district
      FROM payments p JOIN bills b ON p.bill_id = b.id JOIN meters m ON b.meter_id = m.id
      WHERE p.transaction_id = ?
    `, [req.params.txnId]);

    if (!payment) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ receipt: payment });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch receipt', details: err.message }); }
});

router.get('/history', optionalAuth, (req, res) => {
  try {
    const sql = `SELECT p.*, b.bill_month, m.consumer_name, m.consumer_no
      FROM payments p JOIN bills b ON p.bill_id = b.id JOIN meters m ON b.meter_id = m.id`;
    const payments = req.user
      ? queryAll(sql + ' WHERE p.user_id = ? ORDER BY p.paid_at DESC', [req.user.id])
      : queryAll(sql + ' ORDER BY p.paid_at DESC LIMIT 20');
    res.json({ payments });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch payment history', details: err.message }); }
});

module.exports = router;
