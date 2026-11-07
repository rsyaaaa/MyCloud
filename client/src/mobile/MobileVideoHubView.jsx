import React, { useState, useEffect, useMemo } from 'react';
import { Film, Video, Tag, LayoutGrid, List } from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { MediaGridSkeleton, MediaListSkeleton } from '../components/SkeletonLoader';

export default function MobileVideoHubView({
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename
}) {
  const [videos, setVideos] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenreId, setSelectedGenreId] = useState(null);
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        media_type: 'video',
        sort: sortOption
      };
      if (selectedGenreId) {
        params.category_id = selectedGenreId;
      }

      const [videosRes, catsRes] = await Promise.all([
        api.listMedia(params),
        api.listCategories('genre')
      ]);

      setVideos(videosRes.media || []);
      setGenres(catsRes.categories || []);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGenreId, sortOption]);

  const totalItems = videos.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return videos.slice(startIndex, startIndex + pageSize);
  }, [videos, currentPage, pageSize]);

  return (
    <div className="p-4 pb-24 max-w-md mx-auto animate-enter">
      {/* Title */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-[#C2410C]" />
          <h2 className="font-serif font-bold text-xl text-[#1C1917] dark:text-[#F5F2EB]">
            Video Streaming Hub
          </h2>
        </div>
        <p className="text-[12px] text-[#57534E] dark:text-[#A8A29E] mt-0.5">
          Pemutar video native aspect-ratio & HTTP range streaming seekable.
        </p>
      </div>

      {/* Genre Chips */}
      {genres.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          <button
            onClick={() => setSelectedGenreId(null)}
            className={`chip-filter shrink-0 h-7 text-[11px] px-2.5 ${
              !selectedGenreId ? 'chip-filter-active' : ''
            }`}
          >
            Semua
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenreId(g.id)}
              className={`chip-filter shrink-0 h-7 text-[11px] px-2.5 ${
                selectedGenreId === g.id ? 'chip-filter-active' : ''
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Controls Bar: Sort & View Mode */}
      <div className="flex items-center justify-between gap-2 mb-4 p-2 bg-white dark:bg-[#23201D] rounded-[6px] border border-[#E7E5E4] dark:border-[#3E3834]">
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="input-artisan h-8 text-[12px] py-0 px-2 bg-transparent border-none flex-1"
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="duration_desc">Durasi</option>
          <option value="size_desc">Ukuran</option>
        </select>

        {/* View Switcher: Grid vs Page List */}
        <div className="flex items-center gap-1 bg-[#FFFBF5] dark:bg-[#2E2A26] p-0.5 rounded-[4px] border border-[#D6D3D1] dark:border-[#3E3834]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#57534E] dark:text-[#A8A29E]'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#57534E] dark:text-[#A8A29E]'
            }`}
            title="Page List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Videos List / Grid */}
      {loading ? (
        viewMode === 'grid' ? <MediaGridSkeleton count={6} /> : <MediaListSkeleton count={6} />
      ) : paginatedItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#23201D] border-2 border-dashed border-[#D6D3D1] dark:border-[#3E3834] rounded-[8px] p-6">
          <Video className="w-10 h-10 text-[#D4A373] mx-auto mb-2" />
          <h4 className="font-serif font-semibold text-base text-[#1C1917] dark:text-[#F5F2EB]">
            Belum ada video
          </h4>
          <p className="text-[12px] text-[#57534E] dark:text-[#A8A29E] mt-1">
            Unggah file video MP4/MKV untuk mulai streaming.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 gap-3">
              {paginatedItems.map((vid) => {
                const globalIdx = videos.findIndex((v) => v.id === vid.id);
                return (
                  <MobileMediaCard
                    key={vid.id}
                    media={vid}
                    onClick={() => onOpenViewer(videos, globalIdx)}
                    onToggleFavorite={onToggleFavorite}
                    onLock={onLock}
                    onOrganize={onOrganize}
                    onDelete={onDelete}
                    onRename={onRename}
                  />
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2">
              {paginatedItems.map((vid) => {
                const globalIdx = videos.findIndex((v) => v.id === vid.id);
                return (
                  <MobileMediaListItem
                    key={vid.id}
                    media={vid}
                    onClick={() => onOpenViewer(videos, globalIdx)}
                    onToggleFavorite={onToggleFavorite}
                    onLock={onLock}
                    onOrganize={onOrganize}
                    onDelete={onDelete}
                    onRename={onRename}
                  />
                );
              })}
            </div>
          )}

          {/* Pagination */}
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
