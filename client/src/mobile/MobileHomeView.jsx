import React, { useState, useEffect } from 'react';
import {
  Image, Video, FileText, HardDrive, Play, Star, Clock, Heart,
  Folder, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatBytes } from '../components/QuotaBar';
import { getRecentHistory, clearRecentHistory, recordRecentItem } from '../utils/recentHistory';
import { subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';
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

function formatShortDate(isoString, lang = 'id') {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short'
  });
}

export default function MobileHomeView({
  onNavigate,
  onOpenViewer,
  onToggleFavorite,
  onOpenText
}) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [stats, setStats] = useState({ photos: 0, videos: 0, documents: 0, folders: 0, total: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [fallbackRecent, setFallbackRecent] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Terabox style tabbed section: 'recent' or 'favorite' (Starred), remembered across sessions & refreshes
  const [homeTab, setHomeTab] = useState(() => {
    return localStorage.getItem('mycloud_mobile_home_tab') || 'recent';
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const switchHomeTab = (tab) => {
    setHomeTab(tab);
    localStorage.setItem('mycloud_mobile_home_tab', tab);
    setIsExpanded(false);
  };

  const loadData = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const statsRes = await api.getMediaStats().catch(() => null);
      if (statsRes) setStats(statsRes);

      const history = getRecentHistory(user.id);
      setRecentItems(history);

      const [recentMediaRes, favRes] = await Promise.all([
        api.listMedia({ sort: 'newest' }),
        api.listMedia({ is_favorite: '1', sort: 'newest' })
      ]);

      setFallbackRecent((recentMediaRes.media || []).slice(0, 15));
      setFavoriteItems(favRes.media || []);
    } catch (err) {
      console.error('Failed to load mobile home data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // Real-time reactive listener for instant updates on Mobile Home
  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setFallbackRecent((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, is_favorite: event.is_favorite } : m))
        );
        if (event.is_favorite === 1) {
          loadData(true);
        } else {
          setFavoriteItems((prev) => prev.filter((m) => m.id !== event.id));
        }
      } else if (event.type === 'delete' || event.type === 'lock') {
        setFallbackRecent((prev) => prev.filter((m) => m.id !== event.id));
        setFavoriteItems((prev) => prev.filter((m) => m.id !== event.id));
        setRecentItems((prev) => prev.filter((m) => m.id !== event.id));
        loadData(true);
      } else if (['upload', 'restore', 'unlock', 'rename', 'folder', 'organize'].includes(event.type)) {
        loadData(true);
      }
    });
    return unsub;
  }, [user?.id]);

  const handleRecentClick = (item) => {
    if (item.type === 'folder' || item.is_folder) {
      if (onNavigate) onNavigate('allfiles', null, item.folder_id);
    } else if (item.media_type === 'document' || item.type === 'document') {
      recordRecentItem(item, user?.id);
      if (isTxtFile(item) && onOpenText) {
        onOpenText(item);
      } else {
        window.open(api.getStreamUrl(item.id), '_blank');
      }
    } else {
      recordRecentItem(item, user?.id);
      if (onOpenViewer) onOpenViewer([item], 0);
    }
  };

  const handleFavoriteClick = (item, idx) => {
    recordRecentItem(item, user?.id);
    if (item.media_type === 'document') {
      if (isTxtFile(item) && onOpenText) {
        onOpenText(item);
      } else {
        window.open(api.getStreamUrl(item.id), '_blank');
      }
    } else {
      if (onOpenViewer) onOpenViewer(favoriteItems, idx);
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
  const activeItems = homeTab === 'recent' ? displayList : favoriteItems;
  const visibleItems = isExpanded ? activeItems : activeItems.slice(0, 3);

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-6 animate-enter">
      {/* 1. User Greeting & Storage Quota Pill (Maintained as requested) */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1E1E26]">
        <div>
          <h2 className="font-serif font-bold text-xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            {t('hello', 'Halo')}, {user?.username === 'public' ? t('publicUser', 'Public User') : user?.username}
          </h2>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#8E8E9E]">
            {t('storageSubtitle', 'MyCloud Local NAS Storage')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFF7ED] dark:bg-[#25150D] text-[#C2410C] dark:text-[#EA580C] rounded-[8px] border border-[#C2410C]/20 dark:border-[#EA580C]/20 text-[11px] font-mono font-semibold">
          <HardDrive className="w-3.5 h-3.5" />
          <span>{formatBytes(user?.used_storage_bytes || 0)}</span>
        </div>
      </div>

      {/* 2. Category Icons Grid (Terabox Style: Squircles for Photos, Videos, Documents) */}
      <div className="grid grid-cols-3 gap-3 py-1">
        {/* Item 1: Photos */}
        <div
          onClick={() => onNavigate && onNavigate('gallery', 'photo')}
          className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all select-none"
        >
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#F3F4F6] dark:bg-[#181822] border border-[#E5E7EB] dark:border-[#252533] flex items-center justify-center shadow-sm group-hover:border-[#C2410C] dark:group-hover:border-[#EA580C] transition-all">
            <Image className="w-7 h-7 stroke-[1.9] text-[#0A0A0A] dark:text-[#FAFAFA]" />
          </div>
          <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#E4E4E7] text-center mt-2 group-hover:text-[#C2410C] dark:group-hover:text-[#EA580C] transition-colors">
            {t('photos', 'Foto')}
          </span>
          <span className="text-[11px] text-[#71717A] dark:text-[#8E8E9E] font-mono text-center">
            {stats.photos} {t('fileCount', 'file')}
          </span>
        </div>

        {/* Item 2: Videos */}
        <div
          onClick={() => onNavigate && onNavigate('gallery', 'video')}
          className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all select-none"
        >
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#F3F4F6] dark:bg-[#181822] border border-[#E5E7EB] dark:border-[#252533] flex items-center justify-center shadow-sm group-hover:border-[#C2410C] dark:group-hover:border-[#EA580C] transition-all">
            <Video className="w-7 h-7 stroke-[1.9] text-[#0A0A0A] dark:text-[#FAFAFA]" />
          </div>
          <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#E4E4E7] text-center mt-2 group-hover:text-[#C2410C] dark:group-hover:text-[#EA580C] transition-colors">
            {t('videos', 'Video')}
          </span>
          <span className="text-[11px] text-[#71717A] dark:text-[#8E8E9E] font-mono text-center">
            {stats.videos} {t('videoCount', 'video')}
          </span>
        </div>

        {/* Item 3: Documents */}
        <div
          onClick={() => onNavigate && onNavigate('documents')}
          className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all select-none"
        >
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#F3F4F6] dark:bg-[#181822] border border-[#E5E7EB] dark:border-[#252533] flex items-center justify-center shadow-sm group-hover:border-[#C2410C] dark:group-hover:border-[#EA580C] transition-all">
            <FileText className="w-7 h-7 stroke-[1.9] text-[#0A0A0A] dark:text-[#FAFAFA]" />
          </div>
          <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#E4E4E7] text-center mt-2 group-hover:text-[#C2410C] dark:group-hover:text-[#EA580C] transition-colors">
            {t('documents', 'Dokumen')}
          </span>
          <span className="text-[11px] text-[#71717A] dark:text-[#8E8E9E] font-mono text-center">
            {stats.documents} {t('fileCount', 'file')}
          </span>
        </div>
      </div>

      {/* 3. Recent & Starred / Favorite Tabbed Section (Terabox Style: Tabbed, Max 3 with Expand) */}
      <div className="bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] rounded-[22px] p-4 shadow-sm space-y-3 transition-colors">
        {/* Tab Navigation Header (Terabox Layout) */}
        <div className="flex items-center justify-between border-b border-[#E8E8EC] dark:border-[#20202A] pb-2.5 px-1">
          {/* Left Tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => switchHomeTab('recent')}
              className={`text-[15px] pb-1 relative transition-colors ${
                homeTab === 'recent'
                  ? 'font-bold text-[#0A0A0A] dark:text-white'
                  : 'font-medium text-[#71717A] dark:text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
            >
              <span>{t('recent', 'Recent')}</span>
              {homeTab === 'recent' && (
                <div className="absolute -bottom-2.5 left-0 right-0 h-[2.5px] bg-[#C2410C] dark:bg-white rounded-full transition-all" />
              )}
            </button>

            <button
              onClick={() => switchHomeTab('favorite')}
              className={`text-[15px] pb-1 relative transition-colors ${
                homeTab === 'favorite'
                  ? 'font-bold text-[#0A0A0A] dark:text-white'
                  : 'font-medium text-[#71717A] dark:text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
            >
              <span>{lang === 'en' ? 'Favorite' : 'Favorit'}</span>
              {homeTab === 'favorite' && (
                <div className="absolute -bottom-2.5 left-0 right-0 h-[2.5px] bg-[#C2410C] dark:bg-white rounded-full transition-all" />
              )}
            </button>
          </div>

          {/* Right Action: More / Expand toggle */}
          {activeItems.length > 3 ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[13px] font-semibold text-[#C2410C] dark:text-[#EA580C] hover:underline cursor-pointer select-none"
            >
              {isExpanded ? t('collapse', 'Tutup') : (lang === 'en' ? 'More' : 'Semua')}
            </button>
          ) : homeTab === 'recent' && recentItems.length > 0 ? (
            <button
              onClick={() => {
                clearRecentHistory(user?.id);
                setRecentItems([]);
              }}
              className="text-[12px] text-[#71717A] dark:text-[#8E8E9E] hover:text-[#EF4444] transition-colors"
            >
              {t('clearHistory', 'Hapus')}
            </button>
          ) : null}
        </div>

        {/* Tab Content List (Terabox Row Layout: Thumbnail + Title + ⭐ Date & Size) */}
        {activeItems.length === 0 ? (
          <div className="text-center py-10 px-4">
            {homeTab === 'recent' ? (
              <>
                <Clock className="w-8 h-8 text-[#71717A] dark:text-[#8E8E9E] mx-auto mb-2 opacity-40" />
                <p className="text-[13px] text-[#71717A] dark:text-[#8E8E9E]">
                  {t('noRecent', 'Belum ada riwayat aktivitas.')}
                </p>
              </>
            ) : (
              <>
                <Heart className="w-8 h-8 text-[#EF4444] mx-auto mb-2 opacity-40" />
                <p className="text-[13px] text-[#71717A] dark:text-[#8E8E9E]">
                  {t('noFavoriteDesc', 'Belum ada file yang ditandai favorit.')}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1 pt-1">
            {visibleItems.map((item, idx) => {
              const isFolder = item.type === 'folder' || item.is_folder;
              const isDoc = item.media_type === 'document' || item.type === 'document';
              const isVid = item.media_type === 'video' || item.type === 'video';

              return (
                <div
                  key={item.id || `item_${idx}`}
                  onClick={() => {
                    if (homeTab === 'recent') {
                      handleRecentClick(item);
                    } else {
                      handleFavoriteClick(item, idx);
                    }
                  }}
                  className="flex items-center gap-3.5 py-2 px-2 rounded-[14px] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer group"
                >
                  {/* Left: Squircle Thumbnail (Terabox style rounded-[10px]) */}
                  <div className="w-12 h-12 rounded-[11px] overflow-hidden bg-[#F4F4F6] dark:bg-[#1E1E28] shrink-0 border border-black/5 dark:border-white/5 flex items-center justify-center relative">
                    {isFolder ? (
                      <div className="w-full h-full flex items-center justify-center bg-[#FFF7ED] dark:bg-[#25150D] text-[#C2410C] dark:text-[#EA580C]">
                        <Folder className="w-6 h-6 stroke-[1.8]" />
                      </div>
                    ) : isDoc ? (
                      item.thumbnail_path ? (
                        <div className="w-full h-full relative overflow-hidden bg-white dark:bg-[#1E1E28]">
                          <img
                            src={api.getThumbnailUrl(item.id)}
                            alt={item.display_name || item.name}
                            loading="lazy"
                            className="w-full h-full object-cover object-top"
                          />
                          <span className="absolute bottom-0.5 left-0.5 text-[7px] uppercase font-bold px-1 rounded bg-[#C2410C] text-white">
                            {item.original_name ? item.original_name.split('.').pop().toUpperCase() : 'DOC'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#FFF7ED] dark:bg-[#25150D] text-[#C2410C] dark:text-[#EA580C]">
                          <FileText className="w-5 h-5 stroke-[1.8]" />
                          <span className="text-[7px] uppercase font-bold px-1 rounded bg-[#C2410C] text-white mt-0.5">
                            {item.original_name ? item.original_name.split('.').pop().toUpperCase() : 'DOC'}
                          </span>
                        </div>
                      )
                    ) : (
                      <>
                        <img
                          src={api.getThumbnailUrl(item.id)}
                          alt={item.display_name || item.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {isVid && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <div className="w-5 h-5 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md">
                              <Play className="w-2.5 h-2.5 ml-0.5 fill-white" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Middle: File Information (Title + Star/Clock + Date + Size) */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate group-hover:text-[#C2410C] dark:group-hover:text-[#EA580C] transition-colors leading-snug">
                      {item.display_name || item.original_name || item.name}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#8E8E9E] mt-0.5 font-mono">
                      {homeTab === 'favorite' ? (
                        <Heart className="w-3 h-3 text-[#EF4444] fill-[#EF4444] shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 text-[#71717A] dark:text-[#8E8E9E] shrink-0" />
                      )}
                      <span>
                        {homeTab === 'favorite'
                          ? formatShortDate(item.captured_at || item.created_at, lang)
                          : formatRelativeTime(item.opened_at || item.captured_at || item.created_at, lang)}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(item.file_size || 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expand / Show More Button at bottom of card */}
        {activeItems.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-2 py-2.5 rounded-[12px] bg-[#F4F4F6] dark:bg-[#1A1A24] hover:bg-[#EAEAEF] dark:hover:bg-[#20202C] text-[12px] font-medium text-[#71717A] dark:text-[#A0A0B0] flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99] select-none"
          >
            <span>
              {isExpanded
                ? t('showLess', 'Tampilkan 3 Saja')
                : `${t('showAll', 'Lihat Semua')} (${activeItems.length - 3} ${t('moreItems', 'lagi')})`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
