const express = require('express');
const db = require('./db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /api/watch-progress/:mediaId
router.get('/:mediaId', authMiddleware, async (req, res) => {
  try {
    const row = await db.get(
      'SELECT last_position_seconds, updated_at FROM watch_progress WHERE user_id = ? AND media_id = ?',
      [req.user.id, req.params.mediaId]
    );

    return res.json({
      last_position_seconds: row ? row.last_position_seconds : 0,
      updated_at: row ? row.updated_at : null
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil riwayat tontonan.' });
  }
});

// POST /api/watch-progress/:mediaId
router.post('/:mediaId', authMiddleware, async (req, res) => {
  try {
    const { last_position_seconds } = req.body;
    const pos = Math.max(0, parseInt(last_position_seconds, 10) || 0);

    await db.run(
      `INSERT INTO watch_progress (user_id, media_id, last_position_seconds, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, media_id) DO UPDATE SET
         last_position_seconds = excluded.last_position_seconds,
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, req.params.mediaId, pos]
    );

    return res.json({ success: true, position: pos });
  } catch (err) {
    console.error('[Watch Progress] Error:', err);
    return res.status(500).json({ error: 'Gagal menyimpan progres tontonan.' });
  }
});

module.exports = router;

