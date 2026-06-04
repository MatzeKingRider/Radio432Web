const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /
router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT id, name, url, favicon, sort_order, created_at FROM favorites WHERE user_id = ? ORDER BY sort_order ASC'
  ).all(req.user.id);
  res.json(rows);
});

// POST /
router.post('/', (req, res) => {
  const { id, name, url, favicon } = req.body;

  if (!id || !name || !url) {
    return res.status(400).json({ error: 'id, name and url are required' });
  }

  // Idempotency: check if id already exists for this user
  const existing = db.prepare(
    'SELECT id, sort_order FROM favorites WHERE id = ? AND user_id = ?'
  ).get(id, req.user.id);

  if (existing) {
    return res.status(200).json({ id: existing.id, sort_order: existing.sort_order });
  }

  // Calculate next sort_order
  const maxRow = db.prepare(
    'SELECT MAX(sort_order) AS max_order FROM favorites WHERE user_id = ?'
  ).get(req.user.id);

  const sort_order = maxRow.max_order !== null ? maxRow.max_order + 1 : 0;

  db.prepare(
    'INSERT INTO favorites (id, user_id, name, url, favicon, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, name, url, favicon || null, sort_order);

  res.status(201).json({ id, sort_order });
});

// DELETE /:id
router.delete('/:id', (req, res) => {
  const result = db.prepare(
    'DELETE FROM favorites WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.status(204).send();
});

// PUT /reorder
router.put('/reorder', (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'order array required' });
  }

  if (order.length > 500) {
    return res.status(400).json({ error: 'Too many items. Max 500.' });
  }

  const updateStmt = db.prepare(
    'UPDATE favorites SET sort_order = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?'
  );

  const reorder = db.transaction((ids) => {
    let updated = 0;
    for (let i = 0; i < ids.length; i++) {
      const result = updateStmt.run(i, ids[i], req.user.id);
      updated += result.changes;
    }
    return updated;
  });

  const updated = reorder(order);

  if (updated === 0) {
    return res.status(404).json({ error: 'No matching favorites found' });
  }

  res.json({ updated });
});

module.exports = router;
