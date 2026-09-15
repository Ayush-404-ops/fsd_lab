require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectMySQL, getPool } = require('./config/mysql');
const { connectMongo } = require('./config/mongo');

const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const tagRoutes = require('./routes/tagRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/tags', tagRoutes);

// Dev-only RBAC test routes
if (process.env.NODE_ENV !== 'production') {
  const testRoutes = require('./routes/testRoutes');
  app.use('/api/test', testRoutes);
}

// Basic health route
app.get('/api/health', async (req, res) => {
  let mysqlStatus = 'disconnected';
  let mongoStatus = 'disconnected';

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    mysqlStatus = 'connected';
  } catch (err) {
    mysqlStatus = `error: ${err.message}`;
  }

  const { connection } = require('mongoose');
  if (connection && connection.readyState === 1) {
    mongoStatus = 'connected';
  }

  res.json({
    status: 'ok',
    service: 'IndieVault API',
    timestamp: new Date().toISOString(),
    databases: {
      mysql: mysqlStatus,
      mongodb: mongoStatus
    }
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to IndieVault API',
    docs: '/api/health'
  });
});

// Server Bootstrapping
async function startServer() {
  console.log('--- Starting IndieVault Server ---');

  // Initialize MongoDB connection
  console.log('[Boot] Initializing MongoDB connection...');
  await connectMongo();

  // Initialize MySQL connection
  console.log('[Boot] Initializing MySQL connection...');
  await connectMySQL();

  const server = app.listen(PORT, () => {
    console.log(`🚀 IndieVault server is running on http://localhost:${PORT}`);
    console.log(`📡 Health endpoint available at http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal) => {
    console.log(`\n[Shutdown] Received ${signal}. Closing connections cleanly...`);
    server.close(() => {
      console.log('[Shutdown] HTTP server closed.');
    });

    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('[Shutdown] MongoDB connection closed.');
    } catch (e) {
      // ignore
    }

    try {
      const pool = getPool();
      await pool.end();
      console.log('[Shutdown] MySQL pool closed.');
    } catch (e) {
      // ignore
    }

    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer();
