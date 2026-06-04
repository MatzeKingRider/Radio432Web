const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/import', (req, res) => {
  const { favorites } = req.body;

  if (!Array.isArray(favorites)) {
    return res.status(400).json({ error: 'favorites array required' });
  }

  if (favorites.length > 1000) {
    return res.status(400).json({ error: 'Too many items. Max 1000.' });
  }

  const insert = db.prepare(
    'INSERT OR IGNORE INTO favorites (id, user_id, name, url, favicon, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );

  let imported = 0;
  let skipped = 0;

  const importAll = db.transaction((items) => {
    items.forEach((item, index) => {
      if (!item.id || !item.name || !item.url) { skipped++; return; }
      const result = insert.run(item.id, req.user.id, item.name, item.url, item.favicon || null, index);
      if (result.changes === 1) imported++;
      else skipped++;
    });
  });

  importAll(favorites);

  res.json({ imported, skipped });
});

module.exports = router;
