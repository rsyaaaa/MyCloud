import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image, Video, Images, Heart, Play, Folder, ChevronDown, Check, ArrowUpDown, X, Tag, Trash2, CheckSquare
} from 'lucide-react';
import { api } from '../api';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { subscribeMediaEvent, triggerMediaEvent } from '../utils/mediaEvents';
import { useLanguage } from '../context/LanguageContext';

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function groupMediaByDate(mediaList, lang = 'id') {
  const groups = {};
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterday.toDateString();

  mediaList.forEach((item) => {
    const itemDate = new Date(item.captured_at || item.created_at);
    const dateStr = itemDate.toDateString();

    let title = '';
    if (dateStr === todayStr) {
      title = lang === 'en' ? 'Today' : 'Hari Ini';
    } else if (dateStr === yesterdayStr) {
      title = lang === 'en' ? 'Yesterday' : 'Kemarin';
    } else {
      title = itemDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
        year: itemDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }

    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(item);
  });

  return groups;
}

function getGridItemSpan(media) {
  const isVideo = media.media_type === 'video';
  const width = media.width || 0;
  const height = media.height || 0;
  const isPortrait = media.is_portrait === 1 || (height > width && height > 0);
  const isLandscape = media.is_portrait === 0 || (width > height && width > 0);

  // Landscape video or wide landscape photo spans 2 columns
  if (isLandscape && (isVideo || (width && height && width >= height * 1.25))) {
    return 'col-span-2 row-span-1';
  }

  // Very tall portrait photo or video spans 2 rows
  if (isPortrait && height >= width * 1.5) {
    return 'col-span-1 row-span-2';
  }

  // Standard square/subtle portrait spans 1x1
  return 'col-span-1 row-span-1';
}

const MEMORY_CAPTIONS = [
  'Mungkin Anda ingat?',
  'Ingatkah momen ini?',
  'Foto ini cocok untuk hari ini!',
  'Video ini cocok untuk hari ini!',
  'Kilas balik kenangan',
  'Momen indah untuk dikenang',
  'Senyum hari ini',
  'Momen tak terlupakan',
  'Waktu berlalu begitu cepat',
  'Koleksi sorotan Anda',
  'Diremix untuk Anda',
  'Sorotan istimewa',
  'Momen penuh tawa',
  'Cerita di balik lensa',
  'Kenangan hari kemarin',
  'Momen terbaik Anda',
  'Hari yang menyenangkan',
  'Perjalanan berharga'
];

