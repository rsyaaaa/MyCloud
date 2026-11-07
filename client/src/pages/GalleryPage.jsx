import React, { useState, useEffect, useMemo } from 'react';
import { Image, Video, Heart, SlidersHorizontal, Sparkles } from 'lucide-react';
import MemoriesCarousel from '../components/MemoriesCarousel';
import MediaCard from '../components/MediaCard';
import { api } from '../api';

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

export default function GalleryPage({
  searchQuery,
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename
}) {
  const [mediaList, setMediaList] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video', 'favorite'
  const [sortOption, setSortOption] = useState('newest');

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
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [filterType, sortOption, searchQuery]);

  const groupedMedia = useMemo(() => groupMediaByDate(mediaList), [mediaList]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Memories Engine Banner: "Ingatkah Momen Ini?" */}
      {!searchQuery && memories.length > 0 && (
        <MemoriesCarousel
          memories={memories}
          onSelectMedia={(items, index) => onOpenViewer(items, index)}
        />
      )}

      {/* Filter Chips & Sorting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E7E5E4]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`chip-filter ${filterType === 'all' ? 'chip-filter-active' : ''}`}
          >
            Semua Media
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`chip-filter ${filterType === 'image' ? 'chip-filter-active' : ''}`}
          >
            <Image className="w-3.5 h-3.5" /> Foto
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`chip-filter ${filterType === 'video' ? 'chip-filter-active' : ''}`}
          >
            <Video className="w-3.5 h-3.5" /> Video
          </button>
          <button
            onClick={() => setFilterType('favorite')}
            className={`chip-filter ${filterType === 'favorite' ? 'chip-filter-active' : ''}`}
          >
            <Heart className="w-3.5 h-3.5" /> Favorit
          </button>
        </div>

        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-[#57534E]">Urutkan:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="input-artisan h-[34px] py-0 text-[13px] bg-white"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="size_desc">Ukuran Terbesar</option>
            <option value="size_asc">Ukuran Terkecil</option>
            <option value="duration_desc">Durasi Terpanjang</option>
          </select>
        </div>
      </div>

      {/* Media Feed */}
      {loading ? (
        <div className="text-center py-20 text-[#A8A29E] font-serif text-lg">
          Memuat galeri media...
        </div>
      ) : mediaList.length === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-dashed border-[#D6D3D1] rounded-[8px] p-8">
          <Image className="w-12 h-12 text-[#D4A373] mx-auto mb-3" />
          <h4 className="font-serif font-semibold text-lg text-[#1C1917]">
            Belum ada foto atau video
          </h4>
          <p className="text-[13px] text-[#57534E] mt-1 max-w-sm mx-auto">
            Mulai simpan kenangan Anda di Personal Cloud lokal ini dengan menekan tombol <strong>Unggah Media</strong> di atas.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMedia).map(([dateGroup, items]) => (
            <section key={dateGroup}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-serif font-semibold text-xl text-[#1C1917]">
                  {dateGroup}
                </h3>
                <span className="text-[12px] font-mono text-[#57534E] bg-white border border-[#E7E5E4] px-2 py-0.5 rounded-[3px]">
                  {items.length} item
                </span>
                <div className="flex-1 h-[1px] bg-[#E7E5E4]" />
              </div>

              {/* Responsive Masonry / Dynamic Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((media) => {
                  const globalIdx = mediaList.findIndex((m) => m.id === media.id);
                  return (
                    <MediaCard
                      key={media.id}
                      media={media}
                      onClick={() => onOpenViewer(mediaList, globalIdx)}
                      onToggleFavorite={onToggleFavorite}
                      onLock={onLock}
                      onOrganize={onOrganize}
                      onDelete={onDelete}
                      onRename={onRename}
                    />
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

