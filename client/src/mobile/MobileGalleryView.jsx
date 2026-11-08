import React, { useState, useEffect, useMemo } from 'react';
import {
  Image, Video, Heart, Clock, Play, Tag, LayoutGrid, List, Eye, EyeOff, Folder, X
} from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { getRecentHistory, recordRecentItem } from '../utils/recentHistory';
import { subscribeMediaEvent } from '../utils/mediaEvents';
import { useLanguage } from '../context/LanguageContext';

function groupMediaByDate(mediaList) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  mediaList.forEach((item) => {
    const itemDate = new Date(item.captured_at || item.created_at);
    const dateStr = itemDate.toDateString();

    let title = '';
    if (dateStr === today) {
      title = 'Hari Ini';
    } else if (dateStr === yesterday) {
      title = 'Kemarin';
    } else {
      title = itemDate.toLocaleDateString('id-ID', {
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

export default function MobileGalleryView({
  initialSubView = 'all',
  searchQuery,
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress
}) {
  const { t } = useLanguage();
  const [subView, setSubView] = useState(() => initialSubView || localStorage.getItem('mycloud_pref_gallery_subview') || 'all');
  const [mediaList, setMediaList] = useState([]);
  const [favoriteMedia, setFavoriteMedia] = useState([]);
  const [favoriteHidden, setFavoriteHidden] = useState(() => {
    return localStorage.getItem('mycloud_gallery_favorite_hidden') === 'true';
  });
  const [recentMedia, setRecentMedia] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [orientationFilter, setOrientationFilter] = useState('all');
  const [aspectFilter, setAspectFilter] = useState('all');
  const [sortOption, setSortOption] = useState(() => localStorage.getItem('mycloud_pref_gallery_sort') || 'newest');
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('mycloud_pref_gallery_view') || 'grid');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const changeSubView = (sub) => {
    setSubView(sub);
    localStorage.setItem('mycloud_pref_gallery_subview', sub);
    setCurrentPage(1);
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

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
      setCurrentPage(1);
    }
  }, [initialSubView]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
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

      const [mediaRes, favRes, catRes] = await Promise.all([
        api.listMedia(params),
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
      if (!silent) setCurrentPage(1);

      // Load recent media
      const history = getRecentHistory();
      const filteredRecent = history.filter(item => !item.is_folder && item.type !== 'folder' && item.type !== 'document' && item.media_type !== 'document');
      setRecentMedia(filteredRecent);
    } catch (err) {
      console.error('Failed to load mobile gallery:', err);
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

  // Pagination calculation
  const totalItems = mediaList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return mediaList.slice(start, start + pageSize);
  }, [mediaList, currentPage, pageSize]);

  const groupedMedia = useMemo(() => groupMediaByDate(paginatedItems), [paginatedItems]);
  const visualFolders = useMemo(() => {
    return (categories || []).filter(c => (c.visual_media_count > 0 || c.cover_media_id));
  }, [categories]);

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 animate-enter">
      {/* 3 Main Mode Switcher: Semua | Foto | Video */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] shadow-sm">
        <button
          onClick={() => { changeSubView('all'); setSelectedCatId(null); }}
          className={`flex-1 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
            subView === 'all'
              ? 'bg-[#C2410C] text-white shadow-primary-glow font-semibold'
              : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => { changeSubView('photo'); setSelectedCatId(null); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
            subView === 'photo'
              ? 'bg-[#C2410C] text-white shadow-primary-glow font-semibold'
              : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>Foto</span>
        </button>
        <button
          onClick={() => { changeSubView('video'); setSelectedCatId(null); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
            subView === 'video'
              ? 'bg-[#C2410C] text-white shadow-primary-glow font-semibold'
              : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Video</span>
        </button>
      </div>

      {/* When in "Semua" mode: Show Memories Banner & Recent Carousel */}
      {subView === 'all' && (
        <>
          {/* Favorite Strip (replaces the old "Ingatkah Momen Ini?" memories banner) */}
          {!searchQuery && (
            <div className="p-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
              <div className="flex items-center gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={toggleFavoriteHidden}
                  className="p-1 rounded-[4px] text-[#6B6B6B] dark:text-[#A1A1AA] border border-[#E8E8EC] dark:border-[#1F1F27] shrink-0"
                  title={favoriteHidden ? t('show', 'Tampilkan') : t('hide', 'Sembunyikan')}
                >
                  {favoriteHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <Heart className="w-3.5 h-3.5 text-[#EF4444] fill-[#EF4444]" />
                <h4 className="font-serif font-bold text-[12px] text-[#0A0A0A] dark:text-[#FAFAFA]">
                  Favorite
                </h4>
                {!favoriteHidden && favoriteMedia.length > 0 && (
                  <span className="text-[9px] font-mono font-semibold text-[#6B6B6B] dark:text-[#9C9C9C] bg-[#F4F4F5] dark:bg-[#121218] px-1.5 py-0.2 rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
                    {favoriteMedia.length}
                  </span>
                )}
              </div>

              {!favoriteHidden && (
                loading ? (
                  <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">Memuat...</p>
                ) : favoriteMedia.length === 0 ? (
                  <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                    Belum ada media favorit.
                  </p>
                ) : (
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {favoriteMedia.map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => handleMediaClick(favoriteMedia, idx)}
                        className="w-20 shrink-0 cursor-pointer active:scale-95 transition-transform"
                      >
                        <div className="w-20 h-20 rounded-[8px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] relative border border-[#E8E8EC] dark:border-[#1F1F27]">
                          <img
                            src={api.getThumbnailUrl(item.id)}
                            alt={item.display_name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {item.media_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="w-3.5 h-3.5 fill-white text-white" />
                            </div>
                          )}
                          <Heart className="absolute top-1 right-1 w-3 h-3 text-[#EF4444] fill-[#EF4444]" />
                        </div>
                        <p className="text-[10px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate mt-1">
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
            <div className="p-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
                <h4 className="font-serif font-bold text-[12px] text-[#0A0A0A] dark:text-[#FAFAFA]">
                  Baru Saja Dibuka
                </h4>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {recentMedia.slice(0, 10).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => handleMediaClick([item], 0)}
                    className="w-16 shrink-0 cursor-pointer active:scale-95 transition-transform"
                  >
                    <div className="w-16 h-16 rounded-[8px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] relative border border-[#E8E8EC] dark:border-[#1F1F27]">
                      <img
                        src={api.getThumbnailUrl(item.id)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {(item.media_type === 'video' || item.type === 'video') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="w-3 h-3 fill-white text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate mt-1">
                      {item.name || item.display_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Visual Folders Horizontal Cards Section */}
      {visualFolders.length > 0 && !selectedCatId && !searchQuery && (
        <div className="space-y-2 pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center justify-between text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
            <div className="flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-[#C2410C]" />
              <span>Folder Media ({visualFolders.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {visualFolders.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className="card-artisan p-1.5 cursor-pointer border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[8px] bg-white dark:bg-[#0A0A0E] active:scale-95 transition-transform"
              >
                <div className="relative aspect-square w-full rounded-[6px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center mb-1">
                  {cat.cover_media_id ? (
                    <img
                      src={api.getThumbnailUrl(cat.cover_media_id)}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                      <Folder className="w-6 h-6 fill-[#C2410C]/20" />
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono font-bold bg-black/80 text-white px-1 rounded">
                    {cat.visual_media_count || cat.media_count}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate text-center">
                  {cat.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Folder Banner Mobile */}
      {selectedCatId && (
        <div className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/20 text-[#C2410C] text-[12px]">
          <div className="flex items-center gap-1.5 truncate mr-2">
            <Folder className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Folder: <strong>{categories.find(c => c.id === selectedCatId)?.name || 'Folder'}</strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedCatId(null)}
            className="font-semibold underline shrink-0 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Semua</span>
          </button>
        </div>
      )}

      {/* Category Chips (If in Photo or Video subview) */}
      {visualFolders.length > 0 && subView !== 'all' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`chip-filter shrink-0 ${!selectedCatId ? 'chip-filter-active' : ''}`}
          >
            Semua
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

      {/* Filter & View Mode Bar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-[#0A0A0E] rounded-[10px] border border-[#E8E8EC] dark:border-[#1F1F27]">
        <div className="flex items-center gap-1">
          {/* Favorite filter button */}
          <button
            onClick={() => setOnlyFavorite(!onlyFavorite)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-[4px] border transition-colors flex items-center gap-1 ${
              onlyFavorite
                ? 'bg-[#C2410C] text-white border-[#C2410C]'
                : 'border-[#E8E8EC] dark:border-[#1F1F27] text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
          >
            <Heart className="w-3 h-3 stroke-[2.2]" />
            <span>Favorit</span>
          </button>

          {/* Orientation filter for photo */}
          {subView === 'photo' && (
            <div className="flex items-center gap-0.5 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
              <button
                onClick={() => setOrientationFilter('all')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] ${
                  orientationFilter === 'all' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setOrientationFilter('landscape')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] ${
                  orientationFilter === 'landscape' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              >
                Lanskap
              </button>
              <button
                onClick={() => setOrientationFilter('portrait')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] ${
                  orientationFilter === 'portrait' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              >
                Potret
              </button>
            </div>
          )}

          {/* Aspect ratio filter for video */}
          {subView === 'video' && (
            <div className="flex items-center gap-0.5 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
              <button
                onClick={() => setAspectFilter('all')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] ${
                  aspectFilter === 'all' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setAspectFilter('portrait')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] ${
                  aspectFilter === 'portrait' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              >
                9:16
              </button>
              <button
                onClick={() => setAspectFilter('landscape')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] ${
                  aspectFilter === 'landscape' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              >
                16:9
              </button>
            </div>
          )}
        </div>

        {/* View mode toggle (Grid vs List) */}
        <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
          <button
            onClick={() => changeViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
            title="Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => changeViewMode('list')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
            title="Page List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Feed */}
      {loading ? (
        <MediaGridSkeleton count={6} />
      ) : paginatedItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
          <Image className="w-10 h-10 text-[#C2410C] mx-auto mb-2 opacity-50" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            Belum ada media
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Gunakan tombol Upload di kanan bawah untuk mulai mengunggah.
          </p>
        </div>
      ) : subView === 'all' && viewMode === 'grid' ? (
        /* Timeline Date Groups in Mixed Mode */
        <div className="space-y-6">
          {Object.entries(groupedMedia).map(([dateGroup, items]) => (
            <section key={dateGroup}>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-serif font-bold text-sm text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {dateGroup}
                </h4>
                <span className="text-[10px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C] bg-[#F4F4F5] dark:bg-[#121218] px-1.5 py-0.2 rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
                  {items.length}
                </span>
                <div className="flex-1 h-[1px] bg-[#E8E8EC] dark:border-[#1F1F27]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {items.map((media) => {
                  const globalIdx = mediaList.findIndex((m) => m.id === media.id);
                  return (
                    <MobileMediaCard
                      key={media.id}
                      media={media}
                      onClick={() => handleMediaClick(mediaList, globalIdx)}
                      onToggleFavorite={onToggleFavorite}
                      onLock={onLock}
                      onOrganize={onOrganize}
                      onDelete={onDelete}
                      onRename={onRename}
                      onLongPress={onLongPress}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View for Photo or Video Hub */
        <div className="grid grid-cols-2 gap-3">
          {paginatedItems.map((media) => {
            const globalIdx = mediaList.findIndex((m) => m.id === media.id);
            return (
              <MobileMediaCard
                key={media.id}
                media={media}
                onClick={() => handleMediaClick(mediaList, globalIdx)}
                onToggleFavorite={onToggleFavorite}
                onLock={onLock}
                onOrganize={onOrganize}
                onDelete={onDelete}
                onRename={onRename}
                onLongPress={onLongPress}
              />
            );
          })}
        </div>
      ) : (
        /* List View (Page List) */
        <div className="space-y-2.5">
          {paginatedItems.map((media) => {
            const globalIdx = mediaList.findIndex((m) => m.id === media.id);
            return (
              <MobileMediaListItem
                key={media.id}
                media={media}
                onClick={() => handleMediaClick(mediaList, globalIdx)}
                onToggleFavorite={onToggleFavorite}
                onLock={onLock}
                onOrganize={onOrganize}
                onDelete={onDelete}
                onRename={onRename}
                onLongPress={onLongPress}
              />
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <MobilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={(p) => {
            setCurrentPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
