import React, { useState } from 'react';
import { Play, Heart, Lock, Unlock, MoreVertical, Folder, Trash2, Edit2, Download } from 'lucide-react';
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
  isVault = false,
  vaultToken = null
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isVideo = media.media_type === 'video';

  const thumbSrc = isVault
    ? api.getVaultThumbnailUrl(media.id, vaultToken)
    : api.getThumbnailUrl(media.id);

  return (
    <div className="group relative card-artisan overflow-hidden flex flex-col cursor-pointer bg-white">
      {/* Thumbnail Container */}
      <div
        onClick={onClick}
        className={`relative overflow-hidden bg-[#FAF1E6] flex items-center justify-center ${
          media.is_portrait ? 'aspect-[3/4]' : 'aspect-[4/3]'
        }`}
      >
        <img
          src={thumbSrc}
          alt={media.display_name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Video Overlay Badge */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#C2410C]/90 text-white flex items-center justify-center shadow-modal group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 ml-0.5 fill-white" />
            </div>

            {media.duration_seconds > 0 && (
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-mono px-1.5 py-0.5 rounded-[3px]">
                {formatSeconds(media.duration_seconds)}
              </span>
            )}
          </div>
        )}

        {/* Portrait indicator */}
        {media.is_portrait && (
          <span className="absolute top-2 left-2 bg-[#365314]/90 text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] border border-[#365314]">
            9:16
          </span>
        )}

        {/* Quick Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(media.id, !media.is_favorite);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
            media.is_favorite
              ? 'bg-white text-[#DC2626] opacity-100'
              : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:scale-110'
          }`}
          title="Favorit"
        >
          <Heart className={`w-4 h-4 ${media.is_favorite ? 'fill-[#DC2626]' : ''}`} />
        </button>
      </div>

      {/* Media Details Footer */}
      <div className="p-3 flex items-start justify-between gap-2 border-t border-[#E7E5E4] bg-white">
        <div className="truncate flex-1" onClick={onClick}>
          <h4 className="text-[14px] font-semibold text-[#1C1917] truncate hover:text-[#C2410C] transition-colors">
            {media.display_name}
          </h4>
          <div className="flex items-center gap-2 text-[11px] text-[#57534E] mt-0.5">
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
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 text-[#57534E] hover:text-[#1C1917] rounded hover:bg-[#FFFBF5] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-1 w-48 bg-white border-2 border-[#D6D3D1] rounded-[6px] shadow-modal py-1 z-30 text-[13px] animate-in fade-in duration-100"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onRename(media);
                }}
                className="w-full px-3 py-1.5 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#57534E]" />
                <span>Ubah Nama</span>
              </button>

              {!isVault && onOrganize && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOrganize(media);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2"
                >
                  <Folder className="w-3.5 h-3.5 text-[#57534E]" />
                  <span>Atur ke Album</span>
                </button>
              )}

              {isVault ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onUnlock(media.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5 text-[#365314]" />
                  <span>Keluarkan ke Galeri</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLock(media.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Kunci ke Brankas</span>
                </button>
              )}

              {!isVault && (
                <a
                  href={api.getDownloadUrl(media.id)}
                  download
                  onClick={() => setMenuOpen(false)}
                  className="w-full px-3 py-1.5 text-left text-[#1C1917] hover:bg-[#FFFBF5] flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-[#57534E]" />
                  <span>Unduh File</span>
                </a>
              )}

              <div className="border-t border-[#E7E5E4] my-1" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(media.id);
                }}
                className="w-full px-3 py-1.5 text-left text-[#DC2626] hover:bg-[#FEE2E2] flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

