import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, X } from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';
import { useLanguage } from '../context/LanguageContext';

export default function MobileDocumentsView({
  onOpenText,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress
}) {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const loadDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { media_type: 'document', sort: sortOption };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.listMedia(params);
      setDocuments(res.media || []);
      if (!silent) setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load mobile documents:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [searchQuery, sortOption]);

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

  const totalPages = Math.ceil(documents.length / pageSize) || 1;
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return documents.slice(start, start + pageSize);
  }, [documents, currentPage, pageSize]);

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <h2 className="font-serif font-bold text-xl text-[#0A0A0A] dark:text-[#FAFAFA]">
            {t('documentsTitle', 'Dokumen')}
          </h2>
          <p className="text-[11px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
            {documents.length} {t('fileCount', 'file')} • {formatBytes(totalBytes)}
          </p>
        </div>
        <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border border-[#C2410C]/20 flex items-center justify-center shrink-0">
          <FileText className="w-4.5 h-4.5 stroke-[2.2]" />
        </div>
      </div>

      {/* Search & sort */}
      <div className="flex items-center gap-2">
        <div className="flex items-center flex-1 h-[34px] px-2.5 rounded-[6px] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all">
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
              className="p-0.5 text-[#9C9C9C] hover:text-[#C2410C] shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="input-artisan h-[34px] py-0 px-2 text-[11px] bg-white dark:bg-[#000000] shrink-0"
        >
          <option value="newest">{t('sortNewest', 'Terbaru')}</option>
          <option value="oldest">{t('sortOldest', 'Terlama')}</option>
          <option value="size_desc">{t('sortLargest', 'Terbesar')}</option>
          <option value="size_asc">{t('sortSmallest', 'Terkecil')}</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <MediaGridSkeleton count={6} />
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
          <FileText className="w-10 h-10 text-[#C2410C] mx-auto mb-2 opacity-40" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            {t('noDocuments', 'Belum ada dokumen')}
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            {t('noDocumentsHint', 'Gunakan tombol Upload untuk mengunggah PDF, DOCX, TXT, dll.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {paginatedDocuments.map((doc) => (
            <MobileMediaCard
              key={doc.id}
              media={doc}
              onClick={() => handleDocumentClick(doc)}
              onToggleFavorite={onToggleFavorite}
              onLock={onLock}
              onOrganize={onOrganize}
              onDelete={onDelete}
              onRename={onRename}
              onLongPress={onLongPress}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <MobilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={documents.length}
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
