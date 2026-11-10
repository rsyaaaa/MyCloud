const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { execFile } = require('child_process');
const config = require('./config');
const db = require('./db');

const router = express.Router();

const avatarUpload = multer({
  dest: '/tmp',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for avatar photo
});

// Helper to create token (1 year persistent session unless explicitly logged out)
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.JWT_SECRET,
    { expiresIn: '365d' }
  );
}

// Middleware: Authenticate user via Bearer token (explicit client session) or cookie (fallback)
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || (req.cookies && req.cookies.token);

  if (!token) {
    return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan login kembali.' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await db.get(
      'SELECT id, username, role, storage_quota_bytes, used_storage_bytes, avatar_url, (pin_hash IS NOT NULL) as has_pin FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
    }

    // Keep cookie strictly synchronized with the active client bearerToken if they differ
    if (bearerToken && req.cookies && req.cookies.token !== bearerToken) {
      res.cookie('token', bearerToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesi kedaluwarsa atau tidak valid.' });
  }
}

// Middleware: Admin only
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Memerlukan hak admin.' });
  }
  next();
}

// Middleware: Verify Vault token (3 minute session)
function vaultAuthMiddleware(req, res, next) {
  const vaultToken = req.headers['x-vault-token'] || req.query.vault_token;

  if (!vaultToken) {
    return res.status(403).json({ error: 'Brankas terkunci. Verifikasi PIN terlebih dahulu.' });
  }

  try {
    const decoded = jwt.verify(vaultToken, config.VAULT_SECRET);
    if (decoded.id !== req.user.id) {
      return res.status(403).json({ error: 'Token brankas tidak cocok dengan akun ini.' });
    }
    req.vaultUser = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Sesi brankas telah habis (otomatis terkunci 3 menit). Silakan masukkan PIN kembali.' });
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Username minimal 3 karakter dan password minimal 6 karakter.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan. Pilih username lain.' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const role = 'regular_user';
    const quotaBytes = config.DEFAULT_USER_QUOTA;

    // Create physical folder isolation: /home/autofocusxioo/nas_data/users/{userId}/
    const userRoot = path.join(config.USERS_DIR, userId);
    fs.mkdirSync(path.join(userRoot, 'uploads'), { recursive: true });
    fs.mkdirSync(path.join(userRoot, 'thumbnails'), { recursive: true });
    fs.mkdirSync(path.join(userRoot, 'vault'), { recursive: true });

    await db.run(
      `INSERT INTO users (id, username, password_hash, role, storage_quota_bytes, used_storage_bytes)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [userId, cleanUsername, passwordHash, role, quotaBytes]
    );

    // Create default genre tags for user
    const defaultGenres = ['Vlog', 'Series', 'Short', 'Clip', 'Dokumentasi'];
    for (const genre of defaultGenres) {
      await db.run(
        `INSERT INTO categories_folders (id, user_id, name, type) VALUES (?, ?, ?, 'genre')`,
        [uuidv4(), userId, genre]
      );
    }

    const newUser = { id: userId, username: cleanUsername, role, storage_quota_bytes: quotaBytes, used_storage_bytes: 0, has_pin: 0 };
    const token = signToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Local LAN HTTP
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(201).json({
      message: 'Registrasi berhasil!',
      user: newUser,
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Gagal melakukan registrasi: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await db.get(
      'SELECT id, username, password_hash, role, storage_quota_bytes, used_storage_bytes, avatar_url, (pin_hash IS NOT NULL) as has_pin FROM users WHERE username = ?',
      [cleanUsername]
    );

    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const userData = {
      id: user.id,
      username: user.username,
      role: user.role,
      storage_quota_bytes: user.storage_quota_bytes,
      used_storage_bytes: user.used_storage_bytes,
      avatar_url: user.avatar_url,
      has_pin: user.has_pin
    };

    const token = signToken(userData);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({
      message: 'Login berhasil!',
      user: userData,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Gagal melakukan login.' });
  }
});

// POST /api/auth/public-login (1-Click Passwordless Login for Shared Public Storage)
router.post('/public-login', async (req, res) => {
  try {
    let publicUser = await db.get("SELECT * FROM users WHERE username = 'public'");

    if (!publicUser) {
      const publicId = uuidv4();
      const publicRoot = path.join(config.USERS_DIR, publicId);
      fs.mkdirSync(path.join(publicRoot, 'uploads'), { recursive: true });
      fs.mkdirSync(path.join(publicRoot, 'thumbnails'), { recursive: true });
      fs.mkdirSync(path.join(publicRoot, 'vault'), { recursive: true });

      await db.run(
        `INSERT INTO users (id, username, password_hash, role, storage_quota_bytes, used_storage_bytes)
         VALUES (?, 'public', '', 'public', ?, 0)`,
        [publicId, config.DEFAULT_PUBLIC_QUOTA]
      );
      publicUser = await db.get("SELECT * FROM users WHERE id = ?", [publicId]);
    }

    const userData = {
      id: publicUser.id,
      username: 'public',
      role: 'public',
      storage_quota_bytes: publicUser.storage_quota_bytes || config.DEFAULT_PUBLIC_QUOTA,
      used_storage_bytes: publicUser.used_storage_bytes || 0,
      avatar_url: publicUser.avatar_url || '/avatars/user_default.jpg',
      has_pin: 0
    };

    const token = signToken(userData);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({
      message: 'Login sebagai Public User berhasil!',
      user: userData,
      token
    });
  } catch (err) {
    console.error('Public login error:', err);
    return res.status(500).json({ error: 'Gagal melakukan login publik: ' + err.message });
  }
});

// POST /api/auth/switch-user (Beralih ke akun user/public non-admin tersimpan di perangkat)
router.post('/switch-user', async (req, res) => {
  try {
    const { token, userId } = req.body;
    if (!token && !userId) {
      return res.status(400).json({ error: 'Token akun diperlukan untuk beralih akun.' });
    }

    let targetUserId = userId;

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        targetUserId = decoded.id;
        // Strictly prevent switching to admin via switch-user
        if (decoded.role === 'admin' || decoded.username === 'admin') {
          return res.status(403).json({ error: 'Akun admin tidak diizinkan untuk fitur switch user.' });
        }
      } catch (err) {
        return res.status(401).json({ error: 'Sesi akun tersimpan telah kedaluwarsa. Silakan masukkan password kembali.' });
      }
    }

    const user = await db.get(
      'SELECT id, username, role, storage_quota_bytes, used_storage_bytes, avatar_url, (pin_hash IS NOT NULL) as has_pin FROM users WHERE id = ?',
      [targetUserId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Akun tidak ditemukan di server.' });
    }

    // STRICT CHECK: Never allow admin account to be switched into
    if (user.role === 'admin' || user.username === 'admin') {
      return res.status(403).json({ error: 'Akun admin tidak diizinkan untuk fitur switch user.' });
    }

    const userData = {
      id: user.id,
      username: user.username,
      role: user.role,
      storage_quota_bytes: user.storage_quota_bytes,
      used_storage_bytes: user.used_storage_bytes,
      avatar_url: user.avatar_url,
      has_pin: user.has_pin
    };

    const newToken = signToken(userData);

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({
      message: `Berhasil beralih ke akun ${user.username}`,
      user: userData,
      token: newToken
    });
  } catch (err) {
    console.error('Switch user error:', err);
    return res.status(500).json({ error: 'Gagal beralih akun: ' + err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ message: 'Logout berhasil.' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  // Recalculate real-time used_storage_bytes
  const sumResult = await db.get('SELECT COALESCE(SUM(file_size), 0) as total FROM media_files WHERE user_id = ?', [req.user.id]);
  const realUsedBytes = sumResult.total;

  if (realUsedBytes !== req.user.used_storage_bytes) {
    await db.run('UPDATE users SET used_storage_bytes = ? WHERE id = ?', [realUsedBytes, req.user.id]);
    req.user.used_storage_bytes = realUsedBytes;
  }

  const activeToken = req.token || signToken(req.user);
  return res.json({ user: req.user, token: activeToken });
});

// POST /api/vault/setup-pin
router.post('/vault/setup-pin', authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.toString().length < 4) {
      return res.status(400).json({ error: 'PIN Brankas minimal 4 digit/karakter.' });
    }

    const pinHash = await bcrypt.hash(pin.toString(), 10);
    await db.run('UPDATE users SET pin_hash = ? WHERE id = ?', [pinHash, req.user.id]);

    return res.json({ message: 'PIN Brankas berhasil disimpan!' });
  } catch (err) {
    console.error('Setup PIN error:', err);
    return res.status(500).json({ error: 'Gagal mengatur PIN brankas.' });
  }
});

// POST /api/vault/verify-pin
router.post('/vault/verify-pin', authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'Masukkan PIN brankas.' });
    }

    const user = await db.get('SELECT pin_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.pin_hash) {
      return res.status(400).json({ error: 'PIN belum diatur. Silakan atur PIN terlebih dahulu.' });
    }

    const isMatch = await bcrypt.compare(pin.toString(), user.pin_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'PIN salah.' });
    }

    // Generate 3-minute vault token
    const vaultToken = jwt.sign(
      { id: req.user.id, unlockedAt: Date.now() },
      config.VAULT_SECRET,
      { expiresIn: '3m' } // 3 minutes auto-lock
    );

    return res.json({
      message: 'Brankas berhasil dibuka.',
      vaultToken,
      expiresInSeconds: 180
    });
  } catch (err) {
    console.error('Verify PIN error:', err);
    return res.status(500).json({ error: 'Gagal memverifikasi PIN.' });
  }
});

// POST /api/auth/avatar (Upload custom avatar)
router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  if (req.user.role === 'admin' || req.user.username === 'admin') {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(403).json({ error: 'Akun admin menggunakan avatar sistem bawaan dan tidak dapat diubah.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file foto yang dipilih.' });
  }

  const tempPath = req.file.path;
  const userRoot = path.join(config.USERS_DIR, req.user.id);
  if (!fs.existsSync(userRoot)) fs.mkdirSync(userRoot, { recursive: true });

  const destAvatarPath = path.join(userRoot, 'avatar.jpg');

  try {
    // Crop & scale to 256x256 square JPG using FFmpeg
    await new Promise((resolve, reject) => {
      execFile(config.FFMPEG_PATH, [
        '-y',
        '-i', tempPath,
        '-vf', 'crop=min(iw\\,ih):min(iw\\,ih),scale=256:256',
        '-q:v', '85',
        destAvatarPath
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try { fs.unlinkSync(tempPath); } catch (e) {}

    const avatarUrl = `/api/auth/avatar/${req.user.id}?t=${Date.now()}`;
    await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

    return res.json({ message: 'Foto profil berhasil diperbarui!', avatar_url: avatarUrl });
  } catch (err) {
    console.error('[Avatar] Error processing avatar:', err);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
    return res.status(500).json({ error: 'Gagal memproses foto avatar: ' + err.message });
  }
});

// GET /api/auth/avatar/:userId (Serve avatar or default avatar)
router.get('/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRoot = path.join(config.USERS_DIR, userId);
    const customAvatar = path.join(userRoot, 'avatar.jpg');

    if (fs.existsSync(customAvatar)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(customAvatar);
    }

    // Fallback to default avatar based on user role
    const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    const defaultFile = (user && user.role === 'admin')
      ? path.join(__dirname, '..', 'public', 'avatars', 'admin_default.jpg')
      : path.join(__dirname, '..', 'public', 'avatars', 'user_default.jpg');

    if (fs.existsSync(defaultFile)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(defaultFile);
    }

    return res.status(404).send('Avatar tidak ditemukan.');
  } catch (err) {
    return res.status(500).send('Error loading avatar');
  }
});

// DELETE /api/auth/avatar (Reset custom avatar to default)
router.delete('/avatar', authMiddleware, async (req, res) => {
  if (req.user.role === 'admin' || req.user.username === 'admin') {
    return res.status(403).json({ error: 'Akun admin menggunakan avatar sistem bawaan.' });
  }

  try {
    const customAvatar = path.join(config.USERS_DIR, req.user.id, 'avatar.jpg');
    if (fs.existsSync(customAvatar)) {
      try { fs.unlinkSync(customAvatar); } catch (e) {}
    }
    await db.run('UPDATE users SET avatar_url = NULL WHERE id = ?', [req.user.id]);
    return res.json({ message: 'Foto profil dikembalikan ke default.' });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mereset foto profil.' });
  }
});

module.exports = {
  router,
  authMiddleware,
  adminMiddleware,
  vaultAuthMiddleware
};

