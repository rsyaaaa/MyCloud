const express = require('express');
const db = require('./db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /api/memories (Temporal memories engine)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Load all unlocked media for user
    const allMedia = await db.all(
      `SELECT id, original_name, display_name, file_size, mime_type, media_type,
              width, height, duration_seconds, is_portrait, is_favorite, captured_at, created_at
       FROM media_files
       WHERE user_id = ? AND is_locked = 0
       ORDER BY COALESCE(captured_at, created_at) DESC`,
      [userId]
    );

    if (allMedia.length === 0) {
      return res.json({ memories: [] });
    }

    const memories = [];

    // Helper to calculate days diff
    const getDaysDiff = (dateStr) => {
      const mediaDate = new Date(dateStr);
      const diffTime = now.getTime() - mediaDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // 1. "1 Minggu Lalu" (6 to 8 days ago)
    const weekAgoMedia = allMedia.filter(m => {
      const diff = getDaysDiff(m.captured_at || m.created_at);
      return diff >= 6 && diff <= 8;
    });
    if (weekAgoMedia.length > 0) {
      memories.push({
        id: 'mem-1-week',
        label: '1 Minggu Lalu',
        subtitle: 'Momen satu minggu yang lalu',
        items: weekAgoMedia
      });
    }

    // 2. "1 Bulan Lalu" (28 to 32 days ago)
    const monthAgoMedia = allMedia.filter(m => {
      const diff = getDaysDiff(m.captured_at || m.created_at);
      return diff >= 28 && diff <= 32;
    });
    if (monthAgoMedia.length > 0) {
      memories.push({
        id: 'mem-1-month',
        label: '1 Bulan Lalu',
        subtitle: 'Kilasan memori sebulan yang lalu',
        items: monthAgoMedia
      });
    }

    // 3. "1 Tahun Lalu" (358 to 372 days ago)
    const year1AgoMedia = allMedia.filter(m => {
      const diff = getDaysDiff(m.captured_at || m.created_at);
      return diff >= 358 && diff <= 372;
    });
    if (year1AgoMedia.length > 0) {
      memories.push({
        id: 'mem-1-year',
        label: '1 Tahun Lalu',
        subtitle: 'Kenangan indah di waktu yang sama tahun lalu',
        items: year1AgoMedia
      });
    }

    // 4. "2 Tahun Lalu" (723 to 737 days ago)
    const year2AgoMedia = allMedia.filter(m => {
      const diff = getDaysDiff(m.captured_at || m.created_at);
      return diff >= 723 && diff <= 737;
    });
    if (year2AgoMedia.length > 0) {
      memories.push({
        id: 'mem-2-year',
        label: '2 Tahun Lalu',
        subtitle: 'Dua tahun berlalu sejak momen ini',
        items: year2AgoMedia
      });
    }

    // 5. Fallback: If less than 2 memories found, provide Random Memories from media older than 14 days
    if (memories.length < 2) {
      const olderMedia = allMedia.filter(m => getDaysDiff(m.captured_at || m.created_at) >= 14);
      if (olderMedia.length > 0) {
        // Pick a randomized slice of older media
        const shuffled = [...olderMedia].sort(() => 0.5 - Math.random()).slice(0, 8);
        memories.push({
          id: 'mem-throwback',
          label: 'Kenangan Silam',
          subtitle: 'Melihat kembali arsip foto & video masa lalu',
          items: shuffled
        });
      } else if (allMedia.length > 0) {
        // Fallback to favorite or highlighted media
        const favsOrRecent = allMedia.filter(m => m.is_favorite === 1).slice(0, 6);
        const highlights = favsOrRecent.length > 0 ? favsOrRecent : allMedia.slice(0, 6);
        memories.push({
          id: 'mem-highlights',
          label: 'Sorotan Galeri',
          subtitle: 'Koleksi media terpilih Anda',
          items: highlights
        });
      }
    }

    return res.json({ memories });
  } catch (err) {
    console.error('[Memories] Error:', err);
    return res.status(500).json({ error: 'Gagal memproses memori.' });
  }
});

module.exports = router;

