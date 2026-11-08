import React, { useState, useEffect, useMemo } from 'react';
import { Image, Video, Heart, LayoutGrid, List } from 'lucide-react';
import MemoriesCarousel from '../components/MemoriesCarousel';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { MediaGridSkeleton, MediaListSkeleton, MemoriesSkeleton } from '../components/SkeletonLoader';

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
  const [mediaList, setMediaList] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video', 'favorite'
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' (Page List)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const loadMedia = async () => {
    setLoading(true);
    try {
      const params = { sort: sortOption };
      if (filterType === 'image') params.media_type = 'image';
      if (filterType === 'video') params.media_type = 'video';
      if (filterType === 'favorite') params.is_favorite = '1';
      if (searchQuery) params.search = searchQuery;

      const [mediaRes, memRes] = await Promise.all([
        api.listMedia(params),
        api.getMemories()
      ]);

      setMediaList(mediaRes.media || []);
      setMemories(memRes.memories || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load mobile gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [filterType, sortOption, searchQuery]);

  // Pagination calculation
  const totalItems = mediaList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return mediaList.slice(startIndex, startIndex + pageSize);
  }, [mediaList, currentPage, pageSize]);

  return (
    <div className="p-4 pb-24 max-w-md mx-auto animate-enter">
      {/* Memories Engine Carousel */}
      {!searchQuery && (
        loading ? (
          <div className="mb-4">
            <MemoriesSkeleton />
          </div>
        ) : memories.length > 0 ? (
          <div className="mb-4">
            <MemoriesCarousel
              memories={memories}
              onSelectMedia={(items, index) => onOpenViewer(items, index)}
            />
          </div>
        ) : null
      )}

      {/* Mobile Toolbar: Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <button
          onClick={() => setFilterType('all')}
          className={`chip-filter shrink-0 h-8 text-[12px] px-3 ${
            filterType === 'all' ? 'chip-filter-active' : ''
          }`}
        >
          Semua ({mediaList.length})
        </button>
        <button
          onClick={() => setFilterType('image')}
          className={`chip-filter shrink-0 h-8 text-[12px] px-3 ${
            filterType === 'image' ? 'chip-filter-active' : ''
          }`}
        >
          <Image className="w-3.5 h-3.5" /> Foto
        </button>
        <button
          onClick={() => setFilterType('video')}
          className={`chip-filter shrink-0 h-8 text-[12px] px-3 ${
            filterType === 'video' ? 'chip-filter-active' : ''
          }`}
        >
          <Video className="w-3.5 h-3.5" /> Video
        </button>
        <button
          onClick={() => setFilterType('favorite')}
          className={`chip-filter shrink-0 h-8 text-[12px] px-3 ${
            filterType === 'favorite' ? 'chip-filter-active' : ''
          }`}
        >
          <Heart className="w-3.5 h-3.5" /> Favorit
        </button>
      </div>

      {/* Second Line Toolbar: Sort & View Mode Switcher */}
      <div className="flex items-center justify-between gap-2 mb-4 p-2 bg-white dark:bg-[#0A0A0E] rounded-[8px] border border-[#E8E8EC] dark:border-[#1F1F27]">
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">Urut:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="input-artisan h-7 py-0 text-[11px] px-2 bg-transparent border-none text-[#0A0A0A] dark:text-[#FAFAFA]"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="size_desc">Ukuran</option>
            <option value="duration_desc">Durasi</option>
          </select>
        </div>

        {/* View Mode Toggle: Grid vs Page List */}
        <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#14141A] p-1 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[4px] transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#C2410C] text-white shadow-primary-glow'
                : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[4px] transition-colors ${
              viewMode === 'list'
                ? 'bg-[#C2410C] text-white shadow-primary-glow'
                : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
            }`}
            title="Page List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Feed Content */}
      {loading ? (
        viewMode === 'grid' ? <MediaGridSkeleton count={6} /> : <MediaListSkeleton count={6} />
      ) : paginatedItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
          <Image className="w-10 h-10 text-[#C2410C] mx-auto mb-2" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            Belum ada berkas media
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Gunakan tombol floating <strong>Upload</strong> di kanan bawah untuk menambahkan foto/video.
          </p>
        </div>
      ) : (
        <>
          {/* View Mode: Grid (2 columns) */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 gap-3">
              {paginatedItems.map((media) => {
                const globalIdx = mediaList.findIndex((m) => m.id === media.id);
                return (
                  <MobileMediaCard
                    key={media.id}
                    media={media}
                    onClick={() => onOpenViewer(mediaList, globalIdx)}
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

          {/* View Mode: Page List View */}
          {viewMode === 'list' && (
            <div className="space-y-2.5">
              {paginatedItems.map((media) => {
                const globalIdx = mediaList.findIndex((m) => m.id === media.id);
                return (
                  <MobileMediaListItem
                    key={media.id}
                    media={media}
                    onClick={() => onOpenViewer(mediaList, globalIdx)}
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

          {/* Page List Pagination Controls */}
          <MobilePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
