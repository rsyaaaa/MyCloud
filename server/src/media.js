const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const db = require('./db');
const { authMiddleware, vaultAuthMiddleware } = require('./auth');
const { probeMedia, generateThumbnail } = require('./ffmpegHelper');

const router = express.Router();

// Multer disk storage: write directly into user's upload directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userUploadsDir = path.join(config.USERS_DIR, req.user.id, 'uploads');
    if (!fs.existsSync(userUploadsDir)) {
      fs.mkdirSync(userUploadsDir, { recursive: true });
    }
    cb(null, userUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    // 5GB per individual file upload limit
    fileSize: 5 * 1024 * 1024 * 1024
  }
});

// POST /api/media/upload
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
  }

  const uploadedFile = req.file;
  const filePath = uploadedFile.path;
  const fileSize = uploadedFile.size;

  try {
    // 1. Quota Enforcement: Calculate SUM(file_size) real-time
    const quotaResult = await db.get(
      'SELECT COALESCE(SUM(file_size), 0) as used_bytes FROM media_files WHERE user_id = ?',
      [req.user.id]
    );
    const currentUsedBytes = quotaResult.used_bytes;
    const userQuotaBytes = req.user.storage_quota_bytes;

    if (currentUsedBytes + fileSize > userQuotaBytes) {
      // Over quota limit! Delete the uploaded physical file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(413).json({
        error: `Kuota penyimpanan tidak mencukupi. Sisa kuota: ${((userQuotaBytes - currentUsedBytes) / (1024 * 1024)).toFixed(1)} MB, ukuran file: ${(fileSize / (1024 * 1024)).toFixed(1)} MB. Silakan ajukan penambahan kuota.`,
        currentUsedBytes,
        userQuotaBytes
      });
    }

    // 2. Determine media type and mime type
    const mimeType = uploadedFile.mimetype || 'application/octet-stream';
    const isVideo = mimeType.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|flv|m4v)$/i.test(uploadedFile.originalname);
    const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|heic|svg)$/i.test(uploadedFile.originalname);

    if (!isVideo && !isImage) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Hanya format gambar dan video yang didukung.' });
    }

    const mediaType = isVideo ? 'video' : 'image';
    const mediaId = path.basename(filePath, path.extname(filePath));

    // 3. Extract dimensions, orientation & duration via FFprobe
    const probe = await probeMedia(filePath);

    // 4. Generate WebP thumbnail
    const thumbDir = path.join(config.USERS_DIR, req.user.id, 'thumbnails');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    const thumbPath = path.join(thumbDir, `${mediaId}.webp`);
    await generateThumbnail(filePath, thumbPath, mediaType);

    // 5. Save to database
    const originalName = uploadedFile.originalname;
    const displayName = path.parse(originalName).name; // default display name without extension
    const capturedAt = probe.captured_at || new Date().toISOString();

    await db.run(
      `INSERT INTO media_files (
        id, user_id, original_name, display_name, file_path, thumbnail_path,
        file_size, mime_type, media_type, width, height, duration_seconds,
        is_portrait, is_locked, is_favorite, captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      [
        mediaId,
        req.user.id,
        originalName,
        displayName,
        filePath,
        thumbPath,
        fileSize,
        mimeType,
        mediaType,
        probe.width,
        probe.height,
        probe.duration_seconds,
        probe.is_portrait,
        capturedAt
      ]
    );

    // 6. Update user's used_storage_bytes
    await db.run(
      'UPDATE users SET used_storage_bytes = used_storage_bytes + ? WHERE id = ?',
      [fileSize, req.user.id]
    );

    const savedMedia = await db.get('SELECT * FROM media_files WHERE id = ?', [mediaId]);

    return res.status(201).json({
      message: 'File berhasil diunggah!',
      media: savedMedia
    });
  } catch (err) {
    console.error('[Upload] Error processing file:', err);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    return res.status(500).json({ error: 'Gagal memproses file upload: ' + err.message });
  }
});

// GET /api/media (Main Gallery / Video Hub query, strictly EXCLUDES is_locked = 1)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      media_type,
      is_favorite,
      category_id,
      search,
      sort = 'newest'
    } = req.query;

    let query = `
      SELECT m.*,
        GROUP_CONCAT(c.name, ',') as category_names,
        GROUP_CONCAT(c.id, ',') as category_ids
      FROM media_files m
      LEFT JOIN media_category_rel r ON m.id = r.media_id
      LEFT JOIN categories_folders c ON r.category_id = c.id
      WHERE m.user_id = ? AND m.is_locked = 0 AND m.is_trash = 0
    `;
    const params = [req.user.id];

    if (media_type) {
      query += ` AND m.media_type = ?`;
      params.push(media_type);
    }

    if (is_favorite === '1' || is_favorite === 'true') {
      query += ` AND m.is_favorite = 1`;
    }

    if (category_id) {
      query += ` AND r.category_id = ?`;
      params.push(category_id);
    }

    if (search && search.trim()) {
      query += ` AND (m.display_name LIKE ? OR m.original_name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` GROUP BY m.id`;

    // Sorting
    switch (sort) {
      case 'oldest':
        query += ` ORDER BY COALESCE(m.captured_at, m.created_at) ASC`;
        break;
      case 'size_desc':
        query += ` ORDER BY m.file_size DESC`;
        break;
      case 'size_asc':
        query += ` ORDER BY m.file_size ASC`;
        break;
      case 'duration_desc':
        query += ` ORDER BY m.duration_seconds DESC`;
        break;
      case 'newest':
      default:
        query += ` ORDER BY COALESCE(m.captured_at, m.created_at) DESC`;
        break;
    }

    const rows = await db.all(query, params);
    return res.json({ media: rows });
  } catch (err) {
    console.error('[GET /api/media] Error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data media.' });
  }
});

