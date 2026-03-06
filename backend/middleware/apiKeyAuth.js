const db = require('../db/database');

module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ message: 'API key gerekli. Header\'a x-api-key ekleyin.' });
  }

  const key = db.prepare('SELECT * FROM api_keys WHERE key = ?').get(apiKey);

  if (!key) {
    return res.status(401).json({ message: 'Geçersiz API key.' });
  }

  req.apiKey = key;
  next();
};