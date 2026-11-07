import React, { useState } from 'react';
import { Play, Heart, MoreVertical, Edit2, Folder, Lock, Unlock, Download, Trash2 } from 'lucide-react';
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
  isVault = false,
  vaultToken = null
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isVideo = media.media_type === 'video';

  const thumbSrc = isVault
    ? api.getVaultThumbnailUrl(media.id, vaultToken)
    : api.getThumbnailUrl(media.id);

  return (
    <div className="card-artisan overflow-hidden flex flex-col bg-white relative">
      {/* Thumbnail Area */}
      <div
        onClick={onClick}
        className={`relative overflow-hidden bg-[#FAF1E6] flex items-center justify-center cursor-pointer ${
          media.is_portrait ? 'aspect-[3/4]' : 'aspect-[4/3]'
        }`}
      >
        <img
          src={thumbSrc}
          alt={media.display_name}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="w-9 h-9 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-modal">
              <Play className="w-4 h-4 ml-0.5 fill-white" />
            </div>

            {media.duration_seconds > 0 && (
              <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.2 rounded">
                {formatSeconds(media.duration_seconds)}
              </span>
            )}
          </div>
        )}

        {media.is_portrait === 1 && (
          <span className="absolute top-1.5 left-1.5 bg-[#365314] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded">
            9:16
          </span>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(media.id, !media.is_favorite);
          }}
          className={`absolute top-1.5 right-1.5 p-1.5 rounded-full ${
            media.is_favorite ? 'bg-white text-[#DC2626]' : 'bg-black/40 text-white'
          }`}
          title="Favorit"
        >
          <Heart className={`w-3.5 h-3.5 ${media.is_favorite ? 'fill-[#DC2626]' : ''}`} />
        </button>
      </div>

      {/* Card Info & Menu */}
      <div className="p-2 flex items-center justify-between gap-1 border-t border-[#E7E5E4] bg-white">
        <div className="truncate flex-1 min-w-0" onClick={onClick}>
          <h4 className="text-[13px] font-semibold text-[#1C1917] truncate leading-tight">
            {media.display_name}
          </h4>
          <span className="text-[11px] font-mono text-[#57534E]">
            {formatBytes(media.file_size)}
          </span>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 text-[#57534E] hover:text-[#1C1917]"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 bottom-full mb-1 w-44 bg-white border-2 border-[#D6D3D1] rounded-[6px] shadow-modal py-1 z-30 text-[12px] animate-in fade-in duration-100"
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
                  <span>Atur Album</span>
                </button>
              )}

              {isVault ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onUnlock(media.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#365314] hover:bg-[#FFFBF5] flex items-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Keluarkan</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLock(media.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#C2410C] hover:bg-[#FFFBF5] flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kunci Brankas</span>
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
                  <span>Unduh</span>
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
                <span>Hapus</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

