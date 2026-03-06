const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const storedUsername = db.prepare("SELECT value FROM settings WHERE key = 'admin_username'").get();
  const storedPassword = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();

  if (!storedUsername || !storedPassword) {
    return res.status(500).json({ message: 'Ayarlar bulunamadı' });
  }

  if (username !== storedUsername.value || password !== storedPassword.value) {
    return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı' });
  }

  const token = jwt.sign(
    { username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token });
});

// Kullanıcı adı ve şifre güncelle (sadece admin)
router.put('/credentials', authMiddleware, (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;

  const storedPassword = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();

  if (currentPassword !== storedPassword.value) {
    return res.status(401).json({ message: 'Mevcut şifre hatalı' });
  }

  if (newUsername) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_username'").run(newUsername);
  }

  if (newPassword) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(newPassword);
  }

  res.json({ message: 'Bilgiler güncellendi' });
});

module.exports = router;