export default function MobileGalleryView({
  searchQuery,
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress,
  onSelectionChange
}) {
  const { lang, t } = useLanguage();

  const [mediaList, setMediaList] = useState(() => {
    try {
      const type = localStorage.getItem('mycloud_pref_gallery_type') || 'all';
      const sort = localStorage.getItem('mycloud_pref_gallery_sort') || 'newest';
      const mediaTypeParam = type === 'all' ? 'gallery' : type;
      const cached = api.getCachedMedia ? api.getCachedMedia({ media_type: mediaTypeParam, sort }) : null;
      if (cached && cached.media) {
        return cached.media.filter((m) => m.media_type === 'image' || m.media_type === 'video');
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [categories, setCategories] = useState(() => {
    try {
      const cached = api.getCachedCategories ? api.getCachedCategories() : null;
      return (cached && cached.categories) || [];
    } catch (e) {
      return [];
    }
  });
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [loading, setLoading] = useState(() => mediaList.length === 0);
  const [page, setPage] = useState(1);
  const pageRef = useRef(page);
  pageRef.current = page;
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  // Independent Memories (Moments Carousel): remains stable even when Favorite / Collection filter is clicked
  const [memoriesList, setMemoriesList] = useState([]);

  // Filter & Toolbar States
  const [sortOption, setSortOption] = useState(() => {
    return localStorage.getItem('mycloud_pref_gallery_sort') || 'newest';
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [collectionMode, setCollectionMode] = useState(false);

  // Type Filter: 'all' -> 'photo' -> 'video' -> 'all'
  const [typeFilter, setTypeFilter] = useState(() => {
    return localStorage.getItem('mycloud_pref_gallery_type') || 'all';
  });

  const handleCycleTypeFilter = () => {
    setTypeFilter((prev) => {
      let next = 'all';
      if (prev === 'all') next = 'photo';
      else if (prev === 'photo') next = 'video';
      else next = 'all';
      localStorage.setItem('mycloud_pref_gallery_type', next);
      return next;
    });
  };

  // Handlers for Mutual Exclusive Toggle between Favorit and Koleksi
  const handleToggleFavorite = () => {
    setOnlyFavorite((prev) => {
      const next = !prev;
      if (next) {
        setCollectionMode(false);
        setSelectedCatId(null);
      }
      return next;
    });
  };

  const handleToggleCollection = () => {
    setCollectionMode((prev) => {
      const next = !prev;
      if (next) {
        setOnlyFavorite(false);
      }
      return next;
    });
    setSelectedCatId(null);
  };

  // Multi-Select Mode State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const isSelectionMode = selectedIds.size > 0;

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(isSelectionMode);
    }
  }, [isSelectionMode, onSelectionChange]);

  // Popstate listener for selection mode so Android back closes selection
  useEffect(() => {
    const handlePopSelection = () => {
      if (selectedIdsRef.current.size > 0) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('popstate', handlePopSelection);
    return () => window.removeEventListener('popstate', handlePopSelection);
  }, []);

  const enterSelectionMode = (mediaId) => {
    if (selectedIdsRef.current.size === 0) {
      window.history.pushState({ type: 'selection', mode: 'gallery' }, '', '#select');
    }
    setSelectedIds(new Set([mediaId]));
  };

  const clearSelection = () => {
    const savedY = window.scrollY;
    setSelectedIds(new Set());
    if (window.history.state?.type === 'selection') {
      window.history.back();
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' });
      });
    }
  };

  const toggleSelectItem = (mediaId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) {
        next.delete(mediaId);
        if (next.size === 0 && window.history.state?.type === 'selection') {
          window.history.back();
        }
      } else {
        next.add(mediaId);
      }
      return next;
    });
  };

  const handleLongPressItem = (media) => {
    if (selectedIdsRef.current.size === 0) {
      enterSelectionMode(media.id);
    } else {
      toggleSelectItem(media.id);
    }
  };

  // Touch handlers for long-press selection
  const touchTimerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const longPressTriggeredTimeRef = useRef(0);

  const handleTouchStart = (media, e) => {
    if (e.touches && e.touches.length > 1) return;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      touchTimerRef.current = null;
      longPressTriggeredTimeRef.current = Date.now();
      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (err) {}
      }
      handleLongPressItem(media);
    }, 450);
  };

  const handleTouchMove = (e) => {
    if (!touchTimerRef.current) return;
    const diffX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const diffY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (diffX > 16 || diffY > 16) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const changeSortOption = (sort) => {
    setSortOption(sort);
    localStorage.setItem('mycloud_pref_gallery_sort', sort);
  };

  const sortOptions = [
    { id: 'newest', label: lang === 'en' ? 'Newest' : 'Terbaru' },
    { id: 'oldest', label: lang === 'en' ? 'Oldest' : 'Terlama' },
    { id: 'name_asc', label: 'Nama (A - Z)' },
    { id: 'name_desc', label: 'Nama (Z - A)' },
    { id: 'size_desc', label: lang === 'en' ? 'Largest Size' : 'Ukuran Terbesar' }
  ];

  const getSortLabel = () => {
    const found = sortOptions.find((o) => o.id === sortOption);
    return found ? found.label : (lang === 'en' ? 'Sort' : 'Urutkan');
  };

  const loadData = async (silent = false) => {
    try {
      let mediaTypeParam = 'gallery';
      if (typeFilter === 'photo') mediaTypeParam = 'image';
      else if (typeFilter === 'video') mediaTypeParam = 'video';

      const currentLimit = silent ? Math.max(50, (pageRef.current || 1) * 50) : 50;
      const params = {
        media_type: mediaTypeParam,
        sort: sortOption,
        page: 1,
        limit: currentLimit
      };

      if (selectedCatId) {
        params.category_id = selectedCatId;
      }

      if (onlyFavorite) {
        params.is_favorite = '1';
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      // Check cache first: if present, render instantly in 0ms!
      const cached = api.getCachedMedia ? api.getCachedMedia(params) : null;
      if (cached && cached.media) {
        const list = (cached.media || []).filter(
          (m) => m.media_type === 'image' || m.media_type === 'video'
        );
        setMediaList(list);
        setHasMore(cached.hasMore ?? (list.length >= currentLimit));
        if (!silent) setPage(1);
        if (!silent) setLoading(false);
      } else if (!silent) {
        setLoading(true);
      }

      const [mediaRes, catRes] = await Promise.all([
        api.listMedia(params, { forceRefresh: !cached }),
        api.listCategories()
      ]);

      const list = (mediaRes.media || []).filter(
        (m) => m.media_type === 'image' || m.media_type === 'video'
      );

      setMediaList(list);
      if (!silent) setPage(1);
      setHasMore(mediaRes.hasMore ?? (list.length >= currentLimit));
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error('Failed to load mobile gallery:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Infinite Scroll fetcher for subsequent pages
  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      let mediaTypeParam = 'gallery';
      if (typeFilter === 'photo') mediaTypeParam = 'image';
      else if (typeFilter === 'video') mediaTypeParam = 'video';

      const params = {
        media_type: mediaTypeParam,
        sort: sortOption,
        page: nextPage,
        limit: 50
      };

      if (selectedCatId) params.category_id = selectedCatId;
      if (onlyFavorite) params.is_favorite = '1';
      if (searchQuery) params.search = searchQuery;

      const mediaRes = await api.listMedia(params);
      const newItems = (mediaRes.media || []).filter(
        (m) => m.media_type === 'image' || m.media_type === 'video'
      );

      if (newItems.length > 0) {
        setMediaList((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = newItems.filter((m) => !ids.has(m.id));
          return [...prev, ...fresh];
        });
        setPage(nextPage);
      }
      setHasMore(mediaRes.hasMore ?? (newItems.length >= 50));
    } catch (err) {
      console.error('Failed to load more media:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCatId, sortOption, onlyFavorite, typeFilter, searchQuery]);

  // Infinite Scroll IntersectionObserver (300px lookahead buffer)
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, sortOption, selectedCatId, onlyFavorite, typeFilter, searchQuery]);

  // Load 15 random memories independently from all visual media so it stays stable regardless of filter/sort/favorite state
  const loadMemories = async () => {
    try {
      const res = await api.listMedia({
        media_type: 'gallery',
        sort: 'newest',
        limit: 40
      });
      const allVisuals = (res.media || []).filter(
        (m) => m.media_type === 'image' || m.media_type === 'video'
      );
      if (allVisuals.length === 0) {
        setMemoriesList([]);
        return;
      }

      // Deterministic shuffle using id char codes so it stays stable across renders
      const sorted = [...allVisuals].sort((a, b) => {
        const hashA = (a.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const hashB = (b.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return (hashA % 97) - (hashB % 97);
      });

      const selected = sorted.slice(0, 15).map((item, idx) => {
        let caption = MEMORY_CAPTIONS[idx % MEMORY_CAPTIONS.length];
        if (item.media_type === 'video' && idx % 3 === 0) {
          caption = 'Klip';
        }
        return {
          ...item,
          memoryCaption: caption
        };
      });

      setMemoriesList(selected);
    } catch (err) {
      console.error('Failed to load gallery memories:', err);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  // Real-time reactive media listener
  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setMediaList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, is_favorite: event.is_favorite } : m))
        );
        setMemoriesList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, is_favorite: event.is_favorite } : m))
        );
        if (onlyFavorite && event.is_favorite === 0) {
          setMediaList((prev) => prev.filter((m) => m.id !== event.id));
        }
      } else if (event.type === 'delete' || event.type === 'lock') {
        setMediaList((prev) => prev.some((m) => m.id === event.id) ? prev.filter((m) => m.id !== event.id) : prev);
        setMemoriesList((prev) => prev.some((m) => m.id === event.id) ? prev.filter((m) => m.id !== event.id) : prev);
      } else if (event.type === 'rename') {
        setMediaList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, display_name: event.name } : m))
        );
        setMemoriesList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, display_name: event.name } : m))
        );
      } else if (event.type === 'organize') {
        // When organizing, gallery media items remain intact unless a specific folder is filtered
        api.listCategories().then((catRes) => setCategories(catRes.categories || [])).catch(() => {});
        if (selectedCatId) {
          const savedY = window.scrollY;
          loadData(true).then(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: savedY, behavior: 'instant' });
            });
          });
        }
      } else if (['upload', 'restore', 'unlock', 'rename_rollback', 'folder'].includes(event.type)) {
        loadData(true);
        loadMemories();
      }
    });
    return unsub;
  }, [selectedCatId, sortOption, onlyFavorite, searchQuery]);

  // Visual Folders (Folders that contain photos or videos)
  const visualFolders = useMemo(() => {
    return (categories || []).filter(
      (c) => c.visual_media_count > 0 || c.cover_media_id || (c.media_count > 0 && c.type === 'folder')
    );
  }, [categories]);

  const handleMediaClick = (items, index) => {
    // If long-press was triggered recently, swallow this synthetic click completely
    if (Date.now() - longPressTriggeredTimeRef.current < 800) {
      return;
    }
    const item = items[index];
    if (selectedIdsRef.current.size > 0) {
      if (item) toggleSelectItem(item.id);
      return;
    }
    if (item) recordRecentItem(item);
    if (onOpenViewer) onOpenViewer(items, index);
  };

  const isDateSort = sortOption === 'newest' || sortOption === 'oldest';

  // Group all media continuously when sorting by date (newest/oldest)
  const groupedMedia = useMemo(() => {
    if (!isDateSort) return {};
    return groupMediaByDate(mediaList, lang);
  }, [mediaList, lang, isDateSort]);

  // Displayed media list strictly in visual render order
  const displayedMediaList = useMemo(() => {
    if (!isDateSort) return mediaList;
    return Object.values(groupedMedia).flat();
  }, [isDateSort, groupedMedia, mediaList]);

  const toggleSelectAll = () => {
    const listToSelect = isDateSort ? displayedMediaList : mediaList;
    if (selectedIds.size === listToSelect.length && listToSelect.length > 0) {
      clearSelection();
    } else {
      if (selectedIds.size === 0) {
        window.history.pushState({ type: 'selection', mode: 'gallery' }, '', '#select');
      }
      setSelectedIds(new Set(listToSelect.map((m) => m.id)));
    }
  };

  const handleBulkFavorite = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const allItems = isDateSort ? displayedMediaList : mediaList;
    const selectedItems = allItems.filter(m => selectedIds.has(m.id));
    const anyNotFav = selectedItems.some(m => !m.is_favorite);
    const targetFav = anyNotFav ? 1 : 0;

    // Optimistically update
    setMediaList(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, is_favorite: targetFav } : m));
    clearSelection();

    for (const id of ids) {
      try {
        await api.toggleFavorite(id);
        triggerMediaEvent({ type: 'favorite', id, is_favorite: targetFav });
      } catch (e) {}
    }
  };

  const handleBulkOrganize = () => {
    const allItems = isDateSort ? displayedMediaList : mediaList;
    const selectedItems = allItems.filter(m => selectedIds.has(m.id));
    if (selectedItems.length === 0) return;
    if (onOrganize) onOrganize(selectedItems);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const count = ids.length;
    if (!window.confirm(`Pindahkan ${count} media ke Tempat Sampah?`)) return;

    setMediaList(prev => prev.filter(m => !selectedIds.has(m.id)));
    clearSelection();

    for (const id of ids) {
      try {
        await api.deleteMedia(id);
        triggerMediaEvent({ type: 'delete', id });
      } catch (e) {}
    }
  };

  return (
    <div className="pb-32 space-y-4 bg-[#FAFAFA] dark:bg-[#0B0B0E] text-[#0A0A0A] dark:text-[#F4F4F5] min-h-screen relative">
      {/* SELECTION BAR (When items are selected via long-press) */}
      {isSelectionMode && (
        <header className="fixed top-0 inset-x-0 z-50 bg-[#C2410C] text-white px-4 h-14 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-white/20 active:scale-90 transition-all text-white"
              title="Batal"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="font-semibold text-base font-sans tracking-tight text-white">
              {selectedIds.size} dipilih
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Select All Toggle */}
            <button
              onClick={toggleSelectAll}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white"
            >
              {selectedIds.size === (isDateSort ? displayedMediaList.length : mediaList.length) ? 'Batal Semua' : 'Semua'}
            </button>

            {/* Favorite Action */}
            <button
              onClick={handleBulkFavorite}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all text-white"
              title="Favorit"
            >
              <Heart className="w-5 h-5 fill-white" />
            </button>

            {/* Organize / Move to Folder Action */}
            <button
              onClick={handleBulkOrganize}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all text-white"
              title="Pindahkan ke folder"
            >
              <Folder className="w-5 h-5" />
            </button>

            {/* Delete / Move to Trash Action */}
            <button
              onClick={handleBulkDelete}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all text-white"
              title="Hapus"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}
      {/* 1. GOOGLE PHOTOS MEMORIES / HIGHLIGHTS CAROUSEL (Top Section: 15 Random Items, Horizontal Scroll, NO SCROLLBAR) */}
      {!selectedCatId && !searchQuery && memoriesList.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
              {lang === 'en' ? 'Memories' : 'Sorotan Kenangan'}
            </span>
            <span className="text-[11px] font-mono text-[#8E8E9E]">
              {memoriesList.length} momen
            </span>
          </div>

          <div
            className="flex gap-2.5 overflow-x-auto px-4 py-1 scrollbar-none no-scrollbar select-none"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {memoriesList.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => handleMediaClick(memoriesList, idx)}
                className="w-[142px] h-[195px] rounded-[22px] overflow-hidden shrink-0 relative cursor-pointer active:scale-95 transition-transform shadow-md border border-[#E8E8EC]/40 dark:border-[#22222E]/80 group select-none"
              >
                {/* Thumbnail */}
                <img
                  src={api.getThumbnailUrl(item.id)}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Video duration pill */}
                {item.media_type === 'video' && (
                  <div className="absolute top-2.5 right-2.5 bg-black/65 backdrop-blur-xs text-white text-[9.5px] font-mono font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span>{formatSeconds(item.duration_seconds)}</span>
                    <Play className="w-2.5 h-2.5 fill-white" />
                  </div>
                )}

                {/* Dark gradient overlay + Random Caption */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3">
                  <p className="text-[12.5px] font-semibold text-white leading-tight drop-shadow-md line-clamp-2">
                    {item.memoryCaption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. TOOLBAR ROW: Dropdown Sort, Button Favorit, Button Koleksi */}
      <div className="px-4 flex items-center justify-between gap-2">
        {/* Left: Dropdown Sort */}
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] text-[12px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA] active:scale-95 transition-all shadow-xs"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>{getSortLabel()}</span>
            <ChevronDown className="w-3 h-3 text-[#8E8E9E]" />
          </button>

          {sortDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortDropdownOpen(false)} />
              <div className="absolute left-0 top-9 mt-1 z-50 w-44 rounded-[14px] bg-white dark:bg-[#161622] border border-[#E8E8EC] dark:border-[#22222E] shadow-xl p-1 animate-enter">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      changeSortOption(opt.id);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-[12px] text-left transition-colors ${sortOption === opt.id
                        ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] font-semibold'
                        : 'hover:bg-[#F4F4F6] dark:hover:bg-[#1E1E2A] text-[#0A0A0A] dark:text-[#FAFAFA]'
                      }`}
                  >
                    <span>{opt.label}</span>
                    {sortOption === opt.id && <Check className="w-3.5 h-3.5 text-[#C2410C]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right buttons: Button Filter Media (Semua/Foto/Video), Button Favorit, Button Koleksi */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Button Filter Jenis Media: Semua -> Foto -> Video */}
          <button
            onClick={handleCycleTypeFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 border whitespace-nowrap shrink-0 ${typeFilter !== 'all'
                ? 'bg-[#FFF7ED] dark:bg-[#2A140A] text-[#C2410C] border-[#C2410C]/40 font-semibold shadow-xs'
                : 'bg-white dark:bg-[#14141B] border-[#E8E8EC] dark:border-[#22222E] text-[#0A0A0A] dark:text-[#FAFAFA]'
              }`}
            title="Filter Media (Semua / Foto / Video)"
          >
            {typeFilter === 'photo' ? (
              <Image className="w-3.5 h-3.5 text-[#C2410C]" />
            ) : typeFilter === 'video' ? (
              <Video className="w-3.5 h-3.5 text-[#C2410C]" />
            ) : (
              <Images className="w-3.5 h-3.5 text-[#8E8E9E]" />
            )}
            <span>
              {typeFilter === 'photo'
                ? (lang === 'en' ? 'Photos' : 'Foto')
                : typeFilter === 'video'
                  ? (lang === 'en' ? 'Videos' : 'Video')
                  : (lang === 'en' ? 'All' : 'Semua')}
            </span>
          </button>

          {/* Button Favorit */}
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 border whitespace-nowrap shrink-0 ${onlyFavorite
                ? 'bg-[#FEF2F2] dark:bg-[#2A0E0E] text-[#EF4444] border-[#EF4444]/40 font-semibold shadow-xs'
                : 'bg-white dark:bg-[#14141B] border-[#E8E8EC] dark:border-[#22222E] text-[#0A0A0A] dark:text-[#FAFAFA]'
              }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorite ? 'fill-[#EF4444] text-[#EF4444]' : 'text-[#8E8E9E]'}`} />
            <span>Favorit</span>
          </button>

          {/* Button Koleksi (Collection Mode) */}
          <button
            onClick={handleToggleCollection}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 border whitespace-nowrap shrink-0 ${collectionMode
                ? 'bg-[#FFF7ED] dark:bg-[#2A140A] text-[#C2410C] border-[#C2410C]/40 font-semibold shadow-xs'
                : 'bg-white dark:bg-[#14141B] border-[#E8E8EC] dark:border-[#22222E] text-[#0A0A0A] dark:text-[#FAFAFA]'
              }`}
          >
            <Folder className={`w-3.5 h-3.5 ${collectionMode ? 'fill-[#C2410C]/20 text-[#C2410C]' : 'text-[#8E8E9E]'}`} />
            <span>Koleksi</span>
          </button>
        </div>
      </div>

      {/* Active Collection Breadcrumb / Banner */}
      {selectedCatId && (
        <div className="mx-4 flex items-center justify-between p-2.5 rounded-[12px] bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/20 text-[#C2410C] text-[12.5px]">
          <div className="flex items-center gap-2 truncate mr-2">
            <Folder className="w-4 h-4 shrink-0 fill-[#C2410C]/20" />
            <span className="truncate">
              Koleksi: <strong>{categories.find((c) => c.id === selectedCatId)?.name || 'Folder'}</strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedCatId(null)}
            className="font-semibold underline shrink-0 flex items-center gap-1 active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            <span>Semua</span>
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT */}
      {loading ? (
        <div className="px-4">
          <MediaGridSkeleton count={12} />
        </div>
      ) : collectionMode && !selectedCatId ? (
        /* COLLECTION MODE: Displays Folders containing Photos & Videos */
        <div className="px-4 space-y-3">
          {visualFolders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#14141B] border border-dashed border-[#E8E8EC] dark:border-[#22222E] rounded-[18px] p-6">
              <Folder className="w-10 h-10 text-[#C2410C] mx-auto mb-2 opacity-50" />
              <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                Belum ada folder yang berisi foto atau video.
              </p>
              <p className="text-[11px] text-[#8E8E9E] mt-1">
                Buat folder dan upload foto/video di menu All Files.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visualFolders.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className="rounded-[18px] bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] p-2.5 cursor-pointer active:scale-95 transition-all shadow-xs hover:border-[#C2410C]/40 select-none group"
                >
                  <div className="relative aspect-[4/3] w-full rounded-[12px] overflow-hidden bg-[#F4F4F6] dark:bg-[#0A0A0E] flex items-center justify-center mb-2">
                    {cat.cover_media_id ? (
                      <img
                        src={api.getThumbnailUrl(cat.cover_media_id)}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                        <Folder className="w-8 h-8 fill-[#C2410C]/20" />
                      </div>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono font-bold bg-black/75 text-white px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                      {cat.visual_media_count || cat.media_count || 0}
                    </span>
                  </div>
                  <p className="text-[12.5px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                    {cat.name}
                  </p>
                  <p className="text-[10px] text-[#8E8E9E] font-mono mt-0.5">
                    {cat.visual_media_count || cat.media_count || 0} foto & video
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : mediaList.length === 0 ? (
        /* Empty State */
        <div className="mx-4 text-center py-16 bg-white dark:bg-[#14141B] border border-dashed border-[#E8E8EC] dark:border-[#22222E] rounded-[20px] p-6">
          <Image className="w-10 h-10 text-[#C2410C] mx-auto mb-2 opacity-50" />
          <h4 className="font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            {onlyFavorite ? 'Belum ada media favorit' : 'Belum ada foto atau video'}
          </h4>
          <p className="text-[12px] text-[#8E8E9E] mt-1">
            Gunakan tombol Upload di kanan bawah untuk mulai mengunggah.
          </p>
        </div>
      ) : isDateSort ? (
        /* 4A. TIMELINE MASONRY GRID (When sorted by Newest or Oldest) */
        <div className="space-y-6 px-2.5">
          {Object.entries(groupedMedia).map(([dateGroup, items]) => (
            <section key={dateGroup} className="space-y-1.5">
              {/* Date Header (Google Photos Style) */}
              <div className="flex items-center gap-2 px-1 pt-1">
                <h4 className="font-sans font-semibold text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {dateGroup}
                </h4>
                <span className="text-[10px] font-mono text-[#8E8E9E]">
                  {items.length}
                </span>
              </div>

              {/* Dynamic 3-Column Dense Grid */}
              <div className="grid grid-cols-3 gap-1.5 auto-rows-[115px] grid-flow-dense">
                {items.map((media) => {
                  const globalIdx = displayedMediaList.findIndex((m) => m.id === media.id);
                  const spanClass = getGridItemSpan(media);
                  const isSelected = selectedIds.has(media.id);

                  return (
                    <div
                      key={media.id}
                      onClick={() => handleMediaClick(displayedMediaList, globalIdx !== -1 ? globalIdx : 0)}
                      onTouchStart={(e) => handleTouchStart(media, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (Date.now() - longPressTriggeredTimeRef.current > 1000) {
                          longPressTriggeredTimeRef.current = Date.now();
                          handleLongPressItem(media);
                        }
                      }}
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                      className={`${spanClass} relative overflow-hidden rounded-[10px] bg-[#F4F4F6] dark:bg-[#14141B] border border-[#E8E8EC]/60 dark:border-[#22222E]/80 cursor-pointer active:scale-[0.98] transition-all select-none group ${
                        isSelected ? 'ring-3 ring-[#C2410C] ring-offset-2 dark:ring-offset-[#0B0B0E] scale-[0.96]' : ''
                      }`}
                    >
                      {/* Selection Checkbox Pill */}
                      {isSelectionMode && (
                        <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none">
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#121217]">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-white/90 bg-black/40 backdrop-blur-xs" />
                          )}
                        </div>
                      )}

                      {/* Media Image / Thumbnail */}
                      <img
                        src={api.getThumbnailUrl(media.id)}
                        alt={media.display_name}
                        draggable="false"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Video Duration Pill Badge (Google Photos Style: e.g. 0:02 ▶) */}
                      {media.media_type === 'video' && (
                        <div className="absolute top-1.5 right-1.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <span>{formatSeconds(media.duration_seconds)}</span>
                          <Play className="w-2.5 h-2.5 fill-white" />
                        </div>
                      )}

                      {/* Favorite Heart Badge */}
                      {Boolean(media.is_favorite) && !isSelectionMode && (
                        <div className="absolute bottom-1.5 left-1.5 p-1 rounded-full bg-black/40 text-[#EF4444] backdrop-blur-xs">
                          <Heart className="w-3 h-3 fill-[#EF4444]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* 4B. DENSE MASONRY GRID IN EXACT SORT ORDER (A-Z, Z-A, Ukuran Terbesar) */
        <div className="space-y-2 px-2.5">
          <div className="flex items-center justify-between px-1 pt-1">
            <h4 className="font-sans font-semibold text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA]">
              {getSortLabel()}
            </h4>
            <span className="text-[10px] font-mono text-[#8E8E9E]">
              {mediaList.length} media
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 auto-rows-[115px] grid-flow-dense">
            {mediaList.map((media, idx) => {
              const spanClass = getGridItemSpan(media);
              const isSelected = selectedIds.has(media.id);

              return (
                <div
                  key={media.id}
                  onClick={() => handleMediaClick(mediaList, idx)}
                  onTouchStart={(e) => handleTouchStart(media, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (Date.now() - longPressTriggeredTimeRef.current > 1000) {
                      longPressTriggeredTimeRef.current = Date.now();
                      handleLongPressItem(media);
                    }
                  }}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                  className={`${spanClass} relative overflow-hidden rounded-[10px] bg-[#F4F4F6] dark:bg-[#14141B] border border-[#E8E8EC]/60 dark:border-[#22222E]/80 cursor-pointer active:scale-[0.98] transition-all select-none group ${
                    isSelected ? 'ring-3 ring-[#C2410C] ring-offset-2 dark:ring-offset-[#0B0B0E] scale-[0.96]' : ''
                  }`}
                >
                  {/* Selection Checkbox Pill */}
                  {isSelectionMode && (
                    <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#121217]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-white/90 bg-black/40 backdrop-blur-xs" />
                      )}
                    </div>
                  )}

                  {/* Media Image / Thumbnail */}
                  <img
                    src={api.getThumbnailUrl(media.id)}
                    alt={media.display_name}
                    draggable="false"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Video Duration Pill Badge */}
                  {media.media_type === 'video' && (
                    <div className="absolute top-1.5 right-1.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <span>{formatSeconds(media.duration_seconds)}</span>
                      <Play className="w-2.5 h-2.5 fill-white" />
                    </div>
                  )}

                  {/* Favorite Heart Badge */}
                  {Boolean(media.is_favorite) && !isSelectionMode && (
                    <div className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/40 text-[#EF4444] backdrop-blur-xs">
                      <Heart className="w-3 h-3 fill-[#EF4444]" />
                    </div>
                  )}

                  {/* Display Name Badge on non-date sort so user clearly sees A-Z / Z-A */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 pt-3 pointer-events-none">
                    <p className="text-[10px] text-white font-medium truncate">
                      {media.display_name || media.original_name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. INFINITE SCROLL SENTINEL & STATUS INDICATOR */}
      {mediaList.length > 0 && (
        <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-2">
          {loadingMore && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] shadow-xs text-[12px] text-[#8E8E9E]">
              <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
              <span>Memuat foto & video lainnya...</span>
            </div>
          )}
          {!hasMore && (
            <div className="text-[11px] text-[#8E8E9E] font-mono tracking-wide py-2">
              ✓ Semua media telah dimuat ({mediaList.length} berkas)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
