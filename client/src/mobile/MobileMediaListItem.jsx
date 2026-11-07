import React, { useState, useRef } from 'react';
import { Play, Heart, MoreVertical, Edit2, Folder, Lock, Unlock, Download, Trash2, Film, Image } from 'lucide-react';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MobileMediaListItem({
  media,
  onClick,
  onToggleFavorite,
  onLock,
  onUnlock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress,
  onShowDetail,
  isVault = false,
  vaultToken = null
}) {
  const isVideo = media.media_type === 'video';
  const touchTimerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const thumbSrc = isVault
    ? api.getVaultThumbnailUrl(media.id, vaultToken)
    : api.getThumbnailUrl(media.id);

  const handleTouchStart = (e) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchTimerRef.current = setTimeout(() => {
      if (onLongPress) {
        if (navigator.vibrate) navigator.vibrate(40);
        onLongPress(media);
      }
    }, 500);
  };

  const handleTouchMove = (e) => {
    const diffX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const diffY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (diffX > 10 || diffY > 10) {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress(media);
        }
      }}
      className="card-artisan p-2.5 flex items-center justify-between gap-3 bg-white dark:bg-[#23201D] border border-[#E7E5E4] dark:border-[#3E3834] rounded-[8px] active:scale-[0.99] transition-transform relative"
    >
      {/* Thumbnail + Play Badge */}
      <div
        onClick={onClick}
        className="relative w-16 h-16 shrink-0 rounded-[6px] overflow-hidden bg-[#FAF1E6] dark:bg-[#2E2A26] border border-[#E7E5E4] dark:border-[#3E3834] cursor-pointer flex items-center justify-center"
      >
        <img
          src={thumbSrc}
          alt={media.display_name}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-6 h-6 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow">
              <Play className="w-3 h-3 ml-0.5 fill-white" />
            </div>
            {media.duration_seconds > 0 && (
              <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[8px] font-mono px-1 py-0.2 rounded">
                {formatSeconds(media.duration_seconds)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle: Title, Meta Info */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        <h4 className="font-semibold text-[13px] text-[#1C1917] dark:text-[#F5F2EB] line-clamp-1 leading-snug">
          {media.display_name}
        </h4>

        <div className="flex items-center gap-2 text-[11px] text-[#57534E] dark:text-[#A8A29E] mt-0.5">
          <span className="font-mono">{formatBytes(media.file_size)}</span>
          <span>•</span>
          <span>
            {new Date(media.captured_at || media.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short'
            })}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#FFFBF5] dark:bg-[#2E2A26] text-[#57534E] dark:text-[#A8A29E] border border-[#E7E5E4] dark:border-[#3E3834]">
            {isVideo ? 'Video' : 'Foto'}
          </span>
          {media.category_names && (
            <span className="text-[9px] font-medium text-[#C2410C] bg-[#FDF6EC] dark:bg-[#2E2A26] px-1.5 py-0.2 rounded border border-[#D4A373] truncate max-w-[100px]">
              {media.category_names.split(',')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Favorite & 3-Dot Button */}
      <div className="flex flex-col items-center justify-between gap-2 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(media.id, !media.is_favorite);
          }}
          className={`p-1 rounded-full ${
            media.is_favorite ? 'text-[#DC2626]' : 'text-[#A8A29E] hover:text-[#1C1917]'
          }`}
          title="Favorit"
        >
          <Heart className={`w-4 h-4 ${media.is_favorite ? 'fill-[#DC2626]' : ''}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onLongPress) onLongPress(media);
          }}
          className="p-1 text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917]"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
