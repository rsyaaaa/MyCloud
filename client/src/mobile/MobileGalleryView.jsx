import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image, Video, Heart, Play, Folder, ChevronDown, Check, ArrowUpDown, X, Tag
} from 'lucide-react';
import { api } from '../api';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { subscribeMediaEvent } from '../utils/mediaEvents';
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
  onLongPress
}) {
  const { lang, t } = useLanguage();

  const [mediaList, setMediaList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Independent Memories (Moments Carousel): remains stable even when Favorite / Collection filter is clicked
  const [memoriesList, setMemoriesList] = useState([]);

  // Filter & Toolbar States
  const [sortOption, setSortOption] = useState(() => {
    return localStorage.getItem('mycloud_pref_gallery_sort') || 'newest';
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [collectionMode, setCollectionMode] = useState(false);

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

  // Touch handlers for long-press context menu
  const touchTimerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (media, e) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchTimerRef.current = setTimeout(() => {
      if (onLongPress) {
        if (navigator.vibrate) navigator.vibrate(40);
        onLongPress(media);
      }
    }, 500);
  };

  const handleTouchMove = (e) => {
    const diffX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const diffY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (diffX > 10 || diffY > 10) {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
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
    if (!silent) setLoading(true);
    try {
      const params = {
        media_type: 'gallery', // Strictly images and videos
        sort: sortOption
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

      const [mediaRes, catRes] = await Promise.all([
        api.listMedia(params),
        api.listCategories()
      ]);

      const list = (mediaRes.media || []).filter(
        (m) => m.media_type === 'image' || m.media_type === 'video'
      );

      setMediaList(list);
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error('Failed to load mobile gallery:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCatId, sortOption, onlyFavorite, searchQuery]);

  // Load 15 random memories independently from all visual media so it stays stable regardless of filter/sort/favorite state
  const loadMemories = async () => {
    try {
      const res = await api.listMedia({
        media_type: 'gallery',
        sort: 'newest'
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
        setMediaList((prev) => prev.filter((m) => m.id !== event.id));
        setMemoriesList((prev) => prev.filter((m) => m.id !== event.id));
      } else if (event.type === 'rename') {
        setMediaList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, display_name: event.name } : m))
        );
        setMemoriesList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, display_name: event.name } : m))
        );
      } else if (['upload', 'restore', 'unlock', 'rename_rollback', 'folder', 'organize'].includes(event.type)) {
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
    const item = items[index];
    if (item) recordRecentItem(item);
    if (onOpenViewer) onOpenViewer(items, index);
  };

  // Group all media continuously without pagination (scroll continuously to the end)
  const groupedMedia = useMemo(() => groupMediaByDate(mediaList, lang), [mediaList, lang]);

  return (
    <div className="pb-32 space-y-4 animate-enter bg-[#FAFAFA] dark:bg-[#0B0B0E] text-[#0A0A0A] dark:text-[#F4F4F5] min-h-screen">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-[12px] text-left transition-colors ${
                      sortOption === opt.id
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

        {/* Right buttons: Button Favorit & Button Koleksi Mode */}
        <div className="flex items-center gap-1.5">
          {/* Button Favorit */}
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 border ${
              onlyFavorite
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 border ${
              collectionMode
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
      ) : (
        /* 4. GOOGLE PHOTOS AESTHETIC MASONRY GRID (3-Column Dense Grid with Landscape/Portrait Spans & Video Duration Pill) */
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
                  const globalIdx = mediaList.findIndex((m) => m.id === media.id);
                  const spanClass = getGridItemSpan(media);

                  return (
                    <div
                      key={media.id}
                      onClick={() => handleMediaClick(mediaList, globalIdx !== -1 ? globalIdx : 0)}
                      onTouchStart={(e) => handleTouchStart(media, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (onLongPress) onLongPress(media);
                      }}
                      className={`${spanClass} relative overflow-hidden rounded-[10px] bg-[#F4F4F6] dark:bg-[#14141B] border border-[#E8E8EC]/60 dark:border-[#22222E]/80 cursor-pointer active:scale-[0.98] transition-transform select-none group`}
                    >
                      {/* Media Image / Thumbnail */}
                      <img
                        src={api.getThumbnailUrl(media.id)}
                        alt={media.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Video Duration Pill Badge (Google Photos Style: e.g. 0:02 ▶) */}
                      {media.media_type === 'video' && (
                        <div className="absolute top-1.5 right-1.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <span>{formatSeconds(media.duration_seconds)}</span>
                          <Play className="w-2.5 h-2.5 fill-white" />
                        </div>
                      )}

                      {/* Favorite Heart Badge */}
                      {Boolean(media.is_favorite) && (
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
      )}
    </div>
  );
}
