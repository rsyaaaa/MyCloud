const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /api/categories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    let query = `
      SELECT c.*,
             COUNT(r.media_id) as media_count,
             SUM(CASE WHEN m.media_type IN ('image', 'video') THEN 1 ELSE 0 END) as visual_media_count,
             (SELECT m2.id FROM media_category_rel r2
              JOIN media_files m2 ON r2.media_id = m2.id
              WHERE r2.category_id = c.id AND m2.is_locked = 0 AND m2.is_trash = 0 AND m2.media_type IN ('image', 'video')
              ORDER BY m2.created_at DESC LIMIT 1) as cover_media_id
      FROM categories_folders c
      LEFT JOIN media_category_rel r ON c.id = r.category_id
      LEFT JOIN media_files m ON r.media_id = m.id AND m.is_locked = 0 AND m.is_trash = 0
      WHERE c.user_id = ?
    `;
    const params = [req.user.id];

    if (type) {
      query += ` AND c.type = ?`;
      params.push(type);
    }

    query += ` GROUP BY c.id ORDER BY c.type, c.name ASC`;
    const rows = await db.all(query, params);

    return res.json({ categories: rows });
  } catch (err) {
    console.error('[Categories] Error:', err);
    return res.status(500).json({ error: 'Gagal mengambil kategori.' });
  }
});

// POST /api/categories
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, type = 'album' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
    }

    const cleanName = name.trim();
    const id = uuidv4();

    await db.run(
      'INSERT INTO categories_folders (id, user_id, name, type) VALUES (?, ?, ?, ?)',
      [id, req.user.id, cleanName, type]
    );

    const category = await db.get('SELECT * FROM categories_folders WHERE id = ?', [id]);
    return res.status(201).json({ message: 'Kategori berhasil dibuat.', category });
  } catch (err) {
    console.error('[Create Category] Error:', err);
    return res.status(500).json({ error: 'Gagal membuat kategori.' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const cat = await db.get('SELECT * FROM categories_folders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!cat) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    await db.run('DELETE FROM categories_folders WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Kategori berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal menghapus kategori.' });
  }
});

// GET /api/media/:mediaId/categories
router.get('/media/:mediaId', authMiddleware, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT c.* FROM categories_folders c
       JOIN media_category_rel r ON c.id = r.category_id
       WHERE r.media_id = ? AND c.user_id = ?`,
      [req.params.mediaId, req.user.id]
    );
    return res.json({ categories: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat kategori media.' });
  }
});

// POST /api/categories/assign (Set categories for a media file)
router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const { media_id, category_ids } = req.body;
    if (!media_id) {
      return res.status(400).json({ error: 'ID media diperlukan.' });
    }

    // Verify media belongs to user
    const media = await db.get('SELECT id FROM media_files WHERE id = ? AND user_id = ?', [media_id, req.user.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan.' });
    }

    // Clear existing relations
    await db.run('DELETE FROM media_category_rel WHERE media_id = ?', [media_id]);

    // Insert new relations
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      for (const catId of category_ids) {
        // verify category belongs to user
        const cat = await db.get('SELECT id FROM categories_folders WHERE id = ? AND user_id = ?', [catId, req.user.id]);
        if (cat) {
          await db.run(
            'INSERT OR IGNORE INTO media_category_rel (media_id, category_id) VALUES (?, ?)',
            [media_id, catId]
          );
        }
      }
    }

    return res.json({ message: 'Album/Kategori berhasil diperbarui.' });
  } catch (err) {
    console.error('[Assign Categories] Error:', err);
    return res.status(500).json({ error: 'Gagal menyimpan kategori media.' });
  }
});

// PATCH /api/categories/:id (Rename folder/category)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama folder wajib diisi.' });
    }
    const cat = await db.get('SELECT * FROM categories_folders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!cat) {
      return res.status(404).json({ error: 'Folder tidak ditemukan.' });
    }
    await db.run('UPDATE categories_folders SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    const updated = await db.get('SELECT * FROM categories_folders WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Folder berhasil diubah.', category: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengubah nama folder.' });
  }
});

module.exports = router;

