import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Heart, MoreVertical, Play, Pause, Volume2, VolumeX,
  RotateCcw, RotateCw, FolderPlus, Folder, FolderInput, FolderMinus,
  Trash2, Info, Download, Lock, Unlock, ChevronLeft, ChevronRight,
  ChevronDown, Check, Plus, X
} from 'lucide-react';
import MediaDetailModal from '../components/MediaDetailModal';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { recordRecentItem } from '../utils/recentHistory';
import { useTransfer } from '../context/TransferContext';
import { useLanguage } from '../context/LanguageContext';
import { triggerMediaEvent } from '../utils/mediaEvents';

function formatGooglePhotosDate(isoString, lang = 'id') {
  if (!isoString) return { dateStr: 'MyCloud', timeStr: '' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { dateStr: 'MyCloud', timeStr: '' };

  const dateStr = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });

  const timeStr = d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return { dateStr, timeStr };
}

function formatSeconds(sec) {
  if (isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MobileMediaDetailView({
  isOpen,
  mediaList = [],
  currentIndex = 0,
  onClose,
  onNavigate,
  onRename,
  onOrganize,
  onToggleFavorite,
  onLock,
  onUnlock,
  onDelete,
  isVault = false,
  vaultToken = null
}) {
  const { lang, t } = useLanguage();
  const { startDownload } = useTransfer();

  const currentMedia = mediaList ? mediaList[currentIndex] : null;
  const hasPrev = currentIndex > 0;
  const hasNext = Boolean(mediaList && currentIndex < mediaList.length - 1);

  // UI Visibility & 5s Auto-Hide Timer
  const [isUIVisible, setIsUIVisible] = useState(true);
  const hideTimerRef = useRef(null);

  // Resume Watch Progress State
  const [resumePromptSeconds, setResumePromptSeconds] = useState(null);
  const resumeTimerRef = useRef(null);

  // Closing Animation State (Zoom Out)
  const [isClosing, setIsClosing] = useState(false);

  // Modals & Bottom Sheets
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);

  const showDetailModalRef = useRef(showDetailModal);
  showDetailModalRef.current = showDetailModal;
  const moreMenuOpenRef = useRef(moreMenuOpen);
  moreMenuOpenRef.current = moreMenuOpen;
  const folderSheetOpenRef = useRef(folderSheetOpen);
  folderSheetOpenRef.current = folderSheetOpen;

  // History helpers for viewer sub-sheets
  const openDetailModal = () => {
    window.history.pushState({ type: 'viewer_subsheet', sheet: 'detail' }, '', '#detail');
    setShowDetailModal(true);
  };
  const closeDetailModal = () => {
    if (window.history.state?.type === 'viewer_subsheet') {
      window.history.back();
    } else {
      setShowDetailModal(false);
    }
  };

  const openMoreMenu = () => {
    window.history.pushState({ type: 'viewer_subsheet', sheet: 'more' }, '', '#more');
    setMoreMenuOpen(true);
  };
  const closeMoreMenu = () => {
    if (window.history.state?.type === 'viewer_subsheet') {
      window.history.back();
    } else {
      setMoreMenuOpen(false);
    }
  };

  const openFolderSheet = () => {
    window.history.pushState({ type: 'viewer_subsheet', sheet: 'folder' }, '', '#folder');
    setFolderSheetOpen(true);
  };
  const closeFolderSheet = () => {
    if (window.history.state?.type === 'viewer_subsheet') {
      window.history.back();
    } else {
      setFolderSheetOpen(false);
    }
  };

  // Popstate listener inside viewer to close sub-sheets without exiting viewer
  useEffect(() => {
    if (!isOpen) return;

    const handleViewerPopState = (e) => {
      if (showDetailModalRef.current) {
        setShowDetailModal(false);
        e.stopImmediatePropagation();
        return;
      }
      if (moreMenuOpenRef.current) {
        setMoreMenuOpen(false);
        e.stopImmediatePropagation();
        return;
      }
      if (folderSheetOpenRef.current) {
        setFolderSheetOpen(false);
        e.stopImmediatePropagation();
        return;
      }
    };

    window.addEventListener('popstate', handleViewerPopState);
    return () => window.removeEventListener('popstate', handleViewerPopState);
  }, [isOpen]);

  // Folders & Organization State
  const [categories, setCategories] = useState([]);
  const [mediaFolderId, setMediaFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Video State
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState(null); // { side: 'left' | 'right', text: '-5s' | '+5s' }

  // Touch & Double-Tap Tracking
  const lastTapRef = useRef({ time: 0, x: 0 });
  const singleTapTimeoutRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0, isHorizontal: null });
  const didDragRef = useRef(false);

  // Interactive Touch Slide / Drag Physics State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideState, setSlideState] = useState('idle'); // 'idle' | 'sliding-out-right' | 'sliding-out-left' | 'entering-from-left' | 'entering-from-right'

  // Zoom & Pan State (Google Photos Style: 2-finger pinch, 1-finger pan, double-tap toggle)
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomTranslate, setZoomTranslate] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const zoomScaleRef = useRef(zoomScale);
  zoomScaleRef.current = zoomScale;
  const zoomTranslateRef = useRef(zoomTranslate);
  zoomTranslateRef.current = zoomTranslate;

  const pinchStartRef = useRef(null);
  const panStartRef = useRef(null);

  // Reset zoom on media change or close
  useEffect(() => {
    setZoomScale(1);
    setZoomTranslate({ x: 0, y: 0 });
    setIsPinching(false);
    setIsPanning(false);
  }, [currentIndex, isOpen]);

  // 1. Auto-hide timer functions
  const clearAutoHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const resetAutoHideTimer = () => {
    clearAutoHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsUIVisible(false);
    }, 5000);
  };

  // Reset UI and start 5s timer on media change or open
  useEffect(() => {
    if (isOpen && currentMedia) {
      setIsUIVisible(true);
      resetAutoHideTimer();
      recordRecentItem(currentMedia);
    }
    return () => clearAutoHideTimer();
  }, [currentIndex, isOpen, currentMedia?.id]);

  // Load Categories & detect folder for currentMedia
  useEffect(() => {
    if (!isOpen || !currentMedia) return;
    let isMounted = true;

    api.listCategories()
      .then((res) => {
        if (isMounted) setCategories(res.categories || []);
      })
      .catch(() => {});

    api.getMediaCategories(currentMedia.id)
      .then((res) => {
        if (isMounted) {
          const cats = res.categories || [];
          if (cats.length > 0) {
            setMediaFolderId(cats[0].id);
          } else if (currentMedia.category_id) {
            setMediaFolderId(currentMedia.category_id);
          } else {
            setMediaFolderId(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) setMediaFolderId(currentMedia.category_id || null);
      });

    return () => {
      isMounted = false;
    };
  }, [currentMedia?.id, isOpen]);

  // Check saved watch progress for video
  // Video always starts from 0s immediately; if progress exists (> 5s), show floating resume pill
  useEffect(() => {
    setResumePromptSeconds(null);
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    if (!isOpen || !currentMedia || currentMedia.media_type !== 'video') return;
    let isMounted = true;

    api.getProgress(currentMedia.id)
      .then((data) => {
        if (isMounted && data?.last_position_seconds > 5) {
          setResumePromptSeconds(data.last_position_seconds);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };
  }, [currentMedia?.id, isOpen]);

  // 5-second auto-dismiss timer for floating resume pill
  useEffect(() => {
    if (resumePromptSeconds) {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        setResumePromptSeconds(null);
      }, 5000);
      return () => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      };
    }
  }, [resumePromptSeconds]);

  // Animated Close handler (Zoom Out + Backdrop Fade Out)
  const handleAnimatedClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    clearAutoHideTimer();
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setTimeout(() => {
      // If history was pushed for this viewer, use history.back() so history stays consistent
      if (window.history.state?.type === 'viewer') {
        window.history.back();
      } else {
        onClose();
      }
      setIsClosing(false);
    }, 220);
  };

  // Reset drag state on index change
  useEffect(() => {
    setDragX(0);
    setIsDragging(false);
  }, [currentIndex]);

  // Slide Navigation Helper (Smooth animated slide between items)
  // direction 'next': current slides out to LEFT, next enters from RIGHT
  // direction 'prev': current slides out to RIGHT, prev enters from LEFT
  const navigateWithSlide = (targetIndex, direction) => {
    if (slideState !== 'idle' || isClosing) return;
    if (targetIndex < 0 || targetIndex >= (mediaList?.length || 0)) return;

    if (direction === 'next') {
      // Slide out to LEFT -> next item enters from RIGHT
      setSlideState('sliding-out-left');
      setTimeout(() => {
        onNavigate(targetIndex);
        setDragX(0);
        setSlideState('entering-from-right');
        setTimeout(() => setSlideState('idle'), 220);
      }, 180);
    } else {
      // Slide out to RIGHT -> prev item enters from LEFT
      setSlideState('sliding-out-right');
      setTimeout(() => {
        onNavigate(targetIndex);
        setDragX(0);
        setSlideState('entering-from-left');
        setTimeout(() => setSlideState('idle'), 220);
      }, 180);
    }
  };

  // Keyboard navigation & ESC listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleAnimatedClose();
      } else if (e.key === 'ArrowRight' && hasNext) {
        navigateWithSlide(currentIndex + 1, 'next');
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        navigateWithSlide(currentIndex - 1, 'prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClosing, slideState, currentIndex, hasNext, hasPrev]);

  // Resume playback from saved position
  const handleResumePlayback = (e) => {
    e?.stopPropagation();
    if (videoRef.current && resumePromptSeconds) {
      videoRef.current.currentTime = resumePromptSeconds;
      setCurrentTime(resumePromptSeconds);
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
    setResumePromptSeconds(null);
  };

  // Periodic video progress saver
  useEffect(() => {
    if (!isOpen || !currentMedia || currentMedia.media_type !== 'video' || !isPlaying) return;

    const interval = setInterval(() => {
      if (videoRef.current && currentTime > 3) {
        api.saveProgress(currentMedia.id, Math.floor(currentTime)).catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, currentMedia?.id, isPlaying, currentTime]);

  if (!isOpen || !currentMedia) return null;

  const isInFolder = Boolean(mediaFolderId);

  const mediaSrc = isVault
    ? api.getVaultStreamUrl(currentMedia.id, vaultToken)
    : api.getStreamUrl(currentMedia.id);

  const posterUrl = isVault
    ? api.getVaultThumbnailUrl(currentMedia.id, vaultToken)
    : api.getThumbnailUrl(currentMedia.id);

  const { dateStr, timeStr } = formatGooglePhotosDate(
    currentMedia.captured_at || currentMedia.created_at || currentMedia.upload_date,
    lang
  );

  // Video Handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    resetAutoHideTimer();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    resetAutoHideTimer();
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
    setResumePromptSeconds(null);
    resetAutoHideTimer();
  };

  const triggerSeekFeedback = (side, text) => {
    setSeekFeedback({ side, text });
    setTimeout(() => {
      setSeekFeedback(null);
    }, 700);
  };

  // Screen Click: Single Tap (Toggle UI) vs Double Tap (Toggle Zoom or Skip Video)
  const handleScreenClick = (e) => {
    // If user just finished dragging/panning, ignore click
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    // If clicked inside interactive controls, do not handle screen tap
    if (e.target.closest('button, input, [role="button"], a, .interactive-control')) {
      return;
    }

    const now = Date.now();
    const tapX = e.clientX;
    const tapY = e.clientY;
    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(tapX - lastTapRef.current.x) + Math.abs(tapY - (lastTapRef.current.y || 0));

    // Double-tap threshold: < 300ms and close proximity (< 80px)
    if (timeDiff < 300 && distDiff < 80) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      // 1. If currently zoomed in (> 1.05x), double-tap anywhere (especially center) resets to normal!
      if (zoomScaleRef.current > 1.05) {
        setZoomScale(1);
        setZoomTranslate({ x: 0, y: 0 });
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return;
      }

      // 2. If at normal 1x scale:
      const screenWidth = window.innerWidth;
      const isCenter = tapX >= screenWidth * 0.22 && tapX <= screenWidth * 0.78;

      // On video: if tapped near outer edges (< 22% or > 78%), skip -5s / +5s
      // If tapped in center area on video, OR double-tapped anywhere on photo: ZOOM IN to 2.5x!
      if (currentMedia.media_type === 'video' && videoRef.current && !isCenter) {
        setResumePromptSeconds(null);
        if (tapX < screenWidth * 0.22) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          triggerSeekFeedback('left', '-5s');
        } else {
          const maxDur = videoRef.current.duration || duration || 99999;
          videoRef.current.currentTime = Math.min(maxDur, videoRef.current.currentTime + 5);
          triggerSeekFeedback('right', '+5s');
        }
        resetAutoHideTimer();
      } else {
        // Double-tap in center on video OR anywhere on photo: ZOOM IN to 2.5x!
        setZoomScale(2.5);
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const offsetX = (centerX - tapX) * 0.75;
        const offsetY = (centerY - tapY) * 0.75;
        setZoomTranslate({ x: offsetX, y: offsetY });
      }

      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      lastTapRef.current = { time: now, x: tapX, y: tapY };

      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }

      singleTapTimeoutRef.current = setTimeout(() => {
        // Single tap: toggle UI visibility
        setIsUIVisible((prev) => {
          const next = !prev;
          if (next) {
            resetAutoHideTimer();
          } else {
            clearAutoHideTimer();
          }
          return next;
        });
        singleTapTimeoutRef.current = null;
      }, 250);
    }
  };

  // Touch Gesture Handling:
  // - 2-Finger Pinch: Smooth Pinch-to-Zoom (up to 5x)
  // - 1-Finger Pan (when zoomed): Drag around to inspect photo/video details
  // - 1-Finger Swipe (when 1x normal): Real-time horizontal slide physics & swipe-down to close
  const handleTouchStart = (e) => {
    if (isClosing || slideState !== 'idle') return;
    if (e.target.closest('button, input, [role="button"], a, .interactive-control')) {
      return;
    }

    // 1. Two-finger pinch gesture start
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartRef.current = {
        dist,
        initialScale: zoomScaleRef.current,
        initialX: zoomTranslateRef.current.x,
        initialY: zoomTranslateRef.current.y,
        center: {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        }
      };
      setIsPinching(true);
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      return;
    }

    // 2. One-finger touch start
    if (e.touches.length === 1) {
      const touch = e.touches[0];

      // If already zoomed in (> 1.05x), single finger pans the zoomed photo/video
      if (zoomScaleRef.current > 1.05) {
        panStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          initialX: zoomTranslateRef.current.x,
          initialY: zoomTranslateRef.current.y,
          time: Date.now()
        };
        setIsPanning(true);
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
          singleTapTimeoutRef.current = null;
        }
        return;
      }

      // If normal scale (1x), single finger prepares horizontal slide or swipe-down to close
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        isHorizontal: null
      };
    }
  };

  const handleTouchMove = (e) => {
    if (isClosing || slideState !== 'idle') return;

    // 1. Pinching with 2 fingers
    if (e.touches.length === 2 && pinchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = currentDist / Math.max(1, pinchStartRef.current.dist);
      let nextScale = pinchStartRef.current.initialScale * ratio;
      nextScale = Math.min(5, Math.max(0.8, nextScale));
      setZoomScale(nextScale);

      const currentCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
      const diffCenterX = currentCenter.x - pinchStartRef.current.center.x;
      const diffCenterY = currentCenter.y - pinchStartRef.current.center.y;
      setZoomTranslate({
        x: pinchStartRef.current.initialX + diffCenterX,
        y: pinchStartRef.current.initialY + diffCenterY
      });
      return;
    }

    // 2. Panning with 1 finger when zoomed in
    if (e.touches.length === 1 && panStartRef.current && zoomScaleRef.current > 1.05) {
      const touch = e.touches[0];
      const diffX = touch.clientX - panStartRef.current.x;
      const diffY = touch.clientY - panStartRef.current.y;

      const scale = zoomScaleRef.current;
      const maxPanX = (scale - 1) * window.innerWidth * 0.5;
      const maxPanY = (scale - 1) * window.innerHeight * 0.5;

      const rawX = panStartRef.current.initialX + diffX;
      const rawY = panStartRef.current.initialY + diffY;

      // Allow slight elastic rubber-banding beyond boundaries
      const clampedX = Math.max(-maxPanX * 1.15, Math.min(maxPanX * 1.15, rawX));
      const clampedY = Math.max(-maxPanY * 1.15, Math.min(maxPanY * 1.15, rawY));

      setZoomTranslate({ x: clampedX, y: clampedY });
      didDragRef.current = true;
      return;
    }

    // 3. Normal horizontal slide / swipe-down handling (when at 1x)
    if (!touchStartRef.current.time) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartRef.current.x;
    const diffY = currentY - touchStartRef.current.y;

    if (touchStartRef.current.isHorizontal === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          touchStartRef.current.isHorizontal = true;
          setIsDragging(true);
          if (singleTapTimeoutRef.current) {
            clearTimeout(singleTapTimeoutRef.current);
            singleTapTimeoutRef.current = null;
          }
        } else {
          touchStartRef.current.isHorizontal = false;
        }
      }
    }

    if (touchStartRef.current.isHorizontal) {
      if (diffX < 0 && !hasNext) {
        setDragX(diffX * 0.25);
      } else if (diffX > 0 && !hasPrev) {
        setDragX(diffX * 0.25);
      } else {
        setDragX(diffX);
      }
    }
  };

  const handleTouchEnd = (e) => {
    // 1. Release pinch gesture
    if (pinchStartRef.current) {
      pinchStartRef.current = null;
      setIsPinching(false);
      if (zoomScaleRef.current < 1.08) {
        setZoomScale(1);
        setZoomTranslate({ x: 0, y: 0 });
      } else {
        const finalScale = Math.min(4.5, zoomScaleRef.current);
        setZoomScale(finalScale);
        const maxPanX = (finalScale - 1) * window.innerWidth * 0.5;
        const maxPanY = (finalScale - 1) * window.innerHeight * 0.5;
        setZoomTranslate((prev) => ({
          x: Math.max(-maxPanX, Math.min(maxPanX, prev.x)),
          y: Math.max(-maxPanY, Math.min(maxPanY, prev.y))
        }));
      }
      return;
    }

    // 2. Release pan gesture
    if (panStartRef.current) {
      panStartRef.current = null;
      setIsPanning(false);
      const scale = zoomScaleRef.current;
      const maxPanX = (scale - 1) * window.innerWidth * 0.5;
      const maxPanY = (scale - 1) * window.innerHeight * 0.5;
      setZoomTranslate((prev) => ({
        x: Math.max(-maxPanX, Math.min(maxPanX, prev.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, prev.y))
      }));
      setTimeout(() => {
        didDragRef.current = false;
      }, 200);
      return;
    }

    // 3. Normal horizontal slide / swipe-down handling
    if (!touchStartRef.current.time) return;

    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const timeDiff = Math.max(1, Date.now() - touchStartRef.current.time);
    const velocityX = Math.abs(diffX) / timeDiff;

    setIsDragging(false);

    const isHorizontal = touchStartRef.current.isHorizontal === true ||
      (touchStartRef.current.isHorizontal === null && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 18);

    if (isHorizontal) {
      didDragRef.current = true;
      setTimeout(() => {
        didDragRef.current = false;
      }, 300);

      const threshold = 35;
      const isFlick = timeDiff < 350 && Math.abs(diffX) > 15 && velocityX > 0.2;

      if ((diffX < -threshold || (diffX < 0 && isFlick)) && hasNext) {
        setSlideState('sliding-out-left');
        setTimeout(() => {
          onNavigate(currentIndex + 1);
          setDragX(0);
          setSlideState('entering-from-right');
          setTimeout(() => setSlideState('idle'), 220);
        }, 180);
      } else if ((diffX > threshold || (diffX > 0 && isFlick)) && hasPrev) {
        setSlideState('sliding-out-right');
        setTimeout(() => {
          onNavigate(currentIndex - 1);
          setDragX(0);
          setSlideState('entering-from-left');
          setTimeout(() => setSlideState('idle'), 220);
        }, 180);
      } else {
        setDragX(0);
      }
    } else {
      if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX) * 1.5 && timeDiff < 400) {
        handleAnimatedClose();
      }
    }

    touchStartRef.current = { x: 0, y: 0, time: 0, isHorizontal: null };
  };

  const handleTouchCancel = () => {
    setIsDragging(false);
    setIsPinching(false);
    setIsPanning(false);
    pinchStartRef.current = null;
    panStartRef.current = null;
    setDragX(0);
    touchStartRef.current = { x: 0, y: 0, time: 0, isHorizontal: null };
  };

  // Folder Move / Assign Handler
  const handleAssignFolder = async (folderId) => {
    try {
      await api.assignCategories(currentMedia.id, folderId ? [folderId] : []);
      setMediaFolderId(folderId);
      setFolderSheetOpen(false);
      triggerMediaEvent({ type: 'organize' });
    } catch (err) {
      console.error('Failed to assign folder:', err);
    }
  };

  // Create New Folder & Move Handler
  const handleCreateFolderAndMove = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || creatingFolder) return;
    setCreatingFolder(true);
    try {
      const data = await api.createCategory(newFolderName.trim(), 'folder');
      const newFolder = data.category;
      setCategories((prev) => [...prev, newFolder]);
      await api.assignCategories(currentMedia.id, [newFolder.id]);
      setMediaFolderId(newFolder.id);
      setNewFolderName('');
      setFolderSheetOpen(false);
      triggerMediaEvent({ type: 'organize' });
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Calculate dynamic style and class for smooth horizontal slide transitions & touch drag
  let slideClassName = '';
  let slideStyle = {};

  if (slideState === 'sliding-out-left') {
    slideStyle = {
      transform: 'translateX(-100vw)',
      opacity: 0,
      transition: 'transform 180ms cubic-bezier(0.4, 0, 1, 1), opacity 180ms ease-out'
    };
  } else if (slideState === 'sliding-out-right') {
    slideStyle = {
      transform: 'translateX(100vw)',
      opacity: 0,
      transition: 'transform 180ms cubic-bezier(0.4, 0, 1, 1), opacity 180ms ease-out'
    };
  } else if (slideState === 'entering-from-right') {
    slideClassName = 'animate-slide-in-right';
  } else if (slideState === 'entering-from-left') {
    slideClassName = 'animate-slide-in-left';
  } else {
    slideStyle = {
      transform: `translateX(${dragX}px)`,
      opacity: isDragging ? Math.max(0.7, 1 - Math.abs(dragX) / 800) : 1,
      transition: isDragging ? 'none' : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease-out'
    };
  }

  // Google Photos style Media Zoom & Pan CSS style
  const mediaZoomStyle = {
    transform: `translate(${zoomTranslate.x}px, ${zoomTranslate.y}px) scale(${zoomScale})`,
    transformOrigin: 'center center',
    transition: isPinching || isPanning ? 'none' : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform'
  };

  return (
    <div
      onClick={handleScreenClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={`fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none touch-pan-y ${
        isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
      }`}
    >
      {/* 1. TOP HEADER BAR (Google Photos Style: ← Back, Date & Time, Heart, More) */}
      <header
        className={`absolute top-0 inset-x-0 h-16 px-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent flex items-center justify-between z-30 transition-all duration-200 ease-in-out ${
          isUIVisible && !isClosing
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Back button with animated close */}
        <button
          onClick={handleAnimatedClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-transform"
          title="Kembali"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
        </button>

        {/* Center: Google Photos Date & Time */}
        <div
          onClick={openDetailModal}
          className="flex flex-col items-center justify-center cursor-pointer active:opacity-75 transition-opacity px-2"
        >
          <div className="flex items-center gap-1">
            <span className="text-white text-[14.5px] font-medium leading-snug">
              {dateStr}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-white/70 stroke-[2.5]" />
          </div>
          {timeStr && (
            <span className="text-white/60 text-[11px] font-mono leading-tight">
              {timeStr}
            </span>
          )}
        </div>

        {/* Right: Heart (Favorite) & Three Dots (More) */}
        <div className="flex items-center gap-1">
          {/* Favorite Love Button */}
          <button
            onClick={() => onToggleFavorite(currentMedia.id, !currentMedia.is_favorite)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-transform"
            title={currentMedia.is_favorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                currentMedia.is_favorite
                  ? 'text-[#EF4444] fill-[#EF4444]'
                  : 'text-white stroke-[2.2]'
              }`}
            />
          </button>

          {/* Three Dots More Menu */}
          <button
            onClick={openMoreMenu}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-transform"
            title="Menu lainnya"
          >
            <MoreVertical className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* FLOATING RESUME WATCH CONFIRMATION PILL (Floating right below top navbar) */}
      {resumePromptSeconds && isUIVisible && !isClosing && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-18 inset-x-0 mx-auto w-fit max-w-[92vw] z-40 px-3.5 py-1.5 rounded-full bg-[#18181F]/90 backdrop-blur-md border border-white/20 text-white flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <button
            onClick={handleResumePlayback}
            className="text-[12px] font-medium flex items-center gap-2 text-white/90 hover:text-white active:scale-95 transition-transform"
          >
            <div className="w-5 h-5 rounded-full bg-[#C2410C]/25 text-[#EA580C] flex items-center justify-center shrink-0">
              <RotateCcw className="w-3 h-3 stroke-[2.5]" />
            </div>
            <span>
              {lang === 'en' ? 'Resume from' : 'Lanjutkan dari'}{' '}
              <strong className="text-white font-mono font-semibold">{formatSeconds(resumePromptSeconds)}</strong>
            </span>
          </button>
          <div className="w-px h-3.5 bg-white/20" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setResumePromptSeconds(null);
            }}
            className="p-1 -mr-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            title={lang === 'en' ? 'Dismiss' : 'Tutup'}
          >
            <X className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>
      )}

      {/* 2. CENTER MEDIA DISPLAY (Outer container handles Zoom-in & Zoom-out) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className={`relative flex-1 w-full min-h-0 h-full flex items-center justify-center overflow-hidden touch-pan-y ${
          isClosing ? 'animate-media-zoom-out' : 'animate-media-zoom-in'
        }`}
      >
        {/* Inner Media Slide Container (Handles Touch Drag & Slide Transitions) */}
        <div
          style={slideStyle}
          className={`w-full h-full flex items-center justify-center select-none touch-pan-y ${slideClassName}`}
        >
          {currentMedia.media_type === 'video' ? (
            <div className="relative w-full h-full flex items-center justify-center p-1 sm:p-2 overflow-hidden">
              <div
                style={mediaZoomStyle}
                className="w-full h-full flex items-center justify-center pointer-events-none"
              >
                <video
                  ref={videoRef}
                  src={mediaSrc}
                  poster={posterUrl}
                  autoPlay
                  playsInline
                  preload="auto"
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuration(videoRef.current.duration || 0);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    api.saveProgress(currentMedia.id, 0).catch(() => {});
                  }}
                  className="max-w-full max-h-full object-contain select-none"
                />
              </div>

              {/* Center Big Play Icon when Paused */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs active:scale-90 transition-transform shadow-2xl z-20 pointer-events-auto"
                >
                  <Play className="w-8 h-8 fill-white ml-1" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-1 overflow-hidden">
              <div
                style={mediaZoomStyle}
                className="w-full h-full flex items-center justify-center pointer-events-none"
              >
                <img
                  key={currentMedia.id}
                  src={mediaSrc}
                  alt={currentMedia.display_name}
                  className="max-w-full max-h-full object-contain select-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Floating Zoom Indicator & Quick Reset Badge */}
        {zoomScale > 1.05 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoomScale(1);
              setZoomTranslate({ x: 0, y: 0 });
            }}
            className="absolute bottom-20 right-4 z-40 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[12px] font-mono font-medium shadow-2xl active:scale-90 transition-transform flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
            title="Ketuk untuk kembali ke ukuran normal (1x)"
          >
            <span className="font-bold text-[#EA580C]">{Math.round(zoomScale * 10) / 10}x</span>
            <span className="text-white/60 text-[10px]">✕ Reset</span>
          </button>
        )}

        {/* Double-Tap 5s Skip Animated Feedback Indicator */}
        {seekFeedback && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center bg-black/70 text-white px-5 py-3 rounded-full animate-enter backdrop-blur-sm ${
              seekFeedback.side === 'left' ? 'left-8' : 'right-8'
            }`}
          >
            {seekFeedback.side === 'left' ? (
              <RotateCcw className="w-6 h-6 animate-spin text-[#EA580C]" />
            ) : (
              <RotateCw className="w-6 h-6 animate-spin text-[#EA580C]" />
            )}
            <span className="text-[12px] font-mono font-bold mt-1 text-white">
              {seekFeedback.text}
            </span>
          </div>
        )}

        {/* Previous / Next Subtle Nav Chevrons (shown only when not zoomed in) */}
        {hasPrev && zoomScale <= 1.05 && (
          <button
            onClick={() => navigateWithSlide(currentIndex - 1, 'prev')}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center active:scale-90 transition-all duration-300 ${
              isUIVisible && !isClosing ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {hasNext && zoomScale <= 1.05 && (
          <button
            onClick={() => navigateWithSlide(currentIndex + 1, 'next')}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center active:scale-90 transition-all duration-300 ${
              isUIVisible && !isClosing ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* 3. BOTTOM OVERLAY CONTAINER (Video Controls + Menu Bar) */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent z-30 flex flex-col transition-all duration-200 ease-in-out ${
          isUIVisible && !isClosing
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Video Scrubber & Play/Time/Sound Controls (Google Photos Video Controls) */}
        {currentMedia.media_type === 'video' && (
          <div className="w-full px-4 pt-2 pb-1 space-y-2">
            {/* Top row: Play/Pause, Elapsed/Total Time, Mute */}
            <div className="flex items-center justify-between px-1 text-white">
              <button
                onClick={togglePlay}
                className="p-1.5 text-white active:scale-90 transition-transform"
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-white stroke-[1.5]" />
                ) : (
                  <Play className="w-5 h-5 fill-white stroke-[1.5] ml-0.5" />
                )}
              </button>

              <span className="text-[12.5px] font-mono font-medium text-white/90 tracking-tight">
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </span>

              <button
                onClick={toggleMute}
                className="p-1.5 text-white active:scale-90 transition-transform"
                title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 stroke-[2]" />
                ) : (
                  <Volume2 className="w-5 h-5 stroke-[2]" />
                )}
              </button>
            </div>

            {/* Google Photos White Progress Scrubber Bar */}
            <div className="relative flex items-center h-5 w-full cursor-pointer px-1">
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%`
                  }}
                />
              </div>

              {/* Native touch range slider overlaid */}
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {/* White Circular Thumb Handle */}
              <div
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md pointer-events-none -translate-x-1/2 transition-all duration-75"
                style={{
                  left: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Menu Bar: [Add to / Move to] and [Trash] */}
        <footer className="h-16 px-6 pb-2 flex items-center justify-around text-white border-t border-white/10">
          {/* Add to / Move to Folder Button */}
          <button
            onClick={openFolderSheet}
            className="flex flex-col items-center gap-1 text-white/90 active:scale-95 transition-all"
          >
            {isInFolder ? (
              <FolderInput className="w-6 h-6 stroke-[1.8]" />
            ) : (
              <FolderPlus className="w-6 h-6 stroke-[1.8]" />
            )}
            <span className="text-[11px] font-medium tracking-tight">
              {isInFolder
                ? lang === 'en' ? 'Move to' : 'Pindahkan'
                : lang === 'en' ? 'Add to' : 'Tambah ke'}
            </span>
          </button>

          {/* Trash Button */}
          <button
            onClick={() => onDelete(currentMedia.id)}
            className="flex flex-col items-center gap-1 text-white/90 hover:text-[#EF4444] active:scale-95 transition-all"
          >
            <Trash2 className="w-6 h-6 stroke-[1.8]" />
            <span className="text-[11px] font-medium tracking-tight">
              {lang === 'en' ? 'Trash' : 'Sampah'}
            </span>
          </button>
        </footer>
      </div>

      {/* 4. THREE-DOTS MENU BOTTOM SHEET (About & Download) */}
      {moreMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-enter"
          onClick={closeMoreMenu}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#18181E] border-t border-white/10 rounded-t-[24px] p-5 pb-8 shadow-2xl text-white space-y-2 animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />

            {/* About this Photo / Video */}
            <button
              onClick={() => {
                closeMoreMenu();
                openDetailModal();
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-[14px] hover:bg-white/10 text-[14px] font-medium transition-colors text-left"
            >
              <Info className="w-5 h-5 text-white/80 shrink-0" />
              <span>
                {currentMedia.media_type === 'video'
                  ? lang === 'en' ? 'About this video' : 'Rincian video ini'
                  : lang === 'en' ? 'About this photo' : 'Rincian foto ini'}
              </span>
            </button>

            {/* Download */}
            <button
              onClick={() => {
                closeMoreMenu();
                startDownload(currentMedia);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-[14px] hover:bg-white/10 text-[14px] font-medium transition-colors text-left"
            >
              <Download className="w-5 h-5 text-white/80 shrink-0" />
              <span>
                {currentMedia.media_type === 'video'
                  ? lang === 'en' ? 'Download video' : 'Unduh video'
                  : lang === 'en' ? 'Download photo' : 'Unduh foto'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 5. ADD TO / MOVE TO BOTTOM SHEET (Folders + Safe Vault Option) */}
      {folderSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-enter"
          onClick={closeFolderSheet}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#18181E] border-t border-white/10 rounded-t-[24px] p-5 pb-8 shadow-2xl text-white space-y-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-semibold text-white">
                {isInFolder
                  ? lang === 'en' ? 'Move to Folder / Vault' : 'Pindahkan Foto / Video'
                  : lang === 'en' ? 'Add to Folder / Vault' : 'Tambahkan ke Folder / Brankas'}
              </h3>
              <button
                onClick={closeFolderSheet}
                className="p-1 rounded-full text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option A: Move to Safe Vault (Brankas Rahasia) */}
            <button
              onClick={() => {
                closeFolderSheet();
                onLock(currentMedia.id);
              }}
              className="w-full p-3.5 rounded-[16px] bg-[#2A140A] border border-[#C2410C]/40 flex items-center justify-between text-left active:scale-98 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md">
                  <Lock className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="font-semibold text-[13.5px] text-white">
                    {lang === 'en' ? 'Move to Safe Vault' : 'Pindahkan ke Brankas Rahasia'}
                  </p>
                  <p className="text-[11.5px] text-[#FB923C]/85">
                    {lang === 'en' ? 'Hide and lock securely with vault PIN' : 'Sembunyikan & amankan dengan PIN/password'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FB923C]" />
            </button>

            {/* Option B: Folder List */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-mono uppercase font-bold tracking-wider text-white/50 px-1">
                {lang === 'en' ? 'Choose Folder' : 'Pilih Folder Tujuan'}
              </p>

              {categories.length === 0 ? (
                <p className="text-[12.5px] text-white/60 p-2">
                  {lang === 'en' ? 'No folders yet. Create one below!' : 'Belum ada folder. Buat baru di bawah!'}
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {categories.map((folder) => {
                    const isCurrent = folder.id === mediaFolderId;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => handleAssignFolder(folder.id)}
                        className={`w-full p-3 rounded-[14px] border flex items-center justify-between text-left transition-colors ${
                          isCurrent
                            ? 'bg-[#C2410C]/20 border-[#C2410C]/50 text-[#FB923C]'
                            : 'bg-[#1E1E28] border-white/10 text-white hover:bg-[#252532]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Folder className="w-5 h-5 text-[#C2410C] shrink-0" />
                          <span className="font-medium text-[13px] truncate">
                            {folder.name}
                          </span>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-[#C2410C]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Option C: Create New Folder Form */}
            <form onSubmit={handleCreateFolderAndMove} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder={lang === 'en' ? 'New folder name...' : 'Nama folder baru...'}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 bg-[#1E1E28] border border-white/10 rounded-[12px] px-3.5 py-2.5 text-[13px] text-white placeholder-white/40 outline-none focus:border-[#C2410C]"
              />
              <button
                type="submit"
                disabled={!newFolderName.trim() || creatingFolder}
                className="btn-primary px-4 py-2.5 rounded-[12px] text-[13px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.2]" />
                <span>{lang === 'en' ? 'Create' : 'Buat'}</span>
              </button>
            </form>

            {/* Option D: Remove from folder if already in folder */}
            {isInFolder && (
              <button
                onClick={() => handleAssignFolder(null)}
                className="w-full p-2.5 rounded-[12px] text-left text-white/70 hover:text-white text-[12px] flex items-center gap-2"
              >
                <FolderMinus className="w-4 h-4 text-white/50" />
                <span>
                  {lang === 'en' ? 'Remove from folder (Move to root)' : 'Keluarkan dari folder (Pindah ke Root)'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. METADATA INFO MODAL (Opened from Date / Three-Dots About) */}
      <MediaDetailModal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        media={currentMedia}
      />
    </div>
  );
}
