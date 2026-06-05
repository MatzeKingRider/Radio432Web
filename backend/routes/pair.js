const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const TOKEN_TTL_MS = 5 * 60 * 1000;        // 5 minutes

// Server URL advertised in the QR payload. Override via env in production.
const SERVER_URL = process.env.PUBLIC_SERVER_URL || 'https://radio.claudimatze.online';

// POST /api/pair/init — authenticated. User generates a pairing token + QR data.
// Auth is enforced at the route level so no mount-path string-matching can bypass it.
router.post('/init', auth, (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(400).json({ error: 'User not authenticated' });
  }

  const token = uuidv4();
  const expiresAt = Date.now() + TOKEN_TTL_MS;

  try {
    // Clean up this user's stale tokens so they don't accumulate.
    db.prepare('DELETE FROM pairing_tokens WHERE user_id = ? OR expires_at <= ?')
      .run(req.user.id, Date.now());

    db.prepare('INSERT INTO pairing_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(token, req.user.id, expiresAt);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create pairing token' });
  }

  const qrData = `radio432://pair?server=${SERVER_URL}&token=${token}`;

  return res.json({ token, expiresAt, qrData });
});

// POST /api/pair/confirm — public. Device redeems token for an API key.
router.post('/confirm', (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  try {
    const row = db.prepare('SELECT user_id, expires_at FROM pairing_tokens WHERE token = ?').get(token);

    if (!row || row.expires_at <= Date.now()) {
      // Drop the expired/consumed token if it lingered.
      db.prepare('DELETE FROM pairing_tokens WHERE token = ?').run(token);
      return res.status(403).json({ error: 'Token expired or not found' });
    }

    // Fetch or lazily generate the user's API key (same logic as /api/apikey).
    let user = db.prepare('SELECT api_key FROM users WHERE id = ?').get(row.user_id);
    if (!user) {
      // Token references a user that no longer exists.
      db.prepare('DELETE FROM pairing_tokens WHERE token = ?').run(token);
      return res.status(403).json({ error: 'Token expired or not found' });
    }

    if (!user.api_key) {
      const newKey = uuidv4();
      db.prepare('UPDATE users SET api_key = ? WHERE id = ? AND api_key IS NULL').run(newKey, row.user_id);
      user = db.prepare('SELECT api_key FROM users WHERE id = ?').get(row.user_id);
    }

    // One-time use: consume the token.
    db.prepare('DELETE FROM pairing_tokens WHERE token = ?').run(token);

    // API keys currently have no expiry in the DB, so we don't advertise one.
    // Real key expiration is a future feature.
    // Feldname snake_case (api_key) — die iOS-App dekodiert via CodingKeys "api_key".
    return res.json({ api_key: user.api_key });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to confirm pairing token' });
  }
});

module.exports = router;
