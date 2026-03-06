const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// JWT veya API key ile erişim sağlayan middleware
const flexAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const apiKey = req.headers['x-api-key'];

  if (token) {
    return authMiddleware(req, res, next);
  } else if (apiKey) {
    return apiKeyAuth(req, res, next);
  } else {
    return res.status(401).json({ message: 'JWT token veya API key gerekli' });
  }
};

// Tüm radar itemlarını getir (herkese açık)
router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM radar_items ORDER BY quadrant, ring').all();
  res.json(items);
});

// Tek bir item getir (herkese açık)
router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM radar_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item bulunamadı' });
  res.json(item);
});

// Yeni item ekle (admin JWT veya API key)
router.post('/', flexAuth, (req, res) => {
  const { name, quadrant, ring, description } = req.body;

  if (!name || !quadrant || !ring) {
    return res.status(400).json({ message: 'Ad, kadran ve halka zorunludur' });
  }

  const result = db.prepare(`
    INSERT INTO radar_items (name, quadrant, ring, description)
    VALUES (?, ?, ?, ?)
  `).run(name, quadrant, ring, description);

  const newItem = db.prepare('SELECT * FROM radar_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newItem);
});

// Item güncelle (admin JWT veya API key)
router.put('/:id', flexAuth, (req, res) => {
  const { name, quadrant, ring, description } = req.body;
  const item = db.prepare('SELECT * FROM radar_items WHERE id = ?').get(req.params.id);

  if (!item) return res.status(404).json({ message: 'Item bulunamadı' });

  db.prepare(`
    UPDATE radar_items SET name = ?, quadrant = ?, ring = ?, description = ?
    WHERE id = ?
  `).run(name, quadrant, ring, description, req.params.id);

  const updated = db.prepare('SELECT * FROM radar_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Item sil (admin JWT veya API key)
router.delete('/:id', flexAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM radar_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item bulunamadı' });

  db.prepare('DELETE FROM radar_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Item silindi' });
});

module.exports = router;