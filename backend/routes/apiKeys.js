const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');

// Tüm API keylerini listele (sadece admin)
router.get('/', authMiddleware, (req, res) => {
  const keys = db.prepare('SELECT id, name, key, created_at FROM api_keys').all();
  res.json(keys);
});

// Yeni API key oluştur (sadece admin)
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Key adı zorunludur' });
  }

  const key = 'kumtel_' + crypto.randomBytes(32).toString('hex');

  db.prepare('INSERT INTO api_keys (name, key) VALUES (?, ?)').run(name, key);

  const newKey = db.prepare('SELECT * FROM api_keys WHERE key = ?').get(key);
  res.status(201).json(newKey);
});

// API key sil (sadece admin)
router.delete('/:id', authMiddleware, (req, res) => {
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(req.params.id);

  if (!key) {
    return res.status(404).json({ message: 'API key bulunamadı' });
  }

  db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
  res.json({ message: 'API key silindi' });
});

module.exports = router;