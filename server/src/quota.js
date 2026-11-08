const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const os = require('os');
const db = require('./db');
const config = require('./config');
const { authMiddleware, adminMiddleware } = require('./auth');

const router = express.Router();

// Real-time Linux system & load monitoring states
let lastNetSample = null;
let lastDiskSample = null;
let lastCpuSample = null;
let lastSampleTime = 0;

function readProcNet() {
  try {
    const content = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = content.split('\n');
    let rx = 0, tx = 0;
    let activeIface = 'eth0';
    let maxTraffic = -1;

    for (const line of lines) {
      if (!line.includes(':')) continue;
      const [iface, data] = line.split(':');
      const name = iface.trim();
      if (name === 'lo') continue;
      const parts = data.trim().split(/\s+/);
      const ifaceRx = parseInt(parts[0], 10) || 0;
      const ifaceTx = parseInt(parts[8], 10) || 0;
      rx += ifaceRx;
      tx += ifaceTx;
      if (ifaceRx + ifaceTx > maxTraffic) {
        maxTraffic = ifaceRx + ifaceTx;
        activeIface = name;
      }
    }
    return { rx, tx, activeIface };
  } catch (e) {
    return { rx: 0, tx: 0, activeIface: 'unknown' };
  }
}

function readProcDisk() {
  try {
    const content = fs.readFileSync('/proc/diskstats', 'utf8');
    const lines = content.split('\n');
    let rBytes = 0, wBytes = 0;
    let mainDev = 'sda';

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (!parts || parts.length < 14) continue;
      const dev = parts[2];
      if ((dev.startsWith('sd') && dev.length === 3) || (dev.startsWith('nvme') && dev.endsWith('n1')) || (dev.startsWith('vd') && dev.length === 3)) {
        const rSectors = parseInt(parts[5], 10) || 0;
        const wSectors = parseInt(parts[9], 10) || 0;
        rBytes += rSectors * 512;
        wBytes += wSectors * 512;
        mainDev = dev;
      }
    }
    return { rBytes, wBytes, mainDev };
  } catch (e) {
    return { rBytes: 0, wBytes: 0, mainDev: 'disk' };
  }
}

function readProcCpu() {
  try {
    const line = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0];
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] || 0);
    const total = parts.reduce((a, b) => a + b, 0);
    return { idle, total };
  } catch (e) {
    return { idle: 0, total: 0 };
  }
}

function getRealtimeMetrics() {
  const now = Date.now();
  const currentNet = readProcNet();
  const currentDisk = readProcDisk();
  const currentCpu = readProcCpu();

  let rxSpeed = 0;
  let txSpeed = 0;
  let readSpeed = 0;
  let writeSpeed = 0;
  let cpuPercent = 0;

  if (lastSampleTime > 0) {
    const deltaSeconds = Math.max(0.1, (now - lastSampleTime) / 1000);

    if (lastNetSample) {
      rxSpeed = Math.max(0, Math.round((currentNet.rx - lastNetSample.rx) / deltaSeconds));
      txSpeed = Math.max(0, Math.round((currentNet.tx - lastNetSample.tx) / deltaSeconds));
    }

    if (lastDiskSample) {
      readSpeed = Math.max(0, Math.round((currentDisk.rBytes - lastDiskSample.rBytes) / deltaSeconds));
      writeSpeed = Math.max(0, Math.round((currentDisk.wBytes - lastDiskSample.wBytes) / deltaSeconds));
    }

    if (lastCpuSample && currentCpu.total > lastCpuSample.total) {
      const dIdle = currentCpu.idle - lastCpuSample.idle;
      const dTotal = currentCpu.total - lastCpuSample.total;
      cpuPercent = Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 100)));
    }
  }

  lastNetSample = currentNet;
  lastDiskSample = currentDisk;
  lastCpuSample = currentCpu;
  lastSampleTime = now;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    network: {
      rx_speed_bytes: rxSpeed,
      tx_speed_bytes: txSpeed,
      total_rx_bytes: currentNet.rx,
      total_tx_bytes: currentNet.tx,
      active_interface: currentNet.activeIface,
    },
    disk_io: {
      read_speed_bytes: readSpeed,
      write_speed_bytes: writeSpeed,
      total_read_bytes: currentDisk.rBytes,
      total_write_bytes: currentDisk.wBytes,
      device: currentDisk.mainDev,
    },
    system: {
      status: 'ONLINE',
      uptime_seconds: Math.floor(os.uptime()),
      cpu_percent: cpuPercent,
      cpu_cores: os.cpus().length,
      load_avg: os.loadavg(),
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percent: Math.round((usedMem / totalMem) * 100)
      },
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      node_version: process.version,
      process_memory_bytes: process.memoryUsage().rss,
      timestamp: now
    }
  };
}

// Background sampling every 2 seconds to keep speed calculations accurate
setInterval(() => {
  try {
    getRealtimeMetrics();
  } catch (e) {}
}, 2000);

