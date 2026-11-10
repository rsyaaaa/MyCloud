/**
 * activeTransfers.js
 * In-memory real-time registry of active uploads and downloads across users.
 * Allows the admin dashboard to monitor live data transfers without revealing filenames.
 */

class ActiveTransferManager {
  constructor() {
    this.transfers = new Map();
  }

  /**
   * Register or update an active upload transfer
   */
  updateUpload({ uploadId, userId, username, totalBytes, uploadedBytes }) {
    if (!uploadId) return;

    let item = this.transfers.get(uploadId);
    if (!item) {
      item = {
        id: uploadId,
        userId,
        username: username || 'User',
        type: 'upload',
        totalBytes: totalBytes || 0,
        transferredBytes: 0,
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.transfers.set(uploadId, item);
    }

    if (totalBytes) item.totalBytes = totalBytes;
    if (uploadedBytes !== undefined) item.transferredBytes = uploadedBytes;
    if (username) item.username = username;
    item.updatedAt = Date.now();

    item.progress = item.totalBytes > 0
      ? Math.min(99, Math.round((item.transferredBytes / item.totalBytes) * 100))
      : 0;
  }

  /**
   * Complete or remove an upload transfer
   */
  finishUpload(uploadId) {
    if (!uploadId) return;
    this.transfers.delete(uploadId);
  }

  /**
   * Register an active download transfer
   */
  startDownload({ downloadId, userId, username, totalBytes }) {
    if (!downloadId) return;
    this.transfers.set(downloadId, {
      id: downloadId,
      userId,
      username: username || 'User',
      type: 'download',
      totalBytes: totalBytes || 0,
      transferredBytes: 0,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  /**
   * Update streamed download chunk progress
   */
  updateDownload({ downloadId, chunkBytes }) {
    const item = this.transfers.get(downloadId);
    if (!item) return;

    item.transferredBytes += chunkBytes;
    item.updatedAt = Date.now();
    item.progress = item.totalBytes > 0
      ? Math.min(99, Math.round((item.transferredBytes / item.totalBytes) * 100))
      : 0;
  }

  /**
   * Complete or remove a download transfer
   */
  finishDownload(downloadId) {
    if (!downloadId) return;
    this.transfers.delete(downloadId);
  }

  /**
   * Retrieve active transfers, purging stale items (> 45s without update)
   */
  getActiveTransfers() {
    const now = Date.now();
    const active = [];

    for (const [id, item] of this.transfers.entries()) {
      // Purge dead connections that didn't cleanly abort
      if (now - item.updatedAt > 45000) {
        this.transfers.delete(id);
      } else {
        active.push({
          id: item.id,
          userId: item.userId,
          username: item.username,
          type: item.type, // 'upload' | 'download'
          totalBytes: item.totalBytes,
          transferredBytes: item.transferredBytes,
          progress: item.progress,
          startedAt: item.createdAt,
          updatedAt: item.updatedAt
        });
      }
    }

    return active;
  }
}

const activeTransferManager = new ActiveTransferManager();
module.exports = activeTransferManager;

