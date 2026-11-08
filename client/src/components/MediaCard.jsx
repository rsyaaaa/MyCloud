import React, { useState, useRef } from 'react';
import { Play, Heart, Lock, Unlock, MoreVertical, Folder, Trash2, Edit2, Download, Info, FileText } from 'lucide-react';
import { api } from '../api';
import { formatBytes } from './QuotaBar';

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MediaCard({
  media,
  onClick,
  onToggleFavorite,
  onLock,
  onUnlock,
  onOrganize,
  onDelete,
  onRename,
  onContextMenu,
  onLongPress,
  onShowDetail,
  isVault = false,
  vaultToken = null
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isVideo = media.media_type === 'video';
  const isDoc = media.media_type === 'document' || media.type === 'document';
  const fileExt = media.original_name ? media.original_name.split('.').pop().toUpperCase() : (isDoc ? 'DOC' : '');
  const badgeColor = fileExt === 'PDF'
    ? 'bg-[#DC2626]'
    : fileExt === 'DOCX' || fileExt === 'DOC'
    ? 'bg-[#2563EB]'
    : fileExt === 'PPTX' || fileExt === 'PPT'
    ? 'bg-[#D97706]'
    : fileExt === 'XLSX' || fileExt === 'XLS' || fileExt === 'CSV'
    ? 'bg-[#059669]'
    : 'bg-[#C2410C]';
  const touchTimerRef = useRef(null);

  const thumbSrc = isVault
    ? api.getVaultThumbnailUrl(media.id, vaultToken)
    : api.getThumbnailUrl(media.id);

  const handleContextMenu = (e) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(e, media);
    }
  };

  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      if (onLongPress) {
        if (navigator.vibrate) navigator.vibrate(40);
        onLongPress(media);
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className="group relative card-artisan overflow-hidden flex flex-col cursor-pointer bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] transition-all"
    >
      {/* Thumbnail Container: Uniform Square Aspect Ratio */}
      <div
        onClick={onClick}
        className="relative overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center aspect-square"
      >
        {isDoc ? (
          media.thumbnail_path ? (
            <div className="w-full h-full relative overflow-hidden bg-white dark:bg-[#121217] flex items-center justify-center">
              <img
                src={thumbSrc}
                alt={media.display_name}
                loading="lazy"
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.doc-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="doc-fallback hidden w-full h-full flex-col items-center justify-center p-3 bg-gradient-to-br from-[#FFF7ED] to-[#FAFAFA] dark:from-[#1A0E08] dark:to-[#0A0A0E] text-center select-none">
                <div className="w-12 h-12 rounded-[10px] bg-[#C2410C]/10 dark:bg-[#C2410C]/20 text-[#C2410C] flex items-center justify-center mb-2">
                  <FileText className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded text-white ${badgeColor}`}>
                  {fileExt}
                </span>
              </div>
              <span className={`absolute bottom-2 left-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shadow-sm text-white ${badgeColor}`}>
                {fileExt}
              </span>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-[#FFF7ED] to-[#FAFAFA] dark:from-[#1A0E08] dark:to-[#0A0A0E] text-center select-none">
              <div className="w-12 h-12 rounded-[10px] bg-[#C2410C]/10 dark:bg-[#C2410C]/20 text-[#C2410C] flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded text-white ${badgeColor}`}>
                {fileExt}
              </span>
            </div>
          )
        ) : (
          <img
            src={thumbSrc}
            alt={media.display_name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}

        {/* Video Overlay Badge */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/35 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#C2410C]/90 text-white flex items-center justify-center shadow-primary-glow group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 ml-0.5 fill-white" />
            </div>

            {media.duration_seconds > 0 && (
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-mono px-1.5 py-0.5 rounded-[3px]">
                {formatSeconds(media.duration_seconds)}
              </span>
            )}
          </div>
        )}

        {/* Quick Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(media.id, !media.is_favorite);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
            media.is_favorite
              ? 'bg-white text-[#EF4444] opacity-100 shadow'
              : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:scale-110'
          }`}
          title="Favorit"
        >
          <Heart className={`w-4 h-4 ${media.is_favorite ? 'fill-[#EF4444]' : ''}`} />
        </button>
      </div>

      {/* Media Details Footer */}
      <div className="p-2.5 sm:p-3 flex items-start justify-between gap-2 border-t border-[#E8E8EC] dark:border-[#1F1F27] bg-white dark:bg-[#0A0A0E]">
        <div className="truncate flex-1 min-w-0" onClick={onClick}>
          <h4 className="text-[13px] sm:text-[14px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate hover:text-[#C2410C] transition-colors leading-snug">
            {media.display_name}
          </h4>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
            <span className="font-mono">{formatBytes(media.file_size)}</span>
            <span>•</span>
            <span>
              {new Date(media.captured_at || media.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short'
              })}
            </span>
          </div>
        </div>

        {/* 3-dot dropdown menu */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] rounded hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[8px] shadow-lg py-1 z-30 text-[13px] animate-enter select-none"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRename(media);
                }}
                className="w-full px-3 py-1.5 text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#6B6B6B] dark:text-[#9C9C9C]" />
                <span>Ubah Nama</span>
              </button>

              {!isVault && onOrganize && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOrganize(media);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] flex items-center gap-2"
                >
                  <Folder className="w-3.5 h-3.5 text-[#6B6B6B] dark:text-[#9C9C9C]" />
                  <span>Atur ke Album</span>
                </button>
              )}

              {isVault ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onUnlock(media.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] flex items-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Keluarkan ke Galeri</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLock(media.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Kunci ke Brankas</span>
                </button>
              )}

              {onShowDetail && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onShowDetail(media);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] flex items-center gap-2"
                >
                  <Info className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Detail Metadata</span>
                </button>
              )}

              {!isVault && (
                <a
                  href={api.getDownloadUrl(media.id)}
                  download
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-3 py-1.5 text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-[#6B6B6B] dark:text-[#9C9C9C]" />
                  <span>Unduh File</span>
                </a>
              )}

              <div className="border-t border-[#E8E8EC] dark:border-[#1F1F27] my-1" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(media.id);
                }}
                className="w-full px-3 py-1.5 text-left text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#2A0808] flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pindah ke Sampah</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
