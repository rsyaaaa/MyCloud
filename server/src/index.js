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
const { setupTerminalWebSocket } = require('./terminal');

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
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

// PRD Section 3B: Network State & Diagnostic Endpoint (Zero I/O, ultra-fast RTT diagnostic)
app.get('/api/network/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(204).end();
});

// App Version check endpoint for Android APK auto-updater
app.get('/api/app-version', (req, res) => {
  const distVersionFile = path.join(__dirname, '..', '..', 'client', 'dist', 'download', 'apk-version.json');
  const pubVersionFile = path.join(__dirname, '..', '..', 'client', 'public', 'download', 'apk-version.json');
  
  let versionData = {
    versionCode: 9,
    versionName: '1.0.8',
    downloadUrl: '/download/MyCloud.apk',
    releaseNotes: 'Fitur baru: Smart Dual-Routing. Otomatis menghubungkan ke Wi-Fi lokal rumah berkecepatan tinggi, dan otomatis beralih ke jaringan aman Tailscale saat berada di luar rumah.',
    fileSize: '66K',
    publishedAt: new Date().toISOString()
  };

  const target = fs.existsSync(distVersionFile) ? distVersionFile : (fs.existsSync(pubVersionFile) ? pubVersionFile : null);
  if (target) {
    try {
      versionData = JSON.parse(fs.readFileSync(target, 'utf8'));
    } catch (e) {}
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(versionData);
});

// Serve Frontend SPA static files if built
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static client files from ${clientDistPath}`);
  app.use(express.static(clientDistPath, {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.endsWith('sw.js')) {
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes('/assets/')) {
        // Content-hashed Vite bundle files - safe to cache long-term
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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

    // Attach Terminal WebSocket for Admin PTY Bash Sessions
    setupTerminalWebSocket(server);

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
