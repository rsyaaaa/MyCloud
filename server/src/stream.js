const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');

const router = express.Router();

/**
 * Handle HTTP Range request for streaming video/audio or full file serving.
 */
function streamFile(filePath, mimeType, req, res) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File fisik tidak ditemukan pada disk server.' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const etag = `"${fileSize.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const lastModified = stat.mtime.toUTCString();

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  const range = req.headers.range;

  if (range) {
    // Parse Range header: e.g. "bytes=0-1048576"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`
      });
      return res.end();
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    const headers = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      'ETag': etag,
      'Last-Modified': lastModified
    };

    res.writeHead(206, headers);
    fileStream.pipe(res);
  } else {
    // Full content response
    const headers = {
      'Content-Length': fileSize,
      'Content-Type': mimeType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      'ETag': etag,
      'Last-Modified': lastModified
    };

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  }
}

// Helper to authenticate session from cookie or query token (for <img> and <video> tags)
async function authenticateMediaRequest(req) {
  let token = req.cookies && req.cookies.token;
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return await db.get('SELECT id, username, role FROM users WHERE id = ?', [decoded.id]);
  } catch (e) {
    return null;
  }
}

// GET /api/stream/:id (Public / Standard media streaming)
router.get('/:id', async (req, res) => {
  try {
    const user = await authenticateMediaRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }

    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [req.params.id, user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    if (media.is_locked) {
      return res.status(403).json({ error: 'Media terkunci di Brankas. Gunakan endpoint brankas.' });
    }

    streamFile(media.file_path, media.mime_type, req, res);
  } catch (err) {
    console.error('[Stream] Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Gagal melakukan streaming file.' });
  }
});

// In-memory thumbnail metadata cache to eliminate repetitive SQLite queries on HDD
const thumbMetaCache = new Map();
const MAX_THUMB_CACHE = 5000;

function setThumbCache(key, val) {
  if (thumbMetaCache.size >= MAX_THUMB_CACHE) {
    const firstKey = thumbMetaCache.keys().next().value;
    thumbMetaCache.delete(firstKey);
  }
  thumbMetaCache.set(key, val);
}

function invalidateStreamCache(mediaId) {
  if (!mediaId) {
    thumbMetaCache.clear();
  } else {
    for (const key of thumbMetaCache.keys()) {
      if (key.endsWith(`:${mediaId}`)) {
        thumbMetaCache.delete(key);
      }
    }
  }
}
router.invalidateStreamCache = invalidateStreamCache;

// GET /api/stream/thumbnail/:id (Thumbnail preview with high-performance caching)
router.get('/thumbnail/:id', async (req, res) => {
  try {
    const user = await authenticateMediaRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }

    const cacheKey = `${user.id}:${req.params.id}`;
    let media = thumbMetaCache.get(cacheKey);

    if (!media) {
      media = await db.get(
        'SELECT id, file_path, thumbnail_path, mime_type, is_locked FROM media_files WHERE id = ? AND user_id = ?',
        [req.params.id, user.id]
      );
      if (!media) {
        return res.status(404).json({ error: 'Media tidak ditemukan.' });
      }
      setThumbCache(cacheKey, media);
    }

    if (media.is_locked) {
      return res.status(403).json({ error: 'Thumbnail terkunci.' });
    }

    const thumbPath = media.thumbnail_path;
    if (thumbPath && fs.existsSync(thumbPath)) {
      return res.sendFile(path.resolve(thumbPath), {
        maxAge: '30d',
        immutable: true,
        lastModified: true,
        etag: true,
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=2592000, immutable'
        }
      });
    }

    // Fallback to streaming original file if thumbnail not available
    streamFile(media.file_path, media.mime_type, req, res);
  } catch (err) {
    console.error('[Thumbnail] Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Gagal memuat thumbnail.' });
  }
});

// GET /api/stream/download/:id
router.get('/download/:id', async (req, res) => {
  try {
    const user = await authenticateMediaRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }

    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ?', [req.params.id, user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    if (media.is_locked) {
      return res.status(403).json({ error: 'Media terkunci di brankas.' });
    }

    if (!fs.existsSync(media.file_path)) {
      return res.status(404).json({ error: 'File fisik tidak ditemukan.' });
    }

    const filename = media.display_name
      ? `${media.display_name}${path.extname(media.original_name)}`
      : media.original_name;

    res.download(media.file_path, filename);
  } catch (err) {
    console.error('[Download] Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Gagal mengunduh file.' });
  }
});

// GET /api/vault/media/:id and /api/stream/vault/media/:id (Safe Vault Streaming Endpoint)
router.get(['/media/:id', '/vault/media/:id'], async (req, res) => {
  try {
    const user = await authenticateMediaRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }

    // Verify vault token
    const vaultToken = req.headers['x-vault-token'] || req.query.vault_token;
    if (!vaultToken) {
      return res.status(403).json({ error: 'Akses brankas terkunci. Verifikasi PIN terlebih dahulu.' });
    }

    try {
      const decoded = jwt.verify(vaultToken, config.VAULT_SECRET);
      if (decoded.id !== user.id) {
        return res.status(403).json({ error: 'Token brankas tidak sah.' });
      }
    } catch (e) {
      return res.status(403).json({ error: 'Sesi brankas telah kedaluwarsa.' });
    }

    const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ? AND is_locked = 1', [req.params.id, user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media brankas tidak ditemukan.' });
    }

    streamFile(media.file_path, media.mime_type, req, res);
  } catch (err) {
    console.error('[Vault Stream] Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Gagal memutar media brankas.' });
  }
});

// GET /api/vault/thumbnail/:id and /api/stream/vault/thumbnail/:id
  router.get('/vault/thumbnail/:id', async (req, res) => {
    try {
      const user = await authenticateMediaRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Autentikasi diperlukan.' });
      }

      // Verify vault token
      const vaultToken = req.headers['x-vault-token'] || req.query.vault_token;
      if (!vaultToken) {
        return res.status(403).json({ error: 'Akses brankas terkunci.' });
      }

      try {
        const decoded = jwt.verify(vaultToken, config.VAULT_SECRET);
        if (decoded.id !== user.id) {
          return res.status(403).json({ error: 'Token brankas tidak sah.' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'Sesi brankas telah kedaluwarsa.' });
      }

      const media = await db.get('SELECT * FROM media_files WHERE id = ? AND user_id = ? AND is_locked = 1', [req.params.id, user.id]);
      if (!media) {
        return res.status(404).json({ error: 'Media brankas tidak ditemukan.' });
      }

      const thumbPath = media.thumbnail_path;
      if (thumbPath && fs.existsSync(thumbPath)) {
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'no-cache');
        return fs.createReadStream(thumbPath).pipe(res);
      }

      streamFile(media.file_path, media.mime_type, req, res);
    } catch (err) {
      console.error('[Vault Thumbnail] Error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Gagal memuat thumbnail brankas.' });
    }
  });

  module.exports = router;
