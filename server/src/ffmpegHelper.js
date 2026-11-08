const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

function execPromise(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`${error.message}\nStderr: ${stderr}`));
      }
      resolve(stdout);
    });
  });
}

/**
 * Probe media file to extract width, height, duration, rotation, and is_portrait.
 */
async function probeMedia(filePath) {
  try {
    const stdout = await execPromise(config.FFPROBE_PATH, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    const data = JSON.parse(stdout);
    const videoStream = (data.streams || []).find(
      s => s.codec_type === 'video' || s.codec_type === 'image'
    ) || (data.streams || [])[0];

    let width = null;
    let height = null;
    let duration = 0;
    let rotation = 0;
    let capturedAt = null;

    if (videoStream) {
      width = parseInt(videoStream.width, 10) || null;
      height = parseInt(videoStream.height, 10) || null;

      // Check rotation in tags or side_data
      if (videoStream.tags && videoStream.tags.rotate) {
        rotation = parseInt(videoStream.tags.rotate, 10) || 0;
      } else if (videoStream.side_data_list) {
        const sideData = videoStream.side_data_list.find(s => s.rotation !== undefined);
        if (sideData) {
          rotation = Math.abs(parseInt(sideData.rotation, 10)) || 0;
        }
      }

      // Check creation time tag
      if (videoStream.tags && (videoStream.tags.creation_time || videoStream.tags.date)) {
        capturedAt = videoStream.tags.creation_time || videoStream.tags.date;
      }
    }

    if (data.format) {
      if (data.format.duration) {
        duration = Math.round(parseFloat(data.format.duration)) || 0;
      }
      if (!capturedAt && data.format.tags && (data.format.tags.creation_time || data.format.tags.date)) {
        capturedAt = data.format.tags.creation_time || data.format.tags.date;
      }
    }

    // Determine portrait orientation
    // If rotation is 90 or 270, effective width and height are inverted
    let effWidth = width;
    let effHeight = height;
    if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
      effWidth = height;
      effHeight = width;
    }

    const isPortrait = effWidth && effHeight ? (effHeight > effWidth ? 1 : 0) : 0;

    return {
      width: effWidth || width,
      height: effHeight || height,
      duration_seconds: duration,
      is_portrait: isPortrait,
      rotation,
      captured_at: capturedAt ? new Date(capturedAt).toISOString() : null
    };
  } catch (err) {
    console.warn(`[probeMedia] Could not probe ${filePath}:`, err.message);
    return {
      width: null,
      height: null,
      duration_seconds: 0,
      is_portrait: 0,
      rotation: 0,
      captured_at: null
    };
  }
}

/**
 * Generate a WebP thumbnail for images, videos, and documents (PDF, DOCX, etc.).
 */
async function generateThumbnail(sourcePath, destPath, mediaType) {
  try {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (mediaType === 'document') {
      const scriptPath = path.join(__dirname, 'renderDocThumb.py');
      await execPromise('python3', [scriptPath, sourcePath, destPath]);
      return fs.existsSync(destPath);
    }

    const scaleFilter = 'scale=480:-1:flags=lanczos';

    if (mediaType === 'video') {
      try {
        // Try seeking to 1s
        await execPromise(config.FFMPEG_PATH, [
          '-y',
          '-ss', '00:00:01',
          '-i', sourcePath,
          '-vf', scaleFilter,
          '-vframes', '1',
          '-q:v', '75',
          destPath
        ]);
      } catch (seekErr) {
        // Fallback to start of video for short clips (< 1s)
        await execPromise(config.FFMPEG_PATH, [
          '-y',
          '-i', sourcePath,
          '-vf', scaleFilter,
          '-vframes', '1',
          '-q:v', '75',
          destPath
        ]);
      }
    } else {
      // Image thumbnail
      await execPromise(config.FFMPEG_PATH, [
        '-y',
        '-i', sourcePath,
        '-vf', scaleFilter,
        '-vframes', '1',
        '-q:v', '80',
        destPath
      ]);
    }
    return true;
  } catch (err) {
    console.error(`[generateThumbnail] Failed to generate thumbnail for ${sourcePath}:`, err.message);
    return false;
  }
}

module.exports = {
  probeMedia,
  generateThumbnail
};

