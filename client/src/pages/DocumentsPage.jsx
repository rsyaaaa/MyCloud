import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, X, HardDrive } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';
import { useLanguage } from '../context/LanguageContext';

export default function DocumentsPage({
  onOpenText,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onContextMenu,
  onShowDetail
}) {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  const loadDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { media_type: 'document', sort: sortOption };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.listMedia(params);
      setDocuments(res.media || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [searchQuery, sortOption]);

  // Real-time updates when files are added, removed, renamed, or edited.
  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setDocuments((prev) =>
          prev.map((d) => (d.id === event.id ? { ...d, is_favorite: event.is_favorite } : d))
        );
      } else if (event.type === 'delete' || event.type === 'lock') {
        setDocuments((prev) => prev.filter((d) => d.id !== event.id));
      } else if (event.type === 'rename') {
        setDocuments((prev) =>
          prev.map((d) => (d.id === event.id ? { ...d, display_name: event.name } : d))
        );
      } else if (['upload', 'restore', 'unlock', 'folder', 'organize'].includes(event.type)) {
        loadDocuments(true);
      }
    });
    return unsub;
  }, [searchQuery, sortOption]);

  const handleDocumentClick = (doc) => {
    recordRecentItem(doc);
    if (isTxtFile(doc) && onOpenText) {
      onOpenText(doc);
    } else {
      window.open(api.getStreamUrl(doc.id), '_blank');
    }
  };

  const totalBytes = useMemo(
    () => documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0),
    [documents]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-enter">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            {t('documentsTitle', 'Dokumen')}
          </h2>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
            {t('documentsSubtitle', 'Semua file dokumen Anda dalam satu tempat.')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[8px] text-[12px]">
          <HardDrive className="w-4 h-4 text-[#C2410C]" />
          <span className="font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
            {documents.length} {t('fileCount', 'file')} • {formatBytes(totalBytes)}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
          <FileText className="w-4 h-4 text-[#C2410C]" />
          <span>{t('documentList', 'Daftar Dokumen')}</span>
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          <div className="flex items-center h-[32px] px-2.5 rounded-[6px] bg-[#F4F4F5] dark:bg-[#121218] border border-[#E8E8EC] dark:border-[#1F1F27] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all w-44 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#9C9C9C] shrink-0 mr-2" />
            <input
              type="text"
              placeholder={t('searchDocumentPlaceholder', 'Cari dokumen...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none text-[12px] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#9C9C9C]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-[#9C9C9C] hover:text-[#C2410C] transition-colors shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="input-artisan h-[32px] py-0 text-[12px] bg-white dark:bg-[#000000]"
          >
            <option value="newest">{t('sortNewest', 'Terbaru')}</option>
            <option value="oldest">{t('sortOldest', 'Terlama')}</option>
            <option value="size_desc">{t('sortLargest', 'Ukuran Terbesar')}</option>
            <option value="size_asc">{t('sortSmallest', 'Ukuran Terkecil')}</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <MediaGridSkeleton count={8} />
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
          <FileText className="w-12 h-12 text-[#C2410C] mx-auto mb-3 opacity-40" />
          <h4 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            {t('noDocuments', 'Belum ada dokumen')}
          </h4>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1 max-w-sm mx-auto">
            {t('noDocumentsHint', 'Gunakan tombol Upload untuk mengunggah PDF, DOCX, TXT, dll.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {documents.map((doc) => (
            <MediaCard
              key={doc.id}
              media={doc}
              onClick={() => handleDocumentClick(doc)}
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
