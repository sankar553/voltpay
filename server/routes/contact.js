const express = require('express');
const { queryAll, runSql } = require('../db/database');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });

    const { lastId } = runSql('INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)', [name, email, phone || null, message]);
    res.status(201).json({ message: "Thank you! Your message has been received. We'll get back to you within 24 hours.", id: lastId });
  } catch (err) { res.status(500).json({ error: 'Failed to submit message', details: err.message }); }
});

router.get('/', (req, res) => {
  try {
    const messages = queryAll('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch messages', details: err.message }); }
});

router.delete('/', (req, res) => {
  try {
    runSql('DELETE FROM contacts');
    res.json({ message: 'All feedback messages have been cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear messages', details: err.message });
  }
});

module.exports = router;
