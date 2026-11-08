import React, { useState, useEffect, useMemo } from 'react';
import {
  Image, Video, Heart, Clock, Play, Tag, LayoutGrid, List
} from 'lucide-react';
import MemoriesCarousel from '../components/MemoriesCarousel';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { MediaGridSkeleton, MemoriesSkeleton } from '../components/SkeletonLoader';
import { getRecentHistory, recordRecentItem } from '../utils/recentHistory';

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
  const [subView, setSubView] = useState(initialSubView || 'all'); // 'all', 'photo', 'video'
  const [mediaList, setMediaList] = useState([]);
  const [memories, setMemories] = useState([]);
  const [recentMedia, setRecentMedia] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [orientationFilter, setOrientationFilter] = useState('all');
  const [aspectFilter, setAspectFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
      setCurrentPage(1);
    }
  }, [initialSubView]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { sort: sortOption };

      if (subView === 'photo') {
        params.media_type = 'image';
      } else if (subView === 'video') {
        params.media_type = 'video';
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

      const [mediaRes, memRes, catRes] = await Promise.all([
        api.listMedia(params),
        api.getMemories(),
        api.listCategories(subView === 'video' ? 'genre' : null)
      ]);

      let list = mediaRes.media || [];

      // Filter orientation if needed
      if (subView === 'photo' && orientationFilter !== 'all') {
        list = list.filter(m => orientationFilter === 'portrait' ? m.is_portrait === 1 : m.is_portrait === 0);
      } else if (subView === 'video' && aspectFilter !== 'all') {
        list = list.filter(m => aspectFilter === 'portrait' ? m.is_portrait === 1 : m.is_portrait === 0);
      }

      setMediaList(list);
      setMemories(memRes.memories || []);
      setCategories(catRes.categories || []);
      setCurrentPage(1);

      // Load recent media
      const history = getRecentHistory();
      const filteredRecent = history.filter(item => !item.is_folder && item.type !== 'folder' && item.type !== 'document' && item.media_type !== 'document');
      setRecentMedia(filteredRecent);
    } catch (err) {
      console.error('Failed to load mobile gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 animate-enter">
      {/* 3 Main Mode Switcher: Semua | Foto | Video */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] shadow-sm">
        <button
          onClick={() => { setSubView('all'); setSelectedCatId(null); }}
          className={`flex-1 py-1.5 rounded-[8px] text-[12px] font-medium transition-all ${
            subView === 'all'
              ? 'bg-[#C2410C] text-white shadow-primary-glow font-semibold'
              : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => { setSubView('photo'); setSelectedCatId(null); }}
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
          onClick={() => { setSubView('video'); setSelectedCatId(null); }}
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
          {/* Memories Carousel Banner: "Ingatkah Momen Ini?" */}
          {!searchQuery && (
            loading ? (
              <MemoriesSkeleton />
            ) : memories.length > 0 ? (
              <MemoriesCarousel
                memories={memories}
                onSelectMedia={(items, index) => handleMediaClick(items, index)}
              />
            ) : null
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

      {/* Category Chips (If in Photo or Video subview) */}
      {categories.length > 0 && subView !== 'all' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`chip-filter shrink-0 ${!selectedCatId ? 'chip-filter-active' : ''}`}
          >
            Semua
          </button>
          {categories.map((cat) => (
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
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
            title="Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
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
