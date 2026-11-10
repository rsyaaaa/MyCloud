import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { triggerMediaEvent } from '../utils/mediaEvents';

const TransferContext = createContext(null);

const COMPLETED_UPLOADS_KEY = 'mycloud_completed_uploads';
const COMPLETED_DOWNLOADS_KEY = 'mycloud_completed_downloads';

function loadPersistedList(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function savePersistedList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

export function TransferProvider({ children }) {
  const [uploads, setUploads] = useState(() => loadPersistedList(COMPLETED_UPLOADS_KEY));
  const [downloads, setDownloads] = useState(() => loadPersistedList(COMPLETED_DOWNLOADS_KEY));

  // Failure indicator for the floating button
  const [hasFailure, setHasFailure] = useState(false);
  const [failedProgress, setFailedProgress] = useState(0);
  const [pendingFailurePopup, setPendingFailurePopup] = useState(null);

  // References to active AbortControllers / XHRs so user can cancel
  const abortControllersRef = useRef({});
  const activeWorkerRef = useRef(false);

  // Sync completed lists to localStorage
  useEffect(() => {
    const completed = uploads.filter((u) => u.status === 'completed');
    savePersistedList(COMPLETED_UPLOADS_KEY, completed);
  }, [uploads]);

  useEffect(() => {
    const completed = downloads.filter((d) => d.status === 'completed');
    savePersistedList(COMPLETED_DOWNLOADS_KEY, completed);
  }, [downloads]);

  // Upload Queue Worker (FIFO: oldest queued item first)
  useEffect(() => {
    const isUploading = uploads.some((u) => u.status === 'uploading');
    if (isUploading || activeWorkerRef.current) return;

    const queuedUpload = uploads
      .filter((u) => u.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt)[0];

    if (queuedUpload) {
      processNextUpload(queuedUpload);
    }
  }, [uploads]);

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk

  const processNextUpload = async (uploadItem) => {
    activeWorkerRef.current = true;
    const { id, file, categoryId } = uploadItem;

    const controller = new AbortController();
    abortControllersRef.current[id] = controller;

    // Mark as uploading
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'uploading', speed: 0 } : item))
    );

    let lastLoaded = 0;
    let lastTime = Date.now();
    let currentSpeed = 0;

    const updateSpeedAndProgress = (totalLoadedBytes, totalFileBytes) => {
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      if (timeDiff >= 0.4) {
        const bytesDiff = totalLoadedBytes - lastLoaded;
        currentSpeed = Math.max(0, bytesDiff / timeDiff);
        lastLoaded = totalLoadedBytes;
        lastTime = now;
      }
      const percent = Math.min(99, Math.round((totalLoadedBytes / totalFileBytes) * 100)) || 0;
      setUploads((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                progress: percent,
                loadedBytes: totalLoadedBytes,
                totalBytes: totalFileBytes,
                speed: currentSpeed
              }
            : item
        )
      );
    };

    try {
      // 1. SMALL FILE STRATEGY (<= 10MB):
      // Single HTTP POST request for fast low-overhead upload
      if (file.size <= CHUNK_SIZE) {
        const formData = new FormData();
        if (categoryId) {
          formData.append('category_id', categoryId);
        }
        formData.append('file', file);

        await api.uploadMedia(
          formData,
          (progress) => {
            updateSpeedAndProgress(progress.loaded, progress.total || file.size);
          },
          controller.signal
        );
      } else {
        // 2. LARGE & MONSTER FILE STRATEGY (> 10MB up to > 100GB):
        // Chunked streaming direct-to-disk with auto-retry and resume support
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        // Check if server already has partial chunks for resume
        let startChunk = 0;
        let accumulatedBytes = 0;
        try {
          const status = await api.getUploadStatus(id);
          if (status && status.exists && typeof status.nextChunkIndex === 'number') {
            startChunk = status.nextChunkIndex;
            accumulatedBytes = status.uploadedBytes || (startChunk * CHUNK_SIZE);
            lastLoaded = accumulatedBytes;
            console.log(`[Upload Resume] Melanjutkan ${file.name} dari chunk ${startChunk}/${totalChunks} (${accumulatedBytes} bytes tersimpan di server)`);
          }
        } catch (e) {
          startChunk = 0;
          accumulatedBytes = 0;
        }

        for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
          if (controller.signal.aborted) {
            throw new DOMException('Upload dibatalkan', 'AbortError');
          }

          const startByte = chunkIndex * CHUNK_SIZE;
          const endByte = Math.min(file.size, startByte + CHUNK_SIZE);
          const chunkBlob = file.slice(startByte, endByte);
          const chunkSize = endByte - startByte;

          // Chunk auto-retry loop (up to 3 attempts with 1.5s backoff on Wi-Fi packet drops)
          let chunkSuccess = false;
          let attempt = 0;
          const MAX_RETRIES = 3;

          while (!chunkSuccess && attempt < MAX_RETRIES) {
            if (controller.signal.aborted) {
              throw new DOMException('Upload dibatalkan', 'AbortError');
            }

            try {
              const chunkForm = new FormData();
              chunkForm.append('uploadId', id);
              chunkForm.append('chunkIndex', String(chunkIndex));
              chunkForm.append('totalChunks', String(totalChunks));
              chunkForm.append('totalSize', String(file.size));
              chunkForm.append('originalName', file.name);
              if (categoryId) chunkForm.append('category_id', categoryId);
              chunkForm.append('chunk', chunkBlob, file.name);

              let currentChunkLoaded = 0;
              await api.uploadChunk(
                chunkForm,
                (progress) => {
                  currentChunkLoaded = progress.loaded;
                  updateSpeedAndProgress(accumulatedBytes + currentChunkLoaded, file.size);
                },
                controller.signal
              );

              accumulatedBytes += chunkSize;
              chunkSuccess = true;
            } catch (chunkErr) {
              if (controller.signal.aborted) throw chunkErr;
              attempt++;
              if (attempt >= MAX_RETRIES) {
                throw new Error(`Gagal mengirim bagian ${chunkIndex + 1}/${totalChunks} setelah 3 percobaan: ${chunkErr.message}`);
              }
              console.warn(`[Upload Retry] Chunk ${chunkIndex} gagal (${attempt}/${MAX_RETRIES}). Mengulang dalam 1.5 detik...`, chunkErr);
              await new Promise((r) => setTimeout(r, 1500));
            }
          }
        }
      }

      // Successfully uploaded!
      setUploads((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'completed',
                progress: 100,
                loadedBytes: file.size,
                speed: 0,
                completedAt: Date.now()
              }
            : item
        )
      );

      // Trigger reactive events to refresh galleries & files
      triggerMediaEvent({ type: 'upload', category_id: categoryId || null });
    } catch (err) {
      if (controller.signal.aborted) {
        setUploads((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'cancelled', speed: 0 } : item))
        );
      } else {
        const errorMsg = err.message || 'Gagal mengunggah berkas.';
        const failedAt = uploadItem.progress || 10;
        setUploads((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'failed',
                  error: errorMsg,
                  failedAtProgress: failedAt,
                  speed: 0
                }
              : item
          )
        );

        // Turn floating button red and stop at failed point
        setHasFailure(true);
        setFailedProgress(failedAt);
        setPendingFailurePopup({
          title: 'Upload Gagal',
          fileName: uploadItem.name,
          reason: errorMsg
        });
      }
    } finally {
      delete abortControllersRef.current[id];
      activeWorkerRef.current = false;
    }
  };

  // Start uploading files (can be multiple files)
  const startUpload = (files, targetFolder = null) => {
    const fileList = Array.isArray(files) ? files : Array.from(files || []);
    if (fileList.length === 0) return;

    const now = Date.now();
    const newItems = fileList.map((file, idx) => ({
      id: 'up_' + now + '_' + idx + '_' + Math.random().toString(36).substring(2, 8),
      type: 'upload',
      name: file.name,
      size: file.size,
      file,
      categoryId: targetFolder?.id || null,
      categoryName: targetFolder?.name || null,
      status: 'queued',
      progress: 0,
      loadedBytes: 0,
      totalBytes: file.size,
      speed: 0,
      error: null,
      failedAtProgress: 0,
      createdAt: now + idx,
      completedAt: null
    }));

    setUploads((prev) => [...newItems, ...prev]);
  };

  const cancelUpload = (id) => {
    if (abortControllersRef.current[id]) {
      try {
        abortControllersRef.current[id].abort();
      } catch (e) {}
    }
    // Clean up partial chunks on server
    api.abortUpload(id).catch(() => {});
    setUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const retryUpload = (id) => {
    setUploads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'queued', error: null, speed: 0 } : item
      )
    );
  };

  const removeUpload = (id) => {
    setUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompletedUploads = () => {
    setUploads((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  // Start background download with progress tracking
  const startDownload = (media) => {
    if (!media || !media.id) return;

    const downloadId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const fileName = media.original_name || media.display_name || 'download';
    const totalBytes = media.file_size || 0;

    const newDownload = {
      id: downloadId,
      type: 'download',
      mediaId: media.id,
      name: fileName,
      size: totalBytes,
      status: 'downloading',
      progress: 0,
      loadedBytes: 0,
      totalBytes,
      speed: 0,
      error: null,
      failedAtProgress: 0,
      createdAt: Date.now(),
      completedAt: null
    };

    setDownloads((prev) => [newDownload, ...prev]);

    const xhr = new XMLHttpRequest();
    abortControllersRef.current[downloadId] = xhr;

    xhr.open('GET', api.getDownloadUrl(media.id));
    xhr.responseType = 'blob';
    xhr.withCredentials = true;

    const token = localStorage.getItem('mycloud_auth_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    let lastLoaded = 0;
    let lastTime = Date.now();
    let currentSpeed = 0;

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        if (timeDiff >= 0.4) {
          const bytesDiff = event.loaded - lastLoaded;
          currentSpeed = bytesDiff / timeDiff;
          lastLoaded = event.loaded;
          lastTime = now;
        }

        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));

        setDownloads((prev) =>
          prev.map((item) =>
            item.id === downloadId
              ? {
                  ...item,
                  progress: percent,
                  loadedBytes: event.loaded,
                  totalBytes: event.total,
                  speed: currentSpeed
                }
              : item
          )
        );
      }
    };

    xhr.onload = () => {
      delete abortControllersRef.current[downloadId];
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response;
        const objectUrl = URL.createObjectURL(blob);

        // Programmatically trigger browser save
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

        setDownloads((prev) =>
          prev.map((item) =>
            item.id === downloadId
              ? {
                  ...item,
                  status: 'completed',
                  progress: 100,
                  loadedBytes: item.totalBytes || totalBytes,
                  speed: 0,
                  completedAt: Date.now()
                }
              : item
          )
        );
      } else {
        const errorMsg = `Server mengembalikan status ${xhr.status}`;
        setDownloads((prev) =>
          prev.map((item) =>
            item.id === downloadId
              ? { ...item, status: 'failed', error: errorMsg, failedAtProgress: item.progress || 10, speed: 0 }
              : item
          )
        );
        setHasFailure(true);
        setFailedProgress(25);
        setPendingFailurePopup({
          title: 'Download Gagal',
          fileName,
          reason: errorMsg
        });
      }
    };

    xhr.onerror = () => {
      delete abortControllersRef.current[downloadId];
      const errorMsg = 'Koneksi jaringan terputus saat mengunduh berkas.';
      setDownloads((prev) =>
        prev.map((item) =>
          item.id === downloadId
            ? { ...item, status: 'failed', error: errorMsg, failedAtProgress: item.progress || 10, speed: 0 }
            : item
        )
      );
      setHasFailure(true);
      setFailedProgress(30);
      setPendingFailurePopup({
        title: 'Download Gagal',
        fileName,
        reason: errorMsg
      });
    };

    xhr.onabort = () => {
      delete abortControllersRef.current[downloadId];
      setDownloads((prev) => prev.filter((item) => item.id !== downloadId));
    };

    xhr.send();
  };

  const cancelDownload = (id) => {
    if (abortControllersRef.current[id]) {
      abortControllersRef.current[id].abort();
    }
    setDownloads((prev) => prev.filter((item) => item.id !== id));
  };

  const retryDownload = (id) => {
    const item = downloads.find((d) => d.id === id);
    if (!item) return;
    setDownloads((prev) => prev.filter((d) => d.id !== id));
    startDownload({ id: item.mediaId, original_name: item.name, file_size: item.size });
  };

  const removeDownload = (id) => {
    setDownloads((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompletedDownloads = () => {
    setDownloads((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  // Called when user opens Transfer List: clears the floating failure indicator!
  const clearTransferFailureIndicator = () => {
    setHasFailure(false);
  };

  const dismissFailurePopup = () => {
    setPendingFailurePopup(null);
  };

  // Derived statistics
  const activeUploads = uploads.filter((u) => u.status === 'uploading' || u.status === 'queued');
  const activeDownloads = downloads.filter((d) => d.status === 'downloading');
  const completedUploads = uploads.filter((u) => u.status === 'completed');
  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const failedUploads = uploads.filter((u) => u.status === 'failed');
  const failedDownloads = downloads.filter((d) => d.status === 'failed');

  const isUploading = activeUploads.length > 0;
  const isDownloading = activeDownloads.length > 0;

  // Calculate overall progress for floating button
  let overallProgress = 0;
  if (hasFailure) {
    overallProgress = failedProgress || 20;
  } else if (isUploading) {
    const current = activeUploads.find((u) => u.status === 'uploading');
    overallProgress = current ? current.progress : 15;
  } else if (isDownloading) {
    const totalProg = activeDownloads.reduce((acc, d) => acc + d.progress, 0);
    overallProgress = Math.round(totalProg / activeDownloads.length);
  }

  return (
    <TransferContext.Provider
      value={{
        uploads,
        downloads,
        activeUploads,
        activeDownloads,
        completedUploads,
        completedDownloads,
        failedUploads,
        failedDownloads,
        activeTransfersCount: activeUploads.length + activeDownloads.length,
        isUploading,
        isDownloading,
        hasFailure,
        overallProgress,
        pendingFailurePopup,
        startUpload,
        cancelUpload,
        retryUpload,
        removeUpload,
        clearCompletedUploads,
        startDownload,
        cancelDownload,
        retryDownload,
        removeDownload,
        clearCompletedDownloads,
        clearTransferFailureIndicator,
        dismissFailurePopup
      }}
    >
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const context = useContext(TransferContext);
  if (!context) {
    throw new Error('useTransfer must be used within a TransferProvider');
  }
  return context;
}

