const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const radarRoutes = require('./routes/radar');
const apiKeyRoutes = require('./routes/apiKeys');

app.use('/api/auth', authRoutes);
app.use('/api/radar', radarRoutes);
app.use('/api/keys', apiKeyRoutes);

const PORT = process.env.PORT || 5000;
// Static frontend dosyalarını serve et
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// React Router için tüm rotaları index.html'e yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});