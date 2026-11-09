import React, { useRef } from 'react';
import { Play, Heart, MoreVertical, FileText } from 'lucide-react';
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
      className="card-artisan p-2.5 flex items-center justify-between gap-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] active:scale-[0.99] transition-transform relative"
    >
      {/* Thumbnail + Play Badge */}
      <div
        onClick={onClick}
        className="relative w-16 h-16 shrink-0 rounded-[8px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] border border-[#E8E8EC] dark:border-[#1F1F27] cursor-pointer flex items-center justify-center"
      >
        {media.thumbnail_path ? (
          <img
            src={thumbSrc}
            alt={media.display_name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fb = e.currentTarget.parentElement?.querySelector('.list-doc-fallback');
              if (fb) fb.style.display = 'flex';
            }}
          />
        ) : null}

        <div className={`list-doc-fallback w-full h-full flex items-center justify-center ${media.thumbnail_path ? 'hidden' : 'flex'}`}>
          {media.media_type === 'document' ? (
            <FileText className="w-6 h-6 text-[#C2410C]" />
          ) : !media.thumbnail_path ? (
            <img
              src={thumbSrc}
              alt={media.display_name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-6 h-6 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-primary-glow">
              <Play className="w-3 h-3 ml-0.5 fill-white" />
            </div>
            {media.duration_seconds > 0 && (
              <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[8px] font-mono px-1 py-0.2 rounded">
                {formatSeconds(media.duration_seconds)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle: Title, Meta Info */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        <h4 className="font-semibold text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA] line-clamp-1 leading-snug">
          {media.display_name}
        </h4>

        <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
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
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#F4F4F5] dark:bg-[#14141A] text-[#6B6B6B] dark:text-[#9C9C9C] border border-[#E8E8EC] dark:border-[#1F1F27]">
            {isVideo ? 'Video' : 'Foto'}
          </span>
          {media.category_names && (
            <span className="text-[9px] font-medium text-[#C2410C] bg-[#FFF7ED] dark:bg-[#2A1208] px-1.5 py-0.5 rounded border border-[#C2410C]/20 truncate max-w-[100px]">
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
            media.is_favorite ? 'text-[#EF4444]' : 'text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]'
          }`}
          title="Favorit"
        >
          <Heart className={`w-4 h-4 ${media.is_favorite ? 'fill-[#EF4444]' : ''}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onLongPress) onLongPress(media);
          }}
          className="p-1 text-[#57534E] dark:text-[#A1A1AA] hover:text-[#1C1917] dark:hover:text-white"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
