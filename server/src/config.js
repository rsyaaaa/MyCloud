const path = require('path');
const os = require('os');
const fs = require('fs');

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Physical host storage directory
const STORAGE_ROOT = process.env.STORAGE_ROOT || '/home/autofocusxioo/nas_data';

// Ensure root directories exist
const DB_DIR = path.join(STORAGE_ROOT, 'db');
const USERS_DIR = path.join(STORAGE_ROOT, 'users');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'nas.db');

// JWT secrets
const JWT_SECRET = process.env.JWT_SECRET || 'nas-super-secret-local-jwt-token-2026';
const VAULT_SECRET = process.env.VAULT_SECRET || 'nas-super-secret-vault-pin-token-2026';

// Default quota for regular users: 15 GB (in bytes)
const DEFAULT_USER_QUOTA = 15 * 1024 * 1024 * 1024; // 16,106,127,360 bytes
// Admin quota: 500 GB
const DEFAULT_ADMIN_QUOTA = 500 * 1024 * 1024 * 1024;
// Public shared user quota: 50 GB
const DEFAULT_PUBLIC_QUOTA = 50 * 1024 * 1024 * 1024;

// Find ffmpeg & ffprobe executable
function resolveBinary(name) {
  const localBin = path.join(os.homedir(), '.local', 'bin', name);
  if (fs.existsSync(localBin)) return localBin;
  const sysBin = `/usr/bin/${name}`;
  if (fs.existsSync(sysBin)) return sysBin;
  const localSysBin = `/usr/local/bin/${name}`;
  if (fs.existsSync(localSysBin)) return localSysBin;
  return name;
}

const FFMPEG_PATH = process.env.FFMPEG_PATH || resolveBinary('ffmpeg');
const FFPROBE_PATH = process.env.FFPROBE_PATH || resolveBinary('ffprobe');

module.exports = {
  PORT,
  HOST,
  STORAGE_ROOT,
  DB_PATH,
  USERS_DIR,
  JWT_SECRET,
  VAULT_SECRET,
  DEFAULT_USER_QUOTA,
  DEFAULT_ADMIN_QUOTA,
  DEFAULT_PUBLIC_QUOTA,
  FFMPEG_PATH,
  FFPROBE_PATH
};

