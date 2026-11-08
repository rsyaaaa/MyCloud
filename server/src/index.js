const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { initDb } = require('./db');
const { router: authRouter } = require('./auth');
const mediaRouter = require('./media');
const streamRouter = require('./stream');
const memoriesRouter = require('./memories');
const categoriesRouter = require('./categories');
const watchProgressRouter = require('./watchProgress');
const quotaRouter = require('./quota');

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/media', mediaRouter);
app.use('/api/stream', streamRouter);
app.use('/api/vault', streamRouter); // PRD alias: /api/vault/media/:id
app.use('/api/memories', memoriesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/watch-progress', watchProgressRouter);
app.use('/api', quotaRouter); // Handles /api/quota/* and /api/admin/*

// Serve Frontend SPA static files if built
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static client files from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Terjadi kesalahan pada server: ' + (err.message || 'Internal Server Error') });
});

// Start Server
async function startServer() {
  try {
    await initDb();

    const server = app.listen(config.PORT, config.HOST, () => {
      console.log('================================================================');
      console.log('   Personal Local Cloud & Media Hub (Private NAS Web App)      ');
      console.log(`   Listening on: http://${config.HOST}:${config.PORT}`);
      console.log(`   Local LAN URL: http://192.168.18.78:${config.PORT}`);
      console.log(`   Storage Root: ${config.STORAGE_ROOT}`);
      console.log(`   Database File: ${config.DB_PATH}`);
      console.log(`   FFmpeg Path: ${config.FFMPEG_PATH}`);
      console.log(`   FFprobe Path: ${config.FFPROBE_PATH}`);
      console.log('================================================================');
    });

    // Disable request timeout for multi-GB file uploads
    server.timeout = 0;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    if (server.requestTimeout !== undefined) {
      server.requestTimeout = 0;
    }
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

startServer();
