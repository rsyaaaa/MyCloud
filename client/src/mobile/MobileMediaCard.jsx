import React, { useState, useRef } from 'react';
import { Play, Heart, MoreVertical, Edit2, Folder, Lock, Unlock, Download, Trash2, Info } from 'lucide-react';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MobileMediaCard({
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
      className="card-artisan overflow-hidden flex flex-col bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] relative transition-transform active:scale-[0.98]"
    >
      {/* Thumbnail Area: Uniform Square Aspect Ratio */}
      <div
        onClick={onClick}
        className="relative overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center cursor-pointer aspect-square"
      >
        <img
          src={thumbSrc}
          alt={media.display_name}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-9 h-9 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-primary-glow">
              <Play className="w-4 h-4 ml-0.5 fill-white" />
            </div>

            {media.duration_seconds > 0 && (
              <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.2 rounded">
                {formatSeconds(media.duration_seconds)}
              </span>
            )}
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(media.id, !media.is_favorite);
          }}
          className={`absolute top-1.5 right-1.5 p-1.5 rounded-full ${
            media.is_favorite ? 'bg-white text-[#EF4444]' : 'bg-black/50 text-white'
          }`}
          title="Favorit"
        >
          <Heart className={`w-3.5 h-3.5 ${media.is_favorite ? 'fill-[#EF4444]' : ''}`} />
        </button>
      </div>

      {/* Card Info & Menu */}
      <div className="p-2 flex items-center justify-between gap-1 border-t border-[#E8E8EC] dark:border-[#1F1F27] bg-white dark:bg-[#0A0A0E]">
        <div className="truncate flex-1 min-w-0" onClick={onClick}>
          <h4 className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate leading-tight">
            {media.display_name}
          </h4>
          <span className="text-[11px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
            {formatBytes(media.file_size)}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onLongPress) onLongPress(media);
          }}
          className="p-1 text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] shrink-0"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
