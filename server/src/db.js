const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const db = new sqlite3.Database(config.DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
  } else {
    console.log(`Connected to SQLite database at ${config.DB_PATH}`);
  }
});

// Promisified wrappers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Initialize tables according to PRD Schema
async function initDb() {
  await exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -64000;
    PRAGMA temp_store = MEMORY;
    PRAGMA mmap_size = 268435456;

    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      pin_hash VARCHAR(255) NULL,
      role VARCHAR(20) DEFAULT 'regular_user',
      storage_quota_bytes BIGINT DEFAULT 16106127360,
      used_storage_bytes BIGINT DEFAULT 0,
      avatar_url TEXT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media_files (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_name VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      media_type VARCHAR(20) NOT NULL,
      width INT NULL,
      height INT NULL,
      duration_seconds INT DEFAULT 0,
      is_portrait BOOLEAN DEFAULT 0,
      is_locked BOOLEAN DEFAULT 0,
      is_favorite BOOLEAN DEFAULT 0,
      is_trash BOOLEAN DEFAULT 0,
      deleted_at TIMESTAMP WITH TIME ZONE NULL,
      captured_at TIMESTAMP WITH TIME ZONE NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories_folders (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) DEFAULT 'folder',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media_category_rel (
      media_id VARCHAR(36) REFERENCES media_files(id) ON DELETE CASCADE,
      category_id VARCHAR(36) REFERENCES categories_folders(id) ON DELETE CASCADE,
      PRIMARY KEY (media_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS watch_progress (
      user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
      media_id VARCHAR(36) REFERENCES media_files(id) ON DELETE CASCADE,
      last_position_seconds INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, media_id)
    );

    CREATE TABLE IF NOT EXISTS storage_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requested_bytes BIGINT NOT NULL,
      reason TEXT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Column Migrations for existing databases
  try {
    await exec("ALTER TABLE users ADD COLUMN avatar_url TEXT NULL;");
  } catch (e) {} // Column already exists

  try {
    await exec("ALTER TABLE media_files ADD COLUMN is_trash BOOLEAN DEFAULT 0;");
  } catch (e) {}

  try {
    await exec("ALTER TABLE media_files ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;");
  } catch (e) {}

  // Performance Indexes for HDD seek optimization & fast folder/gallery listing
  try {
    await exec(`
      CREATE INDEX IF NOT EXISTS idx_media_files_user_status ON media_files(user_id, is_locked, is_trash);
      CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(media_type);
      CREATE INDEX IF NOT EXISTS idx_media_files_fav ON media_files(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_media_files_created ON media_files(created_at);
      CREATE INDEX IF NOT EXISTS idx_media_category_rel_cat ON media_category_rel(category_id);
      CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories_folders(user_id, type);
    `);
  } catch (e) {
    console.warn('Index migration note:', e.message);
  }

  console.log('Database tables & migrations verified in WAL mode.');

  // Run expired trash cleanup (> 31 days)
  await cleanExpiredTrash();

  // Seed default admin user if none exists
  const existingAdmin = await get("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  if (!existingAdmin) {
    const adminId = uuidv4();
    const adminPasswordHash = bcrypt.hashSync('admin12345', 10);
    const adminPinHash = bcrypt.hashSync('123456', 10);
    
    // Create physical folders for admin
    const userRoot = path.join(config.USERS_DIR, adminId);
    fs.mkdirSync(path.join(userRoot, 'uploads'), { recursive: true });
    fs.mkdirSync(path.join(userRoot, 'thumbnails'), { recursive: true });
    fs.mkdirSync(path.join(userRoot, 'vault'), { recursive: true });

    await run(
      `INSERT INTO users (id, username, password_hash, pin_hash, role, storage_quota_bytes, used_storage_bytes)
       VALUES (?, ?, ?, ?, 'admin', ?, 0)`,
      [adminId, 'admin', adminPasswordHash, adminPinHash, config.DEFAULT_ADMIN_QUOTA]
    );

    // Seed default genre categories for admin
    const defaultGenres = ['Vlog', 'Series', 'Short', 'Clip', 'Dokumentasi'];
    for (const genre of defaultGenres) {
      await run(
        `INSERT INTO categories_folders (id, user_id, name, type) VALUES (?, ?, ?, 'genre')`,
        [uuidv4(), adminId, genre]
      );
    }

    console.log('========================================================');
    console.log('Default Admin Account Created:');
    console.log('  Username: admin');
    console.log('  Password: admin12345');
    console.log('  Safe Vault Default PIN: 123456');
    console.log('========================================================');
  }

  // Seed default Public Shared user if none exists
  const existingPublic = await get("SELECT * FROM users WHERE username = 'public' LIMIT 1");
  if (!existingPublic) {
    const publicId = uuidv4();
    const publicRoot = path.join(config.USERS_DIR, publicId);
    fs.mkdirSync(path.join(publicRoot, 'uploads'), { recursive: true });
    fs.mkdirSync(path.join(publicRoot, 'thumbnails'), { recursive: true });
    fs.mkdirSync(path.join(publicRoot, 'vault'), { recursive: true });

    await run(
      `INSERT INTO users (id, username, password_hash, role, storage_quota_bytes, used_storage_bytes)
       VALUES (?, 'public', '', 'public', ?, 0)`,
      [publicId, config.DEFAULT_PUBLIC_QUOTA]
    );

    console.log('========================================================');
    console.log('Public Shared User Account Created (50 GB quota):');
    console.log('  Username: public (No password required)');
    console.log('========================================================');
  } else if (existingPublic.storage_quota_bytes !== config.DEFAULT_PUBLIC_QUOTA) {
    await run("UPDATE users SET storage_quota_bytes = ? WHERE id = ?", [config.DEFAULT_PUBLIC_QUOTA, existingPublic.id]);
  }
}

/**
 * Automatically purge trash files deleted > 31 days ago
 */
async function cleanExpiredTrash() {
  try {
    const expired = await all(
      `SELECT id, user_id, file_path, thumbnail_path, file_size 
       FROM media_files 
       WHERE is_trash = 1 AND deleted_at <= datetime('now', '-31 days')`
    );

    for (const item of expired) {
      if (fs.existsSync(item.file_path)) {
        try { fs.unlinkSync(item.file_path); } catch (e) {}
      }
      if (item.thumbnail_path && fs.existsSync(item.thumbnail_path)) {
        try { fs.unlinkSync(item.thumbnail_path); } catch (e) {}
      }
      await run('DELETE FROM media_files WHERE id = ?', [item.id]);
      await run('UPDATE users SET used_storage_bytes = MAX(0, used_storage_bytes - ?) WHERE id = ?', [item.file_size, item.user_id]);
    }

    if (expired.length > 0) {
      console.log(`[Auto-Trash] Bersihkan ${expired.length} file sampah kadaluwarsa (> 31 hari).`);
    }
  } catch (err) {
    console.warn('[Auto-Trash] Gagal membersihkan sampah kadaluwarsa:', err.message);
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  exec,
  initDb,
  cleanExpiredTrash
};

