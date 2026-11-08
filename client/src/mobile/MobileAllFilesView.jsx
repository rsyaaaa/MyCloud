import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder, FileText, Image, Video, HardDrive, Search, LayoutGrid, List,
  Download, Trash2, ChevronRight
} from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';

export default function MobileAllFilesView({
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video', 'document'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const loadFiles = async () => {
    setLoading(true);
    try {
      const params = { sort: sortOption };
      if (filterType !== 'all') {
        params.media_type = filterType;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.listMedia(params);
      setFiles(res.media || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load mobile all files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [filterType, sortOption, searchQuery]);

  const handleFileClick = (item, idx) => {
    recordRecentItem(item);
    if (item.media_type === 'document') {
      window.open(api.getStreamUrl(item.id), '_blank');
    } else {
      if (onOpenViewer) onOpenViewer(files, idx);
    }
  };

  const totalBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  }, [files]);

  const totalItems = files.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return files.slice(start, start + pageSize);
  }, [files, currentPage, pageSize]);

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 animate-enter">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
            <span>MyCloud</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#C2410C] font-semibold">All Files</span>
          </div>
          <h2 className="font-serif font-bold text-xl text-[#0A0A0A] dark:text-[#FAFAFA]">
            All Files (Direktori)
          </h2>
          <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">
            {files.length} file • {formatBytes(totalBytes)}
          </p>
        </div>
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

      {/* Search & View Mode Switcher */}
      <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-[#0A0A0E] rounded-[10px] border border-[#E8E8EC] dark:border-[#1F1F27]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#9C9C9C] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-artisan w-full pl-8 h-[30px] text-[12px]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
            title="List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
            title="Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Files List / Grid */}
      {loading ? (
        <MediaGridSkeleton count={6} />
      ) : files.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
          <Folder className="w-10 h-10 text-[#C2410C] mx-auto mb-2 opacity-40" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            Tidak ada file
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Gunakan tombol Upload di kanan bawah untuk mengunggah berkas.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* List Mode (Clean mobile page list) */
        <div className="space-y-2">
          {paginatedFiles.map((file, idx) => {
            const globalIdx = files.findIndex((f) => f.id === file.id);
            return (
              <MobileMediaListItem
                key={file.id}
                media={file}
                onClick={() => handleFileClick(file, globalIdx)}
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
        /* Grid Mode */
        <div className="grid grid-cols-2 gap-3">
          {paginatedFiles.map((file, idx) => {
            const globalIdx = files.findIndex((f) => f.id === file.id);
            return (
              <MobileMediaCard
                key={file.id}
                media={file}
                onClick={() => handleFileClick(file, globalIdx)}
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

      {/* Pagination */}
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

