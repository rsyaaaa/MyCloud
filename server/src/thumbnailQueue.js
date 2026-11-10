const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./db');
const { probeMedia, generateThumbnail } = require('./ffmpegHelper');

class ThumbnailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Enqueue a media processing task (asynchronous, non-blocking)
   * @param {Object} item { mediaId, filePath, mediaType, userId }
   */
  enqueue(item) {
    if (!item || !item.mediaId || !item.filePath) return;
    this.queue.push(item);
    this.processNext();
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const task = this.queue.shift();
    try {
      await this.processItem(task);
    } catch (err) {
      console.error(`[ThumbnailQueue] Error processing media ${task.mediaId}:`, err.message);
    } finally {
      this.processing = false;
      // Yield to the event loop so I/O operations & uploads have breathing room
      setImmediate(() => this.processNext());
    }
  }

  async processItem({ mediaId, filePath, mediaType, userId }) {
    if (!fs.existsSync(filePath)) {
      console.warn(`[ThumbnailQueue] File does not exist for media ${mediaId}: ${filePath}`);
      return;
    }

    console.log(`[ThumbnailQueue] Processing metadata and thumbnail for ${mediaId} (${mediaType})...`);

    // 1. Probe video/image metadata
    let probe = { width: null, height: null, duration_seconds: 0, is_portrait: 0, captured_at: null };
    if (mediaType !== 'document') {
      try {
        probe = await probeMedia(filePath);
      } catch (e) {
        console.warn(`[ThumbnailQueue] Probe failed for ${mediaId}:`, e.message);
      }
    }

    // 2. Generate thumbnail WebP
    const thumbDir = path.join(config.USERS_DIR, userId, 'thumbnails');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    const thumbPath = path.join(thumbDir, `${mediaId}.webp`);
    let thumbOk = false;
    try {
      thumbOk = await generateThumbnail(filePath, thumbPath, mediaType);
    } catch (e) {
      console.warn(`[ThumbnailQueue] Thumbnail generation failed for ${mediaId}:`, e.message);
    }

    const finalThumb = thumbOk && fs.existsSync(thumbPath) ? thumbPath : null;

    // 3. Update database record
    try {
      await db.run(
        `UPDATE media_files 
         SET thumbnail_path = COALESCE(?, thumbnail_path),
             width = COALESCE(?, width),
             height = COALESCE(?, height),
             duration_seconds = CASE WHEN ? > 0 THEN ? ELSE duration_seconds END,
             is_portrait = COALESCE(?, is_portrait),
             captured_at = COALESCE(?, captured_at)
         WHERE id = ?`,
        [
          finalThumb,
          probe.width,
          probe.height,
          probe.duration_seconds,
          probe.duration_seconds,
          probe.is_portrait,
          probe.captured_at,
          mediaId
        ]
      );
      console.log(`[ThumbnailQueue] Completed processing for ${mediaId}. Thumbnail: ${finalThumb ? 'OK' : 'None'}`);
      try {
        const stream = require('./stream');
        if (stream && typeof stream.invalidateStreamCache === 'function') {
          stream.invalidateStreamCache(mediaId);
        }
      } catch (e) {}
    } catch (dbErr) {
      console.error(`[ThumbnailQueue] DB update failed for ${mediaId}:`, dbErr.message);
    }
  }
}

const thumbnailQueue = new ThumbnailQueue();
module.exports = thumbnailQueue;