// GET /api/media/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const row = await db.get(
      `SELECT m.*,
        GROUP_CONCAT(c.name, ',') as category_names,
        GROUP_CONCAT(c.id, ',') as category_ids
       FROM media_files m
       LEFT JOIN media_category_rel r ON m.id = r.media_id
       LEFT JOIN categories_folders c ON r.category_id = c.id
       WHERE m.id = ? AND m.user_id = ?
       GROUP BY m.id`,
      [req.params.id, req.user.id]
    );

    if (!row) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    // If media is locked, require vault token
    if (row.is_locked) {
      return res.status(403).json({ error: 'Media berada di brankas terkunci.' });
    }

    return res.json({ media: row });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat media.' });
  }
});

// PATCH /api/media/:id (Rename & Favorite toggle)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { display_name, is_favorite } = req.body;
    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    if (display_name !== undefined) {
      const cleanName = display_name.trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'Nama tampilan tidak boleh kosong.' });
      }
      await db.run('UPDATE media_files SET display_name = ? WHERE id = ?', [cleanName, media.id]);
    }

    if (is_favorite !== undefined) {
      const favVal = is_favorite ? 1 : 0;
      await db.run('UPDATE media_files SET is_favorite = ? WHERE id = ?', [favVal, media.id]);
    }

    const updated = await db.get('SELECT * FROM media_files WHERE id = ?', [media.id]);
    return res.json({ message: 'Media berhasil diperbarui.', media: updated });
  } catch (err) {
    console.error('[PATCH /api/media/:id] Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui media.' });
  }
});

// POST /api/media/:id/lock (Move to Safe Vault)
router.post('/:id/lock', authMiddleware, async (req, res) => {
  try {
    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    if (media.is_locked) {
      return res.json({ message: 'Media sudah berada di dalam brankas.', media });
    }

    // Move file physically to /vault/ folder
    const vaultDir = path.join(config.USERS_DIR, req.user.id, 'vault');
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

    const fileName = path.basename(media.file_path);
    const newFilePath = path.join(vaultDir, fileName);

    if (fs.existsSync(media.file_path)) {
      fs.renameSync(media.file_path, newFilePath);
    }

    await db.run(
      'UPDATE media_files SET is_locked = 1, file_path = ? WHERE id = ?',
      [newFilePath, media.id]
    );

    return res.json({ message: 'Media berhasil dipindahkan ke Brankas Terkunci.' });
  } catch (err) {
    console.error('[Lock Media] Error:', err);
    return res.status(500).json({ error: 'Gagal mengunci media: ' + err.message });
  }
});

// POST /api/media/:id/unlock (Move out of Safe Vault)
router.post('/:id/unlock', authMiddleware, vaultAuthMiddleware, async (req, res) => {
  try {
    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    if (!media.is_locked) {
      return res.json({ message: 'Media tidak berada di dalam brankas.', media });
    }

    // Move file physically back to /uploads/ folder
    const uploadsDir = path.join(config.USERS_DIR, req.user.id, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = path.basename(media.file_path);
    const newFilePath = path.join(uploadsDir, fileName);

    if (fs.existsSync(media.file_path)) {
      fs.renameSync(media.file_path, newFilePath);
    }

    await db.run(
      'UPDATE media_files SET is_locked = 0, file_path = ? WHERE id = ?',
      [newFilePath, media.id]
    );

    return res.json({ message: 'Media berhasil dikeluarkan dari Brankas ke Galeri Utama.' });
  } catch (err) {
    console.error('[Unlock Media] Error:', err);
    return res.status(500).json({ error: 'Gagal membuka kunci media: ' + err.message });
  }
});

// DELETE /api/media/:id (Move to Trash / 31-day auto-purge)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    // If file is locked, verify vault token
    if (media.is_locked) {
      const vaultToken = req.headers['x-vault-token'] || req.query.vault_token;
      if (!vaultToken) {
        return res.status(403).json({ error: 'Brankas terkunci. Verifikasi PIN terlebih dahulu untuk memindahkan file brankas ke sampah.' });
      }
    }

    // Move to Trash (31 days)
    await db.run(
      'UPDATE media_files SET is_trash = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [media.id]
    );

    return res.json({ message: 'Media berhasil dipindahkan ke Sampah (dihapus permanen otomatis dalam 31 hari).' });
  } catch (err) {
    console.error('[Move to Trash] Error:', err);
    return res.status(500).json({ error: 'Gagal memindahkan media ke sampah.' });
  }
});

