import React, { useState, useEffect } from 'react';
import {
  Image, Video, FileText, FolderOpen, Clock, HardDrive, Heart,
  Folder, Play, Download, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatBytes } from '../components/QuotaBar';
import { getRecentHistory, clearRecentHistory, recordRecentItem } from '../utils/recentHistory';
import AdminHomeDashboard from '../components/AdminHomeDashboard';

function formatRelativeTime(isoString, lang = 'id') {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'en' ? 'Just now' : 'Baru saja';
  if (mins < 60) return `${mins}${lang === 'en' ? 'm ago' : 'm lalu'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${lang === 'en' ? 'h ago' : 'j lalu'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}${lang === 'en' ? 'd ago' : 'h lalu'}`;
  return new Date(isoString).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short' });
}

export default function MobileHomeView({
  onNavigate,
  onOpenViewer,
  onToggleFavorite
}) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [stats, setStats] = useState({ photos: 0, videos: 0, documents: 0, folders: 0, total: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [fallbackRecent, setFallbackRecent] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecentMinimized, setIsRecentMinimized] = useState(() => {
    return localStorage.getItem('mycloud_recent_minimized') === 'true';
  });
  const [isFavoriteMinimized, setIsFavoriteMinimized] = useState(() => {
    return localStorage.getItem('mycloud_favorite_minimized') === 'true';
  });

  const toggleRecentMinimized = () => {
    setIsRecentMinimized((prev) => {
      const nextVal = !prev;
      localStorage.setItem('mycloud_recent_minimized', String(nextVal));
      return nextVal;
    });
  };

  const toggleFavoriteMinimized = () => {
    setIsFavoriteMinimized((prev) => {
      const nextVal = !prev;
      localStorage.setItem('mycloud_favorite_minimized', String(nextVal));
      return nextVal;
    });
  };
  const [selectedDocFilter, setSelectedDocFilter] = useState(false);
  const [documentFiles, setDocumentFiles] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.getMediaStats().catch(() => null);
      if (statsRes) setStats(statsRes);

      const history = getRecentHistory();
      setRecentItems(history);

      const [recentMediaRes, favRes] = await Promise.all([
        api.listMedia({ sort: 'newest' }),
        api.listMedia({ is_favorite: '1', sort: 'newest' })
      ]);

      setFallbackRecent((recentMediaRes.media || []).slice(0, 10));
      setFavoriteItems(favRes.media || []);

      const docs = (recentMediaRes.media || []).filter(m => m.media_type === 'document');
      setDocumentFiles(docs);
    } catch (err) {
      console.error('Failed to load mobile home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecentClick = (item) => {
    if (item.type === 'folder' || item.is_folder) {
      if (onNavigate) onNavigate('allfiles', null, item.folder_id);
    } else if (item.media_type === 'document' || item.type === 'document') {
      window.open(api.getStreamUrl(item.id), '_blank');
      recordRecentItem(item);
    } else {
      recordRecentItem(item);
      if (onOpenViewer) onOpenViewer([item], 0);
    }
  };

  if (user?.role === 'admin') {
    return (
      <div className="pb-28">
        <AdminHomeDashboard />
      </div>
    );
  }

  const displayList = recentItems.length > 0 ? recentItems : fallbackRecent;

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-5 animate-enter">
      {/* User Greeting & Storage Quota Pill */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <h2 className="font-serif font-bold text-xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            {t('hello', 'Halo')}, {user?.username === 'public' ? t('publicUser', 'Public User') : user?.username}
          </h2>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
            {t('storageSubtitle', 'MyCloud Local NAS Storage')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] rounded-[6px] border border-[#C2410C]/20 text-[11px] font-mono font-semibold">
          <HardDrive className="w-3.5 h-3.5" />
          <span>{formatBytes(user?.used_storage_bytes || 0)}</span>
        </div>
      </div>

      {/* 4 Overhauled Quick Access Cards in 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Foto */}
        <div
          onClick={() => onNavigate && onNavigate('gallery', 'photo')}
          className="group p-3.5 rounded-[12px] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] active:border-[#C2410C] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[105px] select-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20">
              <Image className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#9C9C9C]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
              {t('photos', 'Foto')}
            </h4>
            <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.photos} {t('fileCount', 'file')}
            </p>
          </div>
        </div>

        {/* Card 2: Video */}
        <div
          onClick={() => onNavigate && onNavigate('gallery', 'video')}
          className="group p-3.5 rounded-[12px] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] active:border-[#C2410C] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[105px] select-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20">
              <Video className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#9C9C9C]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
              {t('videos', 'Video')}
            </h4>
            <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.videos} {t('videoCount', 'video')}
            </p>
          </div>
        </div>

        {/* Card 3: Dokumen */}
        <div
          onClick={() => setSelectedDocFilter(!selectedDocFilter)}
          className={`group p-3.5 rounded-[12px] bg-white dark:bg-[#0A0A0E] border active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[105px] select-none ${
            selectedDocFilter
              ? 'border-[#C2410C] ring-2 ring-[#C2410C]/20'
              : 'border-[#E8E8EC] dark:border-[#1F1F27]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20">
              <FileText className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#9C9C9C]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
              {t('documents', 'Dokumen')}
            </h4>
            <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.documents} {t('fileCount', 'file')}
            </p>
          </div>
        </div>

        {/* Card 4: All Files */}
        <div
          onClick={() => onNavigate && onNavigate('allfiles')}
          className="group p-3.5 rounded-[12px] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] active:border-[#C2410C] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[105px] select-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20">
              <FolderOpen className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#9C9C9C]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
              {t('allFiles', 'All Files')}
            </h4>
            <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.total} {t('totalCount', 'total')}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Document Files on Mobile */}
      {selectedDocFilter && (
        <div className="p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] animate-enter">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
            <h4 className="font-serif font-bold text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('documentList', 'Daftar Dokumen')}
            </h4>
            <button
              onClick={() => setSelectedDocFilter(false)}
              className="text-[11px] text-[#6B6B6B] hover:text-[#0A0A0A] dark:hover:text-white"
            >
              {t('close', 'Tutup')}
            </button>
          </div>

          {documentFiles.length === 0 ? (
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] py-3 text-center">
              {t('noDocsMobile', 'Belum ada dokumen. Gunakan tombol Upload untuk mengunggah file.')}
            </p>
          ) : (
            <div className="space-y-2">
              {documentFiles.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleRecentClick(doc)}
                  className="flex items-center justify-between p-2.5 rounded-[8px] border border-[#E8E8EC] dark:border-[#1F1F27] bg-[#FAFAFA] dark:bg-[#121218] active:bg-[#F4F4F5]"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText className="w-4 h-4 text-[#C2410C] shrink-0" />
                    <span className="text-[12px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                      {doc.display_name}
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-[#9C9C9C] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorite Section */}
      <div>
        <div className="flex items-center justify-between mb-3 pb-1 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-[#EF4444] fill-[#EF4444]" />
            <h3 className="font-serif font-bold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('favorite', 'Favorite')}
            </h3>
            {favoriteItems.length > 0 && !isFavoriteMinimized && (
              <span className="text-[10px] font-mono font-semibold text-[#6B6B6B] dark:text-[#9C9C9C] bg-[#F4F4F5] dark:bg-[#121218] px-1.5 py-0.2 rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
                {favoriteItems.length}
              </span>
            )}
          </div>

          {/* Minimize toggle button */}
          <button
            onClick={toggleFavoriteMinimized}
            className="p-1 rounded-[4px] text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] border border-[#E8E8EC] dark:border-[#1F1F27] transition-all flex items-center gap-1 text-[10px]"
            title={isFavoriteMinimized ? t('show', 'Tampilkan') : t('minimize', 'Minimize')}
          >
            <span>{isFavoriteMinimized ? t('show', 'Tampilkan') : t('minimize', 'Minimize')}</span>
            {isFavoriteMinimized ? (
              <ChevronDown className="w-3 h-3 stroke-[2.2]" />
            ) : (
              <ChevronUp className="w-3 h-3 stroke-[2.2]" />
            )}
          </button>
        </div>

        {!isFavoriteMinimized && (
          favoriteItems.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
              <Heart className="w-7 h-7 text-[#EF4444] mx-auto mb-1.5 opacity-40" />
              <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                {t('noFavoriteDesc', 'Belum ada media favorit. Klik ikon hati pada foto atau video untuk menyimpannya di sini.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {favoriteItems.map((item, idx) => {
                const isVid = item.media_type === 'video';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      recordRecentItem(item);
                      if (onOpenViewer) onOpenViewer(favoriteItems, idx);
                    }}
                    className="card-artisan p-2 cursor-pointer active:scale-95 transition-transform flex flex-col justify-between bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px] relative group"
                  >
                    <div className="relative aspect-square w-full rounded-[6px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center mb-1.5">
                      <img
                        src={api.getThumbnailUrl(item.id)}
                        alt={item.display_name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {isVid && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-6 h-6 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md">
                            <Play className="w-3 h-3 ml-0.5 fill-white" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-1 right-1">
                        <Heart className="w-3.5 h-3.5 text-[#EF4444] fill-[#EF4444]" />
                      </div>
                    </div>

                    <h5 className="text-[11px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                      {item.display_name || item.original_name}
                    </h5>
                    <span className="text-[9px] uppercase font-mono text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
                      {item.media_type}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Recent Section (Dibawah Favorite) */}
      <div>
        <div className="flex items-center justify-between mb-3 pb-1 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#C2410C]" />
            <h3 className="font-serif font-bold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('recent', 'Recent')}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {recentItems.length > 0 && !isRecentMinimized && (
              <button
                onClick={() => {
                  clearRecentHistory();
                  setRecentItems([]);
                }}
                className="text-[11px] text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#EF4444]"
              >
                {t('clearHistory', 'Hapus')}
              </button>
            )}

            {/* Minimize toggle button */}
            <button
              onClick={toggleRecentMinimized}
              className="p-1 rounded-[4px] text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] border border-[#E8E8EC] dark:border-[#1F1F27] transition-all flex items-center gap-1 text-[10px]"
              title={isRecentMinimized ? t('show', 'Tampilkan') : t('minimize', 'Minimize')}
            >
              <span>{isRecentMinimized ? t('show', 'Tampilkan') : t('minimize', 'Minimize')}</span>
              {isRecentMinimized ? (
                <ChevronDown className="w-3 h-3 stroke-[2.2]" />
              ) : (
                <ChevronUp className="w-3 h-3 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {!isRecentMinimized && (
          displayList.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
              <Clock className="w-7 h-7 text-[#C2410C] mx-auto mb-1.5 opacity-40" />
              <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                {t('noRecent', 'Belum ada riwayat aktivitas.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {displayList.map((item, idx) => {
                const isFolder = item.type === 'folder' || item.is_folder;
                const isDoc = item.media_type === 'document' || item.type === 'document';
                const isVid = item.media_type === 'video' || item.type === 'video';

                return (
                  <div
                    key={item.id || `folder_${item.folder_id}_${idx}`}
                    onClick={() => handleRecentClick(item)}
                    className="card-artisan p-2 cursor-pointer active:scale-95 transition-transform flex flex-col justify-between bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]"
                  >
                    <div className="relative aspect-square w-full rounded-[6px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center mb-1.5">
                      {isFolder ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                          <Folder className="w-8 h-8 stroke-[1.8]" />
                        </div>
                      ) : isDoc ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                          <FileText className="w-6 h-6 stroke-[1.8] mb-0.5" />
                          <span className="text-[8px] uppercase font-bold px-1 rounded bg-[#C2410C] text-white">
                            DOC
                          </span>
                        </div>
                      ) : (
                        <>
                          <img
                            src={api.getThumbnailUrl(item.id)}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {isVid && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-6 h-6 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md">
                                <Play className="w-3 h-3 ml-0.5 fill-white" />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <h5 className="text-[11px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                      {item.name || item.display_name}
                    </h5>
                    <div className="flex items-center justify-between text-[9px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
                      <span className="uppercase font-medium">
                        {isFolder ? 'Folder' : isDoc ? 'Doc' : isVid ? 'Video' : 'Foto'}
                      </span>
                      <span>
                        {formatRelativeTime(item.opened_at || item.captured_at || item.created_at, lang)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
