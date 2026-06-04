const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

router.get('/', (req, res) => {
  // Atomic: generate key only if not exists
  const existing = db.prepare('SELECT api_key FROM users WHERE id = ?').get(req.user.id);
  if (!existing.api_key) {
    const newKey = uuidv4();
    db.prepare('UPDATE users SET api_key = ? WHERE id = ? AND api_key IS NULL').run(newKey, req.user.id);
    // Re-read to get the winner in case of race
    const updated = db.prepare('SELECT api_key FROM users WHERE id = ?').get(req.user.id);
    return res.json({ api_key: updated.api_key });
  }
  return res.json({ api_key: existing.api_key });
});

module.exports = router;
