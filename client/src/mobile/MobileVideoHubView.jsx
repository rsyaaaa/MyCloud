import React, { useState, useEffect, useMemo } from 'react';
import { Film, Video, Tag, LayoutGrid, List } from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';

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
  const [aspectFilter, setAspectFilter] = useState('all'); // 'all', 'portrait', 'landscape'
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

      let list = videosRes.media || [];
      if (aspectFilter === 'portrait') {
        list = list.filter(v => v.is_portrait === 1);
      } else if (aspectFilter === 'landscape') {
        list = list.filter(v => v.is_portrait === 0);
      }

      setVideos(list);
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
  }, [selectedGenreId, sortOption, aspectFilter]);

  const totalItems = videos.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return videos.slice(startIndex, startIndex + pageSize);
  }, [videos, currentPage, pageSize]);

  return (
    <div className="p-4 pb-24 max-w-md mx-auto">
      {/* Title */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-[#C2410C]" />
          <h2 className="font-serif font-bold text-xl text-[#1C1917]">
            Video Streaming Hub
          </h2>
        </div>
        <p className="text-[12px] text-[#57534E] mt-0.5">
          Pemutar video native 9:16 portrait & 16:9 seekable HTTP range.
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
            Semua Genre
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

      {/* Orientation + View Mode Bar */}
      <div className="flex items-center justify-between gap-2 mb-4 p-2 bg-white rounded-[6px] border border-[#E7E5E4]">
        {/* Aspect Ratio Filter */}
        <div className="flex items-center gap-1 bg-[#FFFBF5] p-0.5 rounded-[4px] border border-[#D6D3D1]">
          <button
            onClick={() => setAspectFilter('all')}
            className={`px-2 py-1 text-[11px] font-semibold rounded-[3px] transition-colors ${
              aspectFilter === 'all' ? 'bg-[#C2410C] text-white' : 'text-[#57534E]'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setAspectFilter('portrait')}
            className={`px-2 py-1 text-[11px] font-semibold rounded-[3px] transition-colors ${
              aspectFilter === 'portrait' ? 'bg-[#C2410C] text-white' : 'text-[#57534E]'
            }`}
          >
            9:16
          </button>
          <button
            onClick={() => setAspectFilter('landscape')}
            className={`px-2 py-1 text-[11px] font-semibold rounded-[3px] transition-colors ${
              aspectFilter === 'landscape' ? 'bg-[#C2410C] text-white' : 'text-[#57534E]'
            }`}
          >
            16:9
          </button>
        </div>

        {/* View Switcher: Grid vs Page List */}
        <div className="flex items-center gap-1 bg-[#FFFBF5] p-0.5 rounded-[4px] border border-[#D6D3D1]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#57534E]'
            }`}
            title="Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#57534E]'
            }`}
            title="Page List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Videos List / Grid */}
      {loading ? (
        <div className="text-center py-16 text-[#A8A29E] font-serif text-[15px]">
          Memuat video...
        </div>
      ) : paginatedItems.length === 0 ? (
        <div className="text-center py-16 bg-white border-2 border-dashed border-[#D6D3D1] rounded-[8px] p-6">
          <Video className="w-10 h-10 text-[#D4A373] mx-auto mb-2" />
          <h4 className="font-serif font-semibold text-base text-[#1C1917]">
            Belum ada video
          </h4>
          <p className="text-[12px] text-[#57534E] mt-1">
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
            <div className="space-y-2.5">
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
        </>
      )}
    </div>
  );
}

