const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'radar.db'));

// Radar items tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS radar_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quadrant TEXT NOT NULL,
    ring TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ayarlar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

// API Keys tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Örnek veri ekle (tablo boşsa)
const count = db.prepare('SELECT COUNT(*) as count FROM radar_items').get();
if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO radar_items (name, quadrant, ring, description)
    VALUES (?, ?, ?, ?)
  `);
  insert.run('React', 'Languages & Frameworks', 'Adopt', 'UI geliştirme için standart kütüphanemiz');
  insert.run('Docker', 'Platforms', 'Adopt', 'Tüm servisler containerize edilmeli');
  insert.run('Kubernetes', 'Platforms', 'Trial', 'Orkestrasyon için değerlendiriyoruz');
  insert.run('Deno', 'Languages & Frameworks', 'Assess', 'Node alternatifi, takip ediyoruz');
  insert.run('TDD', 'Techniques', 'Trial', 'Test driven development pratiklerini deniyoruz');
}

// .env'den admin bilgilerini aktar (tablo boşsa)
const adminExists = db.prepare("SELECT * FROM settings WHERE key = 'admin_username'").get();
if (!adminExists) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('admin_username', process.env.ADMIN_USERNAME || 'admin');
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('admin_password', process.env.ADMIN_PASSWORD || 'admin123');
}

module.exports = db;