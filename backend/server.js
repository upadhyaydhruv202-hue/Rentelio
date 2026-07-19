require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');
const { ensureUploadDir } = require('./services/productImage');
const { initRealtime } = require('./services/realtime');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const customerRoutes = require('./routes/customerRoutes');
const { registerV2Routes } = require('./routes/v2Routes');
const vendorPortalRoutes = require('./routes/vendorPortalRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

ensureUploadDir();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Rentelio', orm: 'prisma', realtime: true });
});

app.use('/api', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', customerRoutes);
app.use('/api/vendor', vendorPortalRoutes);
registerV2Routes(app);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const start = async () => {
  try {
    await prisma.$connect();
    const server = http.createServer(app);
    initRealtime(server);
    server.listen(PORT, () => {
      console.log(`Rentelio API running on http://localhost:${PORT}`);
      console.log('Realtime sockets enabled at /socket.io');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    console.error('Check DATABASE_URL in backend/.env');
    process.exit(1);
  }
};

start();