// POST /api/quota/request (User requests storage increase)
router.post('/quota/request', authMiddleware, async (req, res) => {
  try {
    const { requested_gb, reason } = req.body;
    const gb = parseFloat(requested_gb);

    if (isNaN(gb) || gb <= 0) {
      return res.status(400).json({ error: 'Kapasitas yang diminta harus berupa angka positif (GB).' });
    }

    const requestedBytes = Math.round(gb * 1024 * 1024 * 1024);
    const requestId = uuidv4();

    await db.run(
      `INSERT INTO storage_requests (id, user_id, requested_bytes, reason, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [requestId, req.user.id, requestedBytes, (reason || '').trim()]
    );

    const savedRequest = await db.get('SELECT * FROM storage_requests WHERE id = ?', [requestId]);
    return res.status(201).json({
      message: 'Permohonan penambahan kuota berhasil dikirim.',
      request: savedRequest
    });
  } catch (err) {
    console.error('[Quota Request] Error:', err);
    return res.status(500).json({ error: 'Gagal mengajukan permohonan kuota.' });
  }
});

// GET /api/quota/my-requests (User gets their own requests)
router.get('/quota/my-requests', authMiddleware, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM storage_requests WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json({ requests: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat riwayat permohonan kuota.' });
  }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// GET /api/admin/quota/requests (Admin views all quota requests)
router.get('/admin/requests', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT r.*, u.username, u.storage_quota_bytes, u.used_storage_bytes
       FROM storage_requests r
       JOIN users u ON r.user_id = u.id
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC`
    );
    return res.json({ requests: rows });
  } catch (err) {
    console.error('[Admin Quota Requests] Error:', err);
    return res.status(500).json({ error: 'Gagal memuat permohonan admin.' });
  }
});

// POST /api/admin/quota/requests/:id/action (Approve or Reject request)
router.post('/admin/requests/:id/action', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { action } = req.body; // 'approved' or 'rejected'
    if (action !== 'approved' && action !== 'rejected') {
      return res.status(400).json({ error: 'Aksi harus berupa approved atau rejected.' });
    }

    const request = await db.get('SELECT * FROM storage_requests WHERE id = ?', [req.params.id]);
    if (!request) {
      return res.status(404).json({ error: 'Permohonan tidak ditemukan.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Permohonan sudah berstatus ${request.status}.` });
    }

    if (action === 'approved') {
      // Increase user's storage quota
      await db.run(
        'UPDATE users SET storage_quota_bytes = storage_quota_bytes + ? WHERE id = ?',
        [request.requested_bytes, request.user_id]
      );
    }

    await db.run(
      'UPDATE storage_requests SET status = ? WHERE id = ?',
      [action, request.id]
    );

    return res.json({ message: `Permohonan berhasil di-${action}.` });
  } catch (err) {
    console.error('[Admin Action] Error:', err);
    return res.status(500).json({ error: 'Gagal memproses permohonan.' });
  }
});

// GET /api/admin/system-stats (Admin 500GB HDD monitor & system totals)
router.get('/admin/system-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Read physical filesystem stats
    let diskStats = { total: 0, free: 0, available: 0, used: 0 };
    if (fs.statfsSync) {
      try {
        const stats = fs.statfsSync(config.STORAGE_ROOT);
        const total = stats.bsize * stats.blocks;
        const free = stats.bsize * stats.bfree;
        const available = stats.bsize * stats.bavail;
        const used = total - free;
        diskStats = { total, free, available, used };
      } catch (e) {
        console.warn('statfsSync failed:', e.message);
      }
    }

    // DB aggregates
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const mediaCount = await db.get('SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size FROM media_files');
    const pendingRequests = await db.get("SELECT COUNT(*) as count FROM storage_requests WHERE status = 'pending'");

    // Real-time network, disk I/O, and CPU metrics
    const realtime = getRealtimeMetrics();

    return res.json({
      disk: diskStats,
      users: userCount.count,
      media_count: mediaCount.count,
      total_media_bytes: mediaCount.total_size,
      pending_requests: pendingRequests.count,
      network: realtime.network,
      disk_io: realtime.disk_io,
      system: realtime.system
    });
  } catch (err) {
    console.error('[Admin Stats] Error:', err);
    return res.status(500).json({ error: 'Gagal memuat statistik sistem.' });
  }
});

// GET /api/admin/users (List all users)
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await db.all(
      `SELECT id, username, role, storage_quota_bytes, used_storage_bytes, created_at,
              (SELECT COUNT(*) FROM media_files WHERE user_id = users.id) as total_files
       FROM users
       ORDER BY created_at ASC`
    );
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat daftar pengguna.' });
  }
});

// PATCH /api/admin/users/:id/quota (Admin updates user quota directly)
router.patch('/admin/users/:id/quota', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { quota_gb } = req.body;
    const gb = parseFloat(quota_gb);
    if (isNaN(gb) || gb <= 0) {
      return res.status(400).json({ error: 'Kapasitas kuota harus berupa angka positif (GB).' });
    }

    const quotaBytes = Math.round(gb * 1024 * 1024 * 1024);
    await db.run('UPDATE users SET storage_quota_bytes = ? WHERE id = ?', [quotaBytes, req.params.id]);

    return res.json({ message: 'Kuota pengguna berhasil diperbarui.' });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memperbarui kuota pengguna.' });
  }
});

module.exports = router;
