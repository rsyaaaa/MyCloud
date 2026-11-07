const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const db = require('./db');
const config = require('./config');
const { authMiddleware, adminMiddleware } = require('./auth');

const router = express.Router();

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

    return res.json({
      disk: diskStats,
      users: userCount.count,
      media_count: mediaCount.count,
      total_media_bytes: mediaCount.total_size,
      pending_requests: pendingRequests.count
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
