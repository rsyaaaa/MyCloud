import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Image, Video, FileText, Folder, Play, Download, Trash2, Clock
} from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import { api } from '../api';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';

export default function MobileSearchView({
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress
}) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video', 'document'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = { search: query.trim(), sort: 'newest' };
        if (filterType !== 'all') {
          params.media_type = filterType;
        }
        const res = await api.listMedia(params);
        setResults(res.media || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, filterType]);

  const handleItemClick = (item, idx) => {
    recordRecentItem(item);
    if (item.media_type === 'document') {
      window.open(api.getStreamUrl(item.id), '_blank');
    } else {
      if (onOpenViewer) onOpenViewer(results, idx);
    }
  };

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 animate-enter">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#C2410C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          autoFocus
          placeholder="Cari foto, video, dokumen, judul..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-artisan w-full pl-10 pr-10 h-11 text-[14px] bg-white dark:bg-[#0A0A0E] border-[#E8E8EC] dark:border-[#1F1F27] focus:border-[#C2410C]"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterType('all')}
          className={`chip-filter shrink-0 ${filterType === 'all' ? 'chip-filter-active' : ''}`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterType('image')}
          className={`chip-filter shrink-0 ${filterType === 'image' ? 'chip-filter-active' : ''}`}
        >
          <Image className="w-3 h-3" /> Foto
        </button>
        <button
          onClick={() => setFilterType('video')}
          className={`chip-filter shrink-0 ${filterType === 'video' ? 'chip-filter-active' : ''}`}
        >
          <Video className="w-3 h-3" /> Video
        </button>
        <button
          onClick={() => setFilterType('document')}
          className={`chip-filter shrink-0 ${filterType === 'document' ? 'chip-filter-active' : ''}`}
        >
          <FileText className="w-3 h-3" /> Dokumen
        </button>
      </div>

      {/* Content Area */}
      {!query.trim() ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
          <Search className="w-10 h-10 text-[#C2410C] mx-auto mb-2 opacity-40" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            Pencarian Cepat
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1 max-w-xs mx-auto">
            Ketik kata kunci nama file, foto, video, atau dokumen untuk melihat hasil pencarian langsung.
          </p>
        </div>
      ) : loading ? (
        <MediaGridSkeleton count={6} />
      ) : results.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
          <Search className="w-8 h-8 text-[#9C9C9C] mx-auto mb-2" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            Tidak ditemukan
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Tidak ada file yang cocok dengan kata kunci "{query}".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] px-1 font-mono">
            <span>Ditemukan {results.length} hasil</span>
          </div>

          <div className="space-y-2">
            {results.map((item, idx) => (
              <MobileMediaListItem
                key={item.id}
                media={item}
                onClick={() => handleItemClick(item, idx)}
                onToggleFavorite={onToggleFavorite}
                onLock={onLock}
                onOrganize={onOrganize}
                onDelete={onDelete}
                onRename={onRename}
                onLongPress={onLongPress}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

