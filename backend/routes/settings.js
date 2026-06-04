const express = require('express');
const router = express.Router();
const db = require('../db/database');

const ALLOWED_FREQUENCIES = [396, 417, 432, 440, 444, 528, 639, 741, 852, 963];

router.get('/', (req, res) => {
  const user = db.prepare('SELECT frequency FROM users WHERE id = ?').get(req.user.id);
  res.json({ frequency: user.frequency });
});

router.put('/', (req, res) => {
  const { frequency } = req.body;
  if (!ALLOWED_FREQUENCIES.includes(Number(frequency))) {
    return res.status(400).json({ error: 'Invalid frequency. Allowed: 396, 417, 432, 440, 444, 528, 639, 741, 852, 963' });
  }
  db.prepare('UPDATE users SET frequency = ? WHERE id = ?').run(Number(frequency), req.user.id);
  res.json({ frequency: Number(frequency) });
});

module.exports = router;