// GET /api/media/trash/list (List all items in trash)
router.get('/trash/list', authMiddleware, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT m.*,
        CAST(MAX(0, 31 - (julianday('now') - julianday(m.deleted_at))) AS INT) as days_left
       FROM media_files m
       WHERE m.user_id = ? AND m.is_trash = 1
       ORDER BY m.deleted_at DESC`,
      [req.user.id]
    );

    return res.json({ trash: rows });
  } catch (err) {
    console.error('[Trash List] Error:', err);
    return res.status(500).json({ error: 'Gagal memuat berkas sampah.' });
  }
});

// POST /api/media/trash/:id/restore (Restore from trash)
router.post('/trash/:id/restore', authMiddleware, async (req, res) => {
  try {
    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ? AND is_trash = 1', [req.params.id, req.user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Berkas sampah tidak ditemukan.' });
    }

    await db.run(
      'UPDATE media_files SET is_trash = 0, deleted_at = NULL WHERE id = ?',
      [media.id]
    );

    return res.json({ message: 'Berkas berhasil dipulihkan ke Galeri Utama.' });
  } catch (err) {
    console.error('[Restore Trash] Error:', err);
    return res.status(500).json({ error: 'Gagal memulihkan berkas.' });
  }
});

// DELETE /api/media/trash/:id/permanent (Delete permanently from server disk)
router.delete('/trash/:id/permanent', authMiddleware, async (req, res) => {
  try {
    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ? AND is_trash = 1', [req.params.id, req.user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Berkas tidak ditemukan di sampah.' });
    }

    // Delete physical files
    if (fs.existsSync(media.file_path)) {
      try { fs.unlinkSync(media.file_path); } catch (e) {}
    }
    if (media.thumbnail_path && fs.existsSync(media.thumbnail_path)) {
      try { fs.unlinkSync(media.thumbnail_path); } catch (e) {}
    }

    // Delete from database
    await db.run('DELETE FROM media_files WHERE id = ?', [media.id]);

    // Update user's used_storage_bytes
    await db.run(
      'UPDATE users SET used_storage_bytes = MAX(0, used_storage_bytes - ?) WHERE id = ?',
      [media.file_size, req.user.id]
    );

    return res.json({ message: 'Berkas berhasil dihapus permanen dari penyimpanan server.' });
  } catch (err) {
    console.error('[Permanent Delete] Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus berkas permanen.' });
  }
});

// POST /api/media/trash/empty (Empty all trash for current user)
router.post('/trash/empty', authMiddleware, async (req, res) => {
  try {
    const trashFiles = await db.all('SELECT * FROM media_files WHERE user_id = ? AND is_trash = 1', [req.user.id]);

    let totalDeletedBytes = 0;
    for (const f of trashFiles) {
      if (fs.existsSync(f.file_path)) {
        try { fs.unlinkSync(f.file_path); } catch (e) {}
      }
      if (f.thumbnail_path && fs.existsSync(f.thumbnail_path)) {
        try { fs.unlinkSync(f.thumbnail_path); } catch (e) {}
      }
      totalDeletedBytes += f.file_size;
      await db.run('DELETE FROM media_files WHERE id = ?', [f.id]);
    }

    if (totalDeletedBytes > 0) {
      await db.run(
        'UPDATE users SET used_storage_bytes = MAX(0, used_storage_bytes - ?) WHERE id = ?',
        [totalDeletedBytes, req.user.id]
      );
    }

    return res.json({ message: `Sampah berhasil dikosongkan (${trashFiles.length} berkas dihapus).` });
  } catch (err) {
    console.error('[Empty Trash] Error:', err);
    return res.status(500).json({ error: 'Gagal mengosongkan sampah.' });
  }
});

// GET /api/vault/media (Vault gallery list)
router.get('/vault/list', authMiddleware, vaultAuthMiddleware, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT m.*,
        GROUP_CONCAT(c.name, ',') as category_names,
        GROUP_CONCAT(c.id, ',') as category_ids
       FROM media_files m
       LEFT JOIN media_category_rel r ON m.id = r.media_id
       LEFT JOIN categories_folders c ON r.category_id = c.id
       WHERE m.user_id = ? AND m.is_locked = 1 AND m.is_trash = 0
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    return res.json({ media: rows });
  } catch (err) {
    console.error('[GET /api/media/vault/list] Error:', err);
    return res.status(500).json({ error: 'Gagal mengambil media brankas.' });
  }
});

module.exports = router;

