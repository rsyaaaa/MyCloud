import React, { useState, useEffect } from 'react';
import { Video, Film, Filter, Tag, Play, Heart, Clock } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';

export default function VideoHubPage({ onOpenViewer, onToggleFavorite, onLock, onOrganize, onDelete, onRename }) {
  const [videos, setVideos] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenreId, setSelectedGenreId] = useState(null);
  const [sortOption, setSortOption] = useState('newest');
  const [aspectFilter, setAspectFilter] = useState('all'); // 'all', 'portrait', 'landscape'
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

      let list = videosRes.media || [];
      if (aspectFilter === 'portrait') {
        list = list.filter(v => v.is_portrait === 1);
      } else if (aspectFilter === 'landscape') {
        list = list.filter(v => v.is_portrait === 0);
      }

      setVideos(list);
      setGenres(catsRes.categories || []);
    } catch (e) {
      console.error('Failed to load video hub:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGenreId, sortOption, aspectFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Video Hub Header */}
      <div className="mb-6 pb-4 border-b border-[#E7E5E4] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-2xl text-[#1C1917]">
              Video Streaming Hub
            </h2>
          </div>
          <p className="text-[13px] text-[#57534E] mt-1">
            Streaming instan lokal dengan HTTP Range seekable, native portrait 9:16 & 16:9 landscape.
          </p>
        </div>

        {/* Orientation & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-[4px] border border-[#D6D3D1]">
            <button
              onClick={() => setAspectFilter('all')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded-[3px] transition-colors ${
                aspectFilter === 'all' ? 'bg-[#C2410C] text-white' : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Semua Rasio
            </button>
            <button
              onClick={() => setAspectFilter('portrait')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded-[3px] transition-colors ${
                aspectFilter === 'portrait' ? 'bg-[#C2410C] text-white' : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Portrait 9:16
            </button>
            <button
              onClick={() => setAspectFilter('landscape')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded-[3px] transition-colors ${
                aspectFilter === 'landscape' ? 'bg-[#C2410C] text-white' : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              Landscape 16:9
            </button>
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="input-artisan h-[34px] py-0 text-[13px] bg-white"
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
          <span className="text-[12px] font-semibold text-[#57534E] flex items-center gap-1 shrink-0">
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
        <div className="text-center py-20 text-[#A8A29E] font-serif text-lg">
          Memuat koleksi video...
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-dashed border-[#D6D3D1] rounded-[8px] p-8">
          <Video className="w-12 h-12 text-[#D4A373] mx-auto mb-3" />
          <h4 className="font-serif font-semibold text-lg text-[#1C1917]">
            Belum ada video di perpustakaan
          </h4>
          <p className="text-[13px] text-[#57534E] mt-1 max-w-sm mx-auto">
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

