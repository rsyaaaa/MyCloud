import React, { useState, useEffect, useMemo } from 'react';
import {
  Image, Video, Heart, Clock, Play, Tag, LayoutGrid, List, Eye, EyeOff, Folder, X
} from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { getRecentHistory, recordRecentItem } from '../utils/recentHistory';
import { subscribeMediaEvent } from '../utils/mediaEvents';
import { useLanguage, localeFor } from '../context/LanguageContext';

function groupMediaByDate(mediaList, lang = 'id') {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  mediaList.forEach((item) => {
    const itemDate = new Date(item.captured_at || item.created_at);
    const dateStr = itemDate.toDateString();

    let title = '';
    if (dateStr === today) {
      title = lang === 'en' ? 'Today' : 'Hari Ini';
    } else if (dateStr === yesterday) {
      title = lang === 'en' ? 'Yesterday' : 'Kemarin';
    } else {
      title = itemDate.toLocaleDateString(localeFor(lang), {
        month: 'long',
        year: 'numeric'
      });
    }

    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(item);
  });

  return groups;
}

export default function GalleryPage({
  initialSubView = 'all',
  searchQuery,
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onContextMenu,
  onShowDetail
}) {
  const { t, lang } = useLanguage();
  const [subView, setSubView] = useState(() => initialSubView || localStorage.getItem('mycloud_pref_gallery_subview') || 'all');
  const [sortOption, setSortOption] = useState(() => localStorage.getItem('mycloud_pref_gallery_sort') || 'newest');

  const [mediaList, setMediaList] = useState(() => {
    try {
      const sub = initialSubView || localStorage.getItem('mycloud_pref_gallery_subview') || 'all';
      const sort = localStorage.getItem('mycloud_pref_gallery_sort') || 'newest';
      let mediaType = 'gallery';
      if (sub === 'photo') mediaType = 'image';
      else if (sub === 'video') mediaType = 'video';
      const cached = api.getCachedMedia ? api.getCachedMedia({ media_type: mediaType, sort }) : null;
      if (cached && cached.media) {
        return cached.media.filter(m => m.media_type === 'image' || m.media_type === 'video');
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [favoriteMedia, setFavoriteMedia] = useState(() => {
    try {
      const cached = api.getCachedMedia ? api.getCachedMedia({ media_type: 'gallery', is_favorite: '1', sort: 'newest' }) : null;
      return (cached && cached.media) || [];
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

  const [favoriteHidden, setFavoriteHidden] = useState(() => {
    return localStorage.getItem('mycloud_gallery_favorite_hidden') === 'true';
  });
  const [recentMedia, setRecentMedia] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [orientationFilter, setOrientationFilter] = useState('all'); // 'all', 'landscape', 'portrait'
  const [aspectFilter, setAspectFilter] = useState('all'); // 'all', 'portrait', 'landscape'
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('mycloud_pref_gallery_view') || 'grid');
  const [loading, setLoading] = useState(() => mediaList.length === 0);

  const changeSubView = (sub) => {
    setSubView(sub);
    localStorage.setItem('mycloud_pref_gallery_subview', sub);
  };

  const changeSortOption = (sort) => {
    setSortOption(sort);
    localStorage.setItem('mycloud_pref_gallery_sort', sort);
  };

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('mycloud_pref_gallery_view', mode);
  };

  const toggleFavoriteHidden = () => {
    setFavoriteHidden((prev) => {
      const nextVal = !prev;
      localStorage.setItem('mycloud_gallery_favorite_hidden', String(nextVal));
      return nextVal;
    });
  };

  // Sync subView if parent changes initialSubView
  useEffect(() => {
    if (initialSubView) setSubView(initialSubView);
  }, [initialSubView]);

  const loadData = async (silent = false) => {
    try {
      const params = { sort: sortOption };

      if (subView === 'photo') {
        params.media_type = 'image';
      } else if (subView === 'video') {
        params.media_type = 'video';
      } else {
        // Gallery exclusively shows photos & videos (never documents)
        params.media_type = 'gallery';
      }

      if (selectedCatId) {
        params.category_id = selectedCatId;
      }

      if (onlyFavorite) {
        params.is_favorite = '1';
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      // Check cache first: if present, paint instantly in 0ms!
      const cached = api.getCachedMedia ? api.getCachedMedia(params) : null;
      if (cached && cached.media) {
        let list = cached.media.filter(m => m.media_type === 'image' || m.media_type === 'video');
        if (subView === 'photo' && orientationFilter !== 'all') {
          list = list.filter(m => orientationFilter === 'portrait' ? m.is_portrait === 1 : m.is_portrait === 0);
        } else if (subView === 'video' && aspectFilter !== 'all') {
          list = list.filter(m => aspectFilter === 'portrait' ? m.is_portrait === 1 : m.is_portrait === 0);
        }
        setMediaList(list);
        if (!silent) setLoading(false);
      } else if (!silent) {
        setLoading(true);
      }

      const [mediaRes, favRes, catRes] = await Promise.all([
        api.listMedia(params, { forceRefresh: !cached }),
        api.listMedia({ media_type: 'gallery', is_favorite: '1', sort: 'newest' }),
        api.listCategories()
      ]);

      // Strict client-side safety: ensure only images and videos in Gallery
      let list = (mediaRes.media || []).filter(m => m.media_type === 'image' || m.media_type === 'video');

      // Filter orientation if needed
      if (subView === 'photo' && orientationFilter !== 'all') {
        list = list.filter(m => orientationFilter === 'portrait' ? m.is_portrait === 1 : m.is_portrait === 0);
      } else if (subView === 'video' && aspectFilter !== 'all') {
        list = list.filter(m => aspectFilter === 'portrait' ? m.is_portrait === 1 : m.is_portrait === 0);
      }

      setMediaList(list);
      setFavoriteMedia(
        (favRes.media || []).filter((m) => m.media_type === 'image' || m.media_type === 'video')
      );
      setCategories(catRes.categories || []);

      // Load recent photos/videos
      const history = getRecentHistory();
      const filteredRecent = history.filter(item => !item.is_folder && item.type !== 'folder' && item.type !== 'document' && item.media_type !== 'document');
      setRecentMedia(filteredRecent);
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subView, selectedCatId, orientationFilter, aspectFilter, sortOption, onlyFavorite, searchQuery]);

  // Real-time reactive media listener for 0ms refresh-free UI
  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setMediaList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, is_favorite: event.is_favorite } : m))
        );
        setFavoriteMedia((prev) => {
          if (!event.is_favorite) return prev.filter((m) => m.id !== event.id);
          const candidate = mediaList.find((m) => m.id === event.id) || prev.find((m) => m.id === event.id);
          if (!candidate) return prev;
          const updated = { ...candidate, is_favorite: 1 };
          return prev.some((m) => m.id === event.id)
            ? prev.map((m) => (m.id === event.id ? updated : m))
            : [updated, ...prev];
        });
        if (onlyFavorite && event.is_favorite === 0) {
          setMediaList((prev) => prev.filter((m) => m.id !== event.id));
        }
      } else if (event.type === 'delete' || event.type === 'lock') {
        setMediaList((prev) => prev.filter((m) => m.id !== event.id));
        setFavoriteMedia((prev) => prev.filter((m) => m.id !== event.id));
      } else if (event.type === 'rename') {
        setMediaList((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, display_name: event.name } : m))
        );
      } else if (['upload', 'restore', 'unlock', 'rename_rollback', 'folder', 'organize'].includes(event.type)) {
        loadData(true);
      }
    });
    return unsub;
  }, [subView, selectedCatId, orientationFilter, aspectFilter, sortOption, onlyFavorite, searchQuery]);

  const handleMediaClick = (items, index) => {
    const item = items[index];
    if (item) recordRecentItem(item);
    if (onOpenViewer) onOpenViewer(items, index);
  };

  const isDateSort = sortOption === 'newest' || sortOption === 'oldest';
  const groupedMedia = useMemo(() => {
    if (!isDateSort) return {};
    return groupMediaByDate(mediaList, lang);
  }, [mediaList, lang, isDateSort]);
  const displayedMediaList = useMemo(() => {
    if (subView === 'all' && isDateSort) {
      return Object.values(groupedMedia).flat();
    }
    return mediaList;
  }, [subView, isDateSort, groupedMedia, mediaList]);
  const visualFolders = useMemo(() => {
    return (categories || []).filter(c => (c.visual_media_count > 0 || c.cover_media_id));
  }, [categories]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-enter">
      {/* Gallery Header & Sub-View Switcher (Semua | Foto | Video) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            {t('galleryTitle', 'Galeri Media')}
          </h2>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
            {t('gallerySubtitle', 'Koleksi lengkap foto, video, dan kenangan momen Anda.')}
          </p>
        </div>

        {/* 3 Main Mode Switcher: Semua (Campuran) | Foto | Video */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F4F5] dark:bg-[#121218] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]">
          <button
            onClick={() => { changeSubView('all'); setSelectedCatId(null); }}
            className={`px-3.5 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${subView === 'all'
                ? 'bg-[#C2410C] text-white shadow-primary-glow font-semibold'
                : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
          >
            {t('mixedAll', 'Semua (Campuran)')}
          </button>
          <button
            onClick={() => { changeSubView('photo'); setSelectedCatId(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${subView === 'photo'
                ? 'bg-[#C2410C] text-white shadow-primary-glow font-semibold'
                : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
          >
            <Image className="w-4 h-4 stroke-[2]" />
            <span>{t('photos', 'Foto')}</span>
          </button>
          <button
            onClick={() => { changeSubView('video'); setSelectedCatId(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] text-[13px] font-medium transition-all ${subView === 'video'
                ? 'bg-[#C2410C] text-white shadow-primary-glow font-semibold'
                : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
          >
            <Video className="w-4 h-4 stroke-[2]" />
            <span>{t('videos', 'Video')}</span>
          </button>
        </div>
      </div>

      {/* When in "Semua" mode: Show Memories Banner & Recent Carousel */}
      {subView === 'all' && (
        <>
          {/* Favorite Strip (replaces the old "Ingatkah Momen Ini?" memories banner) */}
          {!searchQuery && (
            <div className="p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={toggleFavoriteHidden}
                  className="p-1.5 rounded-[6px] text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#1F1F27] border border-[#E8E8EC] dark:border-[#1F1F27] transition-all shrink-0"
                  title={favoriteHidden ? t('show', 'Tampilkan') : t('hide', 'Sembunyikan')}
                >
                  {favoriteHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <Heart className="w-4 h-4 text-[#EF4444] stroke-[2.2]" />
                <h4 className="font-serif font-bold text-sm text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {t('favorite', 'Favorite')}
                </h4>
                {!favoriteHidden && favoriteMedia.length > 0 && (
                  <span className="text-[10px] font-mono font-semibold text-[#6B6B6B] dark:text-[#9C9C9C] bg-[#F4F4F5] dark:bg-[#121218] px-2 py-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
                    {favoriteMedia.length} {t('itemCount', 'item')}
                  </span>
                )}
              </div>

              {!favoriteHidden && (
                loading ? (
                  <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">{t('loadingText', 'Memuat...')}</p>
                ) : favoriteMedia.length === 0 ? (
                  <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                    {t('noFavoriteDesc', 'Klik ikon hati pada foto atau video untuk menyimpannya di sini.')}
                  </p>
                ) : (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {favoriteMedia.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => handleMediaClick(favoriteMedia, idx)}
                        className="w-24 shrink-0 cursor-pointer group"
                      >
                        <div className="w-24 h-24 rounded-[8px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] relative border border-[#E8E8EC] dark:border-[#1F1F27] group-hover:border-[#C2410C] transition-colors">
                          <img
                            src={api.getThumbnailUrl(item.id)}
                            alt={item.display_name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {item.media_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          )}
                          <Heart className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-[#EF4444] fill-[#EF4444]" />
                        </div>
                        <p className="text-[11px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA] truncate mt-1 group-hover:text-[#C2410C]">
                          {item.display_name || item.original_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* Recent Photos/Videos Strip */}
          {recentMedia.length > 0 && !searchQuery && (
            <div className="p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#C2410C]" />
                <h4 className="font-serif font-bold text-sm text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {t('recentlyOpened', 'Baru Saja Dibuka')}
                </h4>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                {recentMedia.slice(0, 10).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => handleMediaClick([item], 0)}
                    className="w-24 shrink-0 cursor-pointer group"
                  >
                    <div className="w-24 h-24 rounded-[8px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] relative border border-[#E8E8EC] dark:border-[#1F1F27] group-hover:border-[#C2410C] transition-colors">
                      <img
                        src={api.getThumbnailUrl(item.id)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {(item.media_type === 'video' || item.type === 'video') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA] truncate mt-1 group-hover:text-[#C2410C]">
                      {item.name || item.display_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Folder Media Section (Hanya folder yang punya isi foto/video) */}
      {visualFolders.length > 0 && !selectedCatId && !searchQuery && (
        <div className="space-y-3 pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4.5 h-4.5 text-[#C2410C]" />
              <h3 className="font-serif font-bold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                {t('mediaFolders', 'Folder Media')} ({visualFolders.length})
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {visualFolders.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className="card-artisan p-2 cursor-pointer group hover:border-[#C2410C] transition-all bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]"
              >
                <div className="relative aspect-square w-full rounded-[6px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center mb-1.5">
                  {cat.cover_media_id ? (
                    <img
                      src={api.getThumbnailUrl(cat.cover_media_id)}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                      <Folder className="w-8 h-8 fill-[#C2410C]/20" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold bg-black/75 text-white px-1.5 py-0.2 rounded">
                    {cat.visual_media_count || cat.media_count} media
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate group-hover:text-[#C2410C] transition-colors">
                  {cat.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Folder Banner (When viewing media inside a specific folder) */}
      {selectedCatId && (
        <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/20 text-[#C2410C]">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            <span className="text-[13px] font-semibold">
              {t('showingFromFolder', 'Menampilkan media dari folder:')} <strong>{categories.find(c => c.id === selectedCatId)?.name || t('folderLabel', 'Folder')}</strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedCatId(null)}
            className="text-[12px] font-semibold hover:underline flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t('viewAllMedia', 'Lihat Semua Media')}</span>
          </button>
        </div>
      )}

      {/* Category / Genre Filters (For Photo & Video Hubs) */}
      {visualFolders.length > 0 && subView !== 'all' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`chip-filter shrink-0 ${!selectedCatId ? 'chip-filter-active' : ''}`}
          >
            {subView === 'photo' ? t('allAlbums', 'Semua Album') : t('allGenres', 'Semua Genre')}
          </button>
          {visualFolders.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id === selectedCatId ? null : cat.id)}
              className={`chip-filter shrink-0 ${selectedCatId === cat.id ? 'chip-filter-active' : ''}`}
            >
              <Tag className="w-3 h-3" />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar: Orientation / Aspect Ratio, Favorites & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Favorite Toggle */}
          <button
            onClick={() => setOnlyFavorite(!onlyFavorite)}
            className={`chip-filter ${onlyFavorite ? 'chip-filter-active' : ''}`}
          >
            <Heart className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{t('favorite', 'Favorit')}</span>
          </button>

          {/* Orientation Filter for Photos */}
          {subView === 'photo' && (
            <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27]">
              <button
                onClick={() => setOrientationFilter('all')}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-[4px] transition-colors ${orientationFilter === 'all' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
              >
                {t('all', 'Semua')}
              </button>
              <button
                onClick={() => setOrientationFilter('landscape')}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-[4px] transition-colors ${orientationFilter === 'landscape' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
              >
                {t('landscapeLabel', 'Lanskap')}
              </button>
              <button
                onClick={() => setOrientationFilter('portrait')}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-[4px] transition-colors ${orientationFilter === 'portrait' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
              >
                {t('portraitLabel', 'Potret')}
              </button>
            </div>
          )}

          {/* Aspect Ratio Filter for Videos */}
          {subView === 'video' && (
            <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27]">
              <button
                onClick={() => setAspectFilter('all')}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-[4px] transition-colors ${aspectFilter === 'all' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
              >
                {t('all', 'Semua')}
              </button>
              <button
                onClick={() => setAspectFilter('portrait')}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-[4px] transition-colors ${aspectFilter === 'portrait' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
              >
                9:16
              </button>
              <button
                onClick={() => setAspectFilter('landscape')}
                className={`px-2.5 py-1 text-[12px] font-semibold rounded-[4px] transition-colors ${aspectFilter === 'landscape' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
              >
                16:9
              </button>
            </div>
          )}
        </div>

        {/* Right side: Sorting & Grid/List view mode */}
        <div className="flex items-center gap-3 text-[13px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#6B6B6B] dark:text-[#9C9C9C]">{t('sortBy', 'Urutkan:')}</span>
            <select
              value={sortOption}
              onChange={(e) => changeSortOption(e.target.value)}
              className="input-artisan h-[32px] py-0 text-[12px] bg-white dark:bg-[#000000]"
            >
              <option value="newest">{t('sortNewest', 'Terbaru')}</option>
              <option value="oldest">{t('sortOldest', 'Terlama')}</option>
              <option value="size_desc">{t('sortLargest', 'Ukuran Terbesar')}</option>
              <option value="size_asc">{t('sortSmallest', 'Ukuran Terkecil')}</option>
              {subView === 'video' && <option value="duration_desc">{t('sortLongest', 'Durasi Terpanjang')}</option>}
            </select>
          </div>

          {/* Grid vs List toggle */}
          {subView !== 'all' && (
            <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27]">
              <button
                onClick={() => changeViewMode('grid')}
                className={`p-1.5 rounded-[4px] transition-colors ${viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => changeViewMode('list')}
                className={`p-1.5 rounded-[4px] transition-colors ${viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                  }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media Feed Rendering */}
      {loading ? (
        <MediaGridSkeleton count={10} />
      ) : mediaList.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
          {subView === 'video' ? (
            <Video className="w-12 h-12 text-[#C2410C] mx-auto mb-3" />
          ) : (
            <Image className="w-12 h-12 text-[#C2410C] mx-auto mb-3" />
          )}
          <h4 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            {subView === 'video' ? t('noVideo', 'Belum ada video') : subView === 'photo' ? t('noPhotos', 'Belum ada foto') : t('noMedia', 'Belum ada media')}
          </h4>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1 max-w-sm mx-auto">
            {t('addMediaHint', 'Gunakan tombol Upload di sudut kanan bawah untuk mulai menambahkan media.')}
          </p>
        </div>
      ) : subView === 'all' && isDateSort ? (
        /* Timeline Date Grouped Feed for "Semua" when sorting by date */
        <div className="space-y-8">
          {Object.entries(groupedMedia).map(([dateGroup, items]) => (
            <section key={dateGroup}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-serif font-semibold text-xl text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {dateGroup}
                </h3>
                <span className="text-[12px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] px-2 py-0.5 rounded-[4px]">
                  {items.length} {t('itemCount', 'item')}
                </span>
                <div className="flex-1 h-[1px] bg-[#E8E8EC] dark:bg-[#1F1F27]" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((media) => {
                  const globalIdx = displayedMediaList.findIndex((m) => m.id === media.id);
                  return (
                    <MediaCard
                      key={media.id}
                      media={media}
                      onClick={() => handleMediaClick(displayedMediaList, globalIdx !== -1 ? globalIdx : 0)}
                      onToggleFavorite={onToggleFavorite}
                      onLock={onLock}
                      onOrganize={onOrganize}
                      onDelete={onDelete}
                      onRename={onRename}
                      onContextMenu={onContextMenu}
                      onShowDetail={onShowDetail}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Dedicated Hub Layout for "Foto" or "Video" */
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-3"}>
          {mediaList.map((media, idx) => (
            <MediaCard
              key={media.id}
              media={media}
              onClick={() => handleMediaClick(mediaList, idx)}
              onToggleFavorite={onToggleFavorite}
              onLock={onLock}
              onOrganize={onOrganize}
              onDelete={onDelete}
              onRename={onRename}
              onContextMenu={onContextMenu}
              onShowDetail={onShowDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
