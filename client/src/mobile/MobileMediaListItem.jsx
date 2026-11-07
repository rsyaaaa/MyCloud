import React, { useState } from 'react';
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
  isVault = false,
  vaultToken = null
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isVideo = media.media_type === 'video';

  const thumbSrc = isVault
    ? api.getVaultThumbnailUrl(media.id, vaultToken)
    : api.getThumbnailUrl(media.id);

  return (
    <div className="card-artisan p-2.5 flex items-center justify-between gap-3 bg-white hover:border-[#D4A373] transition-colors relative">
      {/* Thumbnail + Play Badge */}
      <div
        onClick={onClick}
        className="relative w-20 h-20 shrink-0 rounded-[6px] overflow-hidden bg-[#FAF1E6] border border-[#E7E5E4] cursor-pointer flex items-center justify-center"
      >
        <img
          src={thumbSrc}
          alt={media.display_name}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-7 h-7 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-modal">
              <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
            </div>
            {media.duration_seconds > 0 && (
              <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-mono px-1 py-0.2 rounded">
                {formatSeconds(media.duration_seconds)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle: Title, Meta Info, Format Badges */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        <h4 className="font-semibold text-[14px] text-[#1C1917] line-clamp-2 leading-snug">
          {media.display_name}
        </h4>

        <div className="flex items-center gap-2 text-[11px] text-[#57534E] mt-1">
          <span className="font-mono">{formatBytes(media.file_size)}</span>
          <span>•</span>
          <span>
            {new Date(media.captured_at || media.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#FFFBF5] text-[#57534E] border border-[#E7E5E4]">
            {isVideo ? 'Video' : 'Foto'}
          </span>

          {media.is_portrait === 1 && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#365314] text-white">
              Portrait 9:16
            </span>
          )}

          {media.category_names && (
            <span className="text-[10px] font-medium text-[#C2410C] bg-[#FDF6EC] px-1.5 py-0.2 rounded border border-[#D4A373] truncate max-w-[120px]">
              {media.category_names.split(',')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Favorite & 3-Dot Menu */}
      <div className="flex flex-col items-center justify-between gap-2 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(media.id, !media.is_favorite);
          }}
          className={`p-1.5 rounded-full ${
            media.is_favorite ? 'text-[#DC2626]' : 'text-[#A8A29E] hover:text-[#DC2626]'
          }`}
          title="Favorit"
        >
          <Heart className={`w-5 h-5 ${media.is_favorite ? 'fill-[#DC2626]' : ''}`} />
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 text-[#57534E] hover:text-[#1C1917] rounded-full hover:bg-[#FFFBF5]"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Action Popover Menu */}
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-1 w-48 bg-white border-2 border-[#D6D3D1] rounded-[8px] shadow-modal py-1.5 z-40 text-[13px] animate-in fade-in duration-100"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRename(media);
                }}
                className="w-full px-3.5 py-2 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2.5"
              >
                <Edit2 className="w-4 h-4 text-[#57534E]" />
                <span>Ubah Nama</span>
              </button>

              {!isVault && onOrganize && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOrganize(media);
                  }}
                  className="w-full px-3.5 py-2 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2.5"
                >
                  <Folder className="w-4 h-4 text-[#57534E]" />
                  <span>Atur ke Album</span>
                </button>
              )}

              {isVault ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onUnlock(media.id);
                  }}
                  className="w-full px-3.5 py-2 text-left text-[#365314] hover:bg-[#FFFBF5] flex items-center gap-2.5"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Keluarkan ke Galeri</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLock(media.id);
                  }}
                  className="w-full px-3.5 py-2 text-left text-[#C2410C] hover:bg-[#FFFBF5] flex items-center gap-2.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Kunci ke Brankas</span>
                </button>
              )}

              {!isVault && (
                <a
                  href={api.getDownloadUrl(media.id)}
                  download
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-3.5 py-2 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2.5"
                >
                  <Download className="w-4 h-4 text-[#57534E]" />
                  <span>Unduh File</span>
                </a>
              )}

              <div className="border-t border-[#E7E5E4] my-1" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(media.id);
                }}
                className="w-full px-3.5 py-2 text-left text-[#DC2626] hover:bg-[#FEE2E2] flex items-center gap-2.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

