const db = require('../db/database');

module.exports = function auth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const cfEmail = req.headers['cf-access-authenticated-user-email'];

  if (apiKey) {
    const user = db.prepare('SELECT id, email FROM users WHERE api_key = ?').get(apiKey);
    if (!user) return res.status(401).json({ error: 'Invalid API key' });
    req.user = user;
    return next();
  }

  if (cfEmail) {
    let user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cfEmail);
    if (!user) {
      const result = db.prepare('INSERT INTO users (email) VALUES (?)').run(cfEmail);
      user = { id: result.lastInsertRowid, email: cfEmail };
    }
    req.user = user;
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
};
