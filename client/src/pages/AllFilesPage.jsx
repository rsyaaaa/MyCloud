import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder, FileText, Image, Video, HardDrive, Search, LayoutGrid, List,
  Download, Trash2, Edit2, Heart, Lock, MoreVertical, ArrowUpDown, ChevronRight
} from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';

export default function AllFilesPage({
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onContextMenu,
  onShowDetail,
  onOpenUpload
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video', 'document'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState('list'); // 'list' (Table) | 'grid'

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
    } catch (err) {
      console.error('Failed to load all files:', err);
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-enter">
      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C] mb-1">
            <span>MyCloud</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Penyimpanan Utama</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#C2410C] font-semibold">All Files</span>
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            All Files (Direktori Utama)
          </h2>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
            {files.length} file tersimpan • Total {formatBytes(totalBytes)}
          </p>
        </div>

        {onOpenUpload && (
          <button
            onClick={onOpenUpload}
            className="btn-primary text-[13px] h-9 px-4 rounded-[6px]"
          >
            Upload File
          </button>
        )}
      </div>

      {/* Filter Chips & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]">
        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`chip-filter ${filterType === 'all' ? 'chip-filter-active' : ''}`}
          >
            Semua File
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
            onClick={() => setFilterType('document')}
            className={`chip-filter ${filterType === 'document' ? 'chip-filter-active' : ''}`}
          >
            <FileText className="w-3.5 h-3.5" /> Dokumen
          </button>
        </div>

        {/* Search, Sort & View Mode */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#9C9C9C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-artisan pl-9 pr-3 h-[32px] text-[12px] w-40 sm:w-52"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 text-[12px]">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="input-artisan h-[32px] py-0 text-[12px] bg-white dark:bg-[#000000]"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="size_desc">Ukuran Terbesar</option>
              <option value="size_asc">Ukuran Terkecil</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27]">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[4px] transition-colors ${
                viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[4px] transition-colors ${
                viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <MediaGridSkeleton count={8} />
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
          <Folder className="w-12 h-12 text-[#C2410C] mx-auto mb-3 opacity-40" />
          <h4 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            Direktori kosong
          </h4>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Belum ada file di direktori utama Anda. Gunakan tombol Upload untuk menambahkan file.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* Table / List View */
        <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E8EC] dark:border-[#1F1F27] bg-[#FAFAFA] dark:bg-[#121218] text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] dark:text-[#9C9C9C]">
                <th className="py-3 px-4">Nama File</th>
                <th className="py-3 px-4 hidden sm:table-cell">Jenis</th>
                <th className="py-3 px-4">Ukuran</th>
                <th className="py-3 px-4 hidden md:table-cell">Tanggal Diunggah</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8EC] dark:divide-[#1F1F27] text-[13px]">
              {files.map((file, idx) => {
                const isDoc = file.media_type === 'document';
                const isVid = file.media_type === 'video';
                const isImg = file.media_type === 'image';

                return (
                  <tr
                    key={file.id}
                    onClick={() => handleFileClick(file, idx)}
                    className="hover:bg-[#F4F4F5] dark:hover:bg-[#141418] cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[6px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center shrink-0 border border-[#E8E8EC] dark:border-[#1F1F27]">
                          {isDoc ? (
                            <FileText className="w-4 h-4 text-[#C2410C]" />
                          ) : (
                            <img
                              src={api.getThumbnailUrl(file.id)}
                              alt={file.display_name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA] group-hover:text-[#C2410C] transition-colors truncate max-w-xs sm:max-w-md">
                          {file.display_name || file.original_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] uppercase">
                      {file.media_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                      {formatBytes(file.file_size)}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                      {new Date(file.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={api.getDownloadUrl(file.id)}
                          download={file.original_name}
                          className="p-1.5 text-[#6B6B6B] hover:text-[#C2410C] rounded hover:bg-[#E8E8EC] dark:hover:bg-[#1F1F27]"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => onDelete && onDelete(file.id)}
                          className="p-1.5 text-[#6B6B6B] hover:text-[#EF4444] rounded hover:bg-[#E8E8EC] dark:hover:bg-[#1F1F27]"
                          title="Hapus ke Sampah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file, idx) => (
            <MediaCard
              key={file.id}
              media={file}
              onClick={() => handleFileClick(file, idx)}
              onToggleFavorite={onToggleFavorite}
              onLock={onLock}
              onOrganize={onOrganize}
              onDelete={onDelete}
              onRename={onRename}
              onContextMenu={onContextMenu}
              onShowDetail={onShowDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}

