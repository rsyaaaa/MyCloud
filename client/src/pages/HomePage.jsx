import React, { useState, useEffect } from 'react';
import {
  Image, Video, FileText, FolderOpen, Clock, HardDrive, ArrowRight,
  Folder, Play, Download, Trash2, Heart, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from '../components/QuotaBar';
import { getRecentHistory, clearRecentHistory, recordRecentItem } from '../utils/recentHistory';

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(isoString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function HomePage({
  onNavigate,
  onOpenViewer,
  onOpenUpload,
  onOpenQuotaModal
}) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ photos: 0, videos: 0, documents: 0, folders: 0, total: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [fallbackRecent, setFallbackRecent] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecentMinimized, setIsRecentMinimized] = useState(false);
  const [isFavoriteMinimized, setIsFavoriteMinimized] = useState(false);
  const [selectedDocFilter, setSelectedDocFilter] = useState(false);
  const [documentFiles, setDocumentFiles] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.getMediaStats().catch(() => null);
      if (statsRes) {
        setStats(statsRes);
      }

      const history = getRecentHistory();
      setRecentItems(history);

      const [recentMediaRes, favRes] = await Promise.all([
        api.listMedia({ sort: 'newest' }),
        api.listMedia({ is_favorite: '1', sort: 'newest' })
      ]);

      setFallbackRecent((recentMediaRes.media || []).slice(0, 12));
      setFavoriteItems(favRes.media || []);

      const docs = (recentMediaRes.media || []).filter(m => m.media_type === 'document');
      setDocumentFiles(docs);
    } catch (err) {
      console.error('Failed to load Home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearHistory = () => {
    clearRecentHistory();
    setRecentItems([]);
  };

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

  const displayList = recentItems.length > 0 ? recentItems : fallbackRecent;
  const isFallback = recentItems.length === 0 && fallbackRecent.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-7 animate-enter">
      {/* Header Greeting & Quota Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            Selamat Datang, {user?.username || 'User'}
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Pusat navigasi cloud & media pribadi Anda di jaringan lokal.
          </p>
        </div>

        {/* Quick Storage Status Pill */}
        <div className="flex items-center gap-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] px-3.5 py-2 rounded-[8px]">
          <HardDrive className="w-4 h-4 text-[#C2410C]" />
          <div className="text-[12px]">
            <span className="text-[#6B6B6B] dark:text-[#9C9C9C]">Penyimpanan: </span>
            <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] font-mono">
              {formatBytes(user?.used_storage_bytes || 0)}
            </strong>
            <span className="text-[#6B6B6B] dark:text-[#9C9C9C]"> / {formatBytes(user?.storage_quota_bytes || 0)}</span>
          </div>
        </div>
      </div>

      {/* 4 Overhauled Quick Access Cards: Foto, Video, Dokumen, All Files */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Foto */}
        <div
          onClick={() => onNavigate && onNavigate('gallery', 'photo')}
          className="group p-4 rounded-[14px] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] hover:border-[#C2410C] dark:hover:border-[#C2410C] hover:shadow-[0_8px_30px_rgba(194,65,12,0.12)] transition-all cursor-pointer flex flex-col justify-between min-h-[115px] select-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-[10px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20 group-hover:scale-105 group-hover:bg-[#C2410C] group-hover:text-white transition-all">
              <Image className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="w-6 h-6 rounded-full bg-[#F4F4F5] dark:bg-[#121218] flex items-center justify-center text-[#9C9C9C] group-hover:text-[#C2410C] group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <h4 className="font-serif font-bold text-[15px] sm:text-base text-[#0A0A0A] dark:text-[#FAFAFA] group-hover:text-[#C2410C] transition-colors leading-tight">
              Foto
            </h4>
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.photos} file
            </p>
          </div>
        </div>

        {/* Card 2: Video */}
        <div
          onClick={() => onNavigate && onNavigate('gallery', 'video')}
          className="group p-4 rounded-[14px] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] hover:border-[#C2410C] dark:hover:border-[#C2410C] hover:shadow-[0_8px_30px_rgba(194,65,12,0.12)] transition-all cursor-pointer flex flex-col justify-between min-h-[115px] select-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-[10px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20 group-hover:scale-105 group-hover:bg-[#C2410C] group-hover:text-white transition-all">
              <Video className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="w-6 h-6 rounded-full bg-[#F4F4F5] dark:bg-[#121218] flex items-center justify-center text-[#9C9C9C] group-hover:text-[#C2410C] group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <h4 className="font-serif font-bold text-[15px] sm:text-base text-[#0A0A0A] dark:text-[#FAFAFA] group-hover:text-[#C2410C] transition-colors leading-tight">
              Video
            </h4>
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.videos} file
            </p>
          </div>
        </div>

        {/* Card 3: Dokumen */}
        <div
          onClick={() => setSelectedDocFilter(!selectedDocFilter)}
          className={`group p-4 rounded-[14px] bg-white dark:bg-[#0A0A0E] border transition-all cursor-pointer flex flex-col justify-between min-h-[115px] select-none ${
            selectedDocFilter
              ? 'border-[#C2410C] ring-2 ring-[#C2410C]/20 shadow-[0_8px_30px_rgba(194,65,12,0.12)]'
              : 'border-[#E8E8EC] dark:border-[#1F1F27] hover:border-[#C2410C] dark:hover:border-[#C2410C] hover:shadow-[0_8px_30px_rgba(194,65,12,0.12)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-[10px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20 group-hover:scale-105 group-hover:bg-[#C2410C] group-hover:text-white transition-all">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="w-6 h-6 rounded-full bg-[#F4F4F5] dark:bg-[#121218] flex items-center justify-center text-[#9C9C9C] group-hover:text-[#C2410C] group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <h4 className="font-serif font-bold text-[15px] sm:text-base text-[#0A0A0A] dark:text-[#FAFAFA] group-hover:text-[#C2410C] transition-colors leading-tight">
              Dokumen
            </h4>
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.documents} file
            </p>
          </div>
        </div>

        {/* Card 4: All Files */}
        <div
          onClick={() => onNavigate && onNavigate('allfiles')}
          className="group p-4 rounded-[14px] bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] hover:border-[#C2410C] dark:hover:border-[#C2410C] hover:shadow-[0_8px_30px_rgba(194,65,12,0.12)] transition-all cursor-pointer flex flex-col justify-between min-h-[115px] select-none"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-[10px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20 group-hover:scale-105 group-hover:bg-[#C2410C] group-hover:text-white transition-all">
              <FolderOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="w-6 h-6 rounded-full bg-[#F4F4F5] dark:bg-[#121218] flex items-center justify-center text-[#9C9C9C] group-hover:text-[#C2410C] group-hover:translate-x-0.5 transition-all">
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <h4 className="font-serif font-bold text-[15px] sm:text-base text-[#0A0A0A] dark:text-[#FAFAFA] group-hover:text-[#C2410C] transition-colors leading-tight">
              All Files
            </h4>
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
              {stats.total} file total
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Document Section if Dokumen Card is toggled */}
      {selectedDocFilter && (
        <div className="p-5 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] animate-enter">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C2410C]" />
              <h4 className="font-serif font-bold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                Daftar Dokumen
              </h4>
            </div>
            <button
              onClick={() => setSelectedDocFilter(false)}
              className="text-[12px] text-[#6B6B6B] hover:text-[#0A0A0A] dark:hover:text-white"
            >
              Tutup
            </button>
          </div>

          {documentFiles.length === 0 ? (
            <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] py-4 text-center">
              Belum ada file dokumen. Gunakan tombol Upload untuk mengunggah PDF, DOCX, TXT, dll.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {documentFiles.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleRecentClick(doc)}
                  className="flex items-center justify-between p-3 rounded-[8px] border border-[#E8E8EC] dark:border-[#1F1F27] bg-[#FAFAFA] dark:bg-[#121218] hover:border-[#C2410C] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <FileText className="w-5 h-5 text-[#C2410C] shrink-0" />
                    <div className="truncate">
                      <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                        {doc.display_name}
                      </p>
                      <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">
                        {formatBytes(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[#9C9C9C] hover:text-[#C2410C] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorite Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#EF4444] fill-[#EF4444]" />
            <h3 className="font-serif font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
              Favorite
            </h3>
            {favoriteItems.length > 0 && !isFavoriteMinimized && (
              <span className="text-[10px] font-mono font-semibold text-[#6B6B6B] dark:text-[#9C9C9C] bg-[#F4F4F5] dark:bg-[#121218] px-2 py-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
                {favoriteItems.length} item
              </span>
            )}
          </div>

          <button
            onClick={() => setIsFavoriteMinimized(!isFavoriteMinimized)}
            className="p-1.5 rounded-[6px] text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#1F1F27] border border-[#E8E8EC] dark:border-[#1F1F27] transition-all flex items-center gap-1 text-[11px] font-medium"
            title={isFavoriteMinimized ? "Buka Favorite" : "Minimize Favorite"}
          >
            <span>{isFavoriteMinimized ? 'Tampilkan' : 'Minimize'}</span>
            {isFavoriteMinimized ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.2]" />
            )}
          </button>
        </div>

        {!isFavoriteMinimized && (
          favoriteItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
              <Heart className="w-9 h-9 text-[#EF4444] mx-auto mb-2 opacity-40" />
              <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                Belum ada media favorit
              </h4>
              <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
                Klik ikon hati pada foto atau video untuk menyimpannya di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {favoriteItems.map((item, idx) => {
                const isVid = item.media_type === 'video';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      recordRecentItem(item);
                      if (onOpenViewer) onOpenViewer(favoriteItems, idx);
                    }}
                    className="card-artisan p-2.5 cursor-pointer group hover:border-[#C2410C] transition-all flex flex-col justify-between relative bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]"
                  >
                    <div className="relative aspect-square w-full rounded-[8px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center mb-2">
                      <img
                        src={api.getThumbnailUrl(item.id)}
                        alt={item.display_name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {isVid && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                          <div className="w-7 h-7 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md">
                            <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5">
                        <Heart className="w-4 h-4 text-[#EF4444] fill-[#EF4444]" />
                      </div>
                    </div>

                    <div>
                      <h5 className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate group-hover:text-[#C2410C] transition-colors">
                        {item.display_name || item.original_name}
                      </h5>
                      <span className="text-[10px] uppercase font-mono text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 block">
                        {item.media_type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Recent Section (Dibawah Favorite) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#C2410C]" />
            <h3 className="font-serif font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
              Recent
            </h3>
            {isFallback && !isRecentMinimized && (
              <span className="text-[10px] font-semibold text-[#6B6B6B] dark:text-[#9C9C9C] bg-[#F4F4F5] dark:bg-[#121218] px-2 py-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
                File Terbaru
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {recentItems.length > 0 && !isRecentMinimized && (
              <button
                onClick={handleClearHistory}
                className="text-[12px] text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#EF4444] transition-colors mr-1"
              >
                Hapus Riwayat
              </button>
            )}

            {/* Minimize / Expand Button */}
            <button
              onClick={() => setIsRecentMinimized(!isRecentMinimized)}
              className="p-1.5 rounded-[6px] text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#1F1F27] border border-[#E8E8EC] dark:border-[#1F1F27] transition-all flex items-center gap-1 text-[11px] font-medium"
              title={isRecentMinimized ? "Buka Recent" : "Minimize Recent"}
            >
              <span>{isRecentMinimized ? 'Tampilkan' : 'Minimize'}</span>
              {isRecentMinimized ? (
                <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 stroke-[2.2]" />
              )}
            </button>
          </div>
        </div>

        {!isRecentMinimized && (
          displayList.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
              <Clock className="w-9 h-9 text-[#C2410C] mx-auto mb-2 opacity-40" />
              <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                Belum ada aktivitas
              </h4>
              <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1 max-w-sm mx-auto">
                Buka foto, video, atau dokumen untuk melihat riwayat aktivitas di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {displayList.map((item, idx) => {
                const isFolder = item.type === 'folder' || item.is_folder;
                const isDoc = item.media_type === 'document' || item.type === 'document';
                const isVid = item.media_type === 'video' || item.type === 'video';

                return (
                  <div
                    key={item.id || `folder_${item.folder_id}_${idx}`}
                    onClick={() => handleRecentClick(item)}
                    className="card-artisan p-2.5 cursor-pointer group hover:border-[#C2410C] transition-all flex flex-col justify-between relative bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]"
                  >
                    <div className="relative aspect-square w-full rounded-[8px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center mb-2">
                      {isFolder ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                          <Folder className="w-9 h-9 stroke-[1.8]" />
                        </div>
                      ) : isDoc ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                          <FileText className="w-8 h-8 stroke-[1.8] mb-1" />
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#C2410C] text-white">
                            DOC
                          </span>
                        </div>
                      ) : (
                        <>
                          <img
                            src={api.getThumbnailUrl(item.id)}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {isVid && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                              <div className="w-7 h-7 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-md">
                                <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <h5 className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate group-hover:text-[#C2410C] transition-colors">
                        {item.name || item.display_name}
                      </h5>
                      <div className="flex items-center justify-between text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
                        <span className="uppercase font-medium">
                          {isFolder ? 'Folder' : isDoc ? 'Doc' : isVid ? 'Video' : 'Foto'}
                        </span>
                        <span>
                          {formatRelativeTime(item.opened_at || item.captured_at || item.created_at)}
                        </span>
                      </div>
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
