const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, queryAll, runSql } = require('../db/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const { lastId } = runSql('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)', [name, email, phone || null, hashed]);
    const token = jwt.sign({ id: lastId, email, name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'Registration successful', token, user: { id: lastId, name, email, phone } });
  } catch (err) { res.status(500).json({ error: 'Registration failed', details: err.message }); }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) { res.status(500).json({ error: 'Login failed', details: err.message }); }
});

router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = queryOne('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stats = queryOne('SELECT COUNT(*) as total_payments, COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE user_id = ?', [req.user.id]);
    res.json({ user, stats });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch profile', details: err.message }); }
});

module.exports = router;
