import React, { useState, useEffect } from 'react';
import { Video, Film, Tag } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';
import { MediaGridSkeleton } from '../components/SkeletonLoader';

export default function VideoHubPage({
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
  const [loading, setLoading] = useState(true);

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
    } catch (e) {
      console.error('Failed to load video hub:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGenreId, sortOption]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Video Hub Header */}
      <div className="mb-6 pb-4 border-b border-[#E7E5E4] dark:border-[#3E3834] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-2xl text-[#1C1917] dark:text-[#F5F2EB]">
              Video Streaming Hub
            </h2>
          </div>
          <p className="text-[13px] text-[#57534E] dark:text-[#A8A29E] mt-1">
            Streaming instan lokal dengan HTTP Range seekable dan aspect-ratio native.
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-3">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="input-artisan h-[36px] py-0 text-[13px] bg-white dark:bg-[#23201D]"
          >
            <option value="newest">Upload Terbaru</option>
            <option value="oldest">Upload Terlama</option>
            <option value="duration_desc">Durasi Terpanjang</option>
            <option value="size_desc">Ukuran Terbesar</option>
          </select>
        </div>
      </div>

      {/* Genre Tag Chips */}
      {genres.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
          <span className="text-[12px] font-semibold text-[#57534E] dark:text-[#A8A29E] flex items-center gap-1 shrink-0">
            <Tag className="w-3.5 h-3.5 text-[#365314]" /> Genre:
          </span>
          <button
            onClick={() => setSelectedGenreId(null)}
            className={`chip-filter ${!selectedGenreId ? 'chip-filter-active' : ''}`}
          >
            Semua
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenreId(g.id)}
              className={`chip-filter ${selectedGenreId === g.id ? 'chip-filter-active' : ''}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Video Grid */}
      {loading ? (
        <MediaGridSkeleton count={8} />
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#23201D] border-2 border-dashed border-[#D6D3D1] dark:border-[#3E3834] rounded-[8px] p-8">
          <Video className="w-12 h-12 text-[#D4A373] mx-auto mb-3" />
          <h4 className="font-serif font-semibold text-lg text-[#1C1917] dark:text-[#F5F2EB]">
            Belum ada video di perpustakaan
          </h4>
          <p className="text-[13px] text-[#57534E] dark:text-[#A8A29E] mt-1 max-w-sm mx-auto">
            Unggah file video MP4, MKV, MOV melalui tombol Unggah Media untuk menikmati streaming native.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {videos.map((vid, idx) => (
            <MediaCard
              key={vid.id}
              media={vid}
              onClick={() => onOpenViewer(videos, idx)}
              onToggleFavorite={onToggleFavorite}
              onLock={onLock}
              onOrganize={onOrganize}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}
