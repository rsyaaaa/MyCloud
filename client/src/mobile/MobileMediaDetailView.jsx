import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Heart, Lock, Unlock, Folder, Edit2, Download, Info, Trash2,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import MediaDetailModal from '../components/MediaDetailModal';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { recordRecentItem } from '../utils/recentHistory';
import { useTransfer } from '../context/TransferContext';

export default function MobileMediaDetailView({
  isOpen,
  mediaList = [],
  currentIndex = 0,
  onClose,
  onNavigate,
  onRename,
  onOrganize,
  onToggleFavorite,
  onLock,
  onUnlock,
  onDelete,
  isVault = false,
  vaultToken = null
}) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const { startDownload } = useTransfer();

  const currentMedia = mediaList[currentIndex];

  useEffect(() => {
    if (currentMedia) {
      setEditName(currentMedia.display_name || '');
      setIsEditingName(false);
      if (isOpen) {
        recordRecentItem(currentMedia);
      }
    }
  }, [currentMedia, isOpen]);

  if (!isOpen || !currentMedia) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < mediaList.length - 1;

  const mediaSrc = isVault
    ? api.getVaultStreamUrl(currentMedia.id, vaultToken)
    : api.getStreamUrl(currentMedia.id);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onRename(currentMedia.id, editName.trim());
    setIsEditingName(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-in fade-in duration-200 select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-3 flex items-center justify-between z-30 bg-gradient-to-b from-black/90 to-transparent text-white">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1 text-white hover:text-[#C2410C] flex items-center gap-1 text-[13px] font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali</span>
          </button>

          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5 flex-1 max-w-[200px]">
              <input
                type="text"
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white/20 border border-[#C2410C] text-white px-2 py-0.5 rounded text-[12px] outline-none w-full"
              />
              <button type="submit" className="text-[11px] bg-[#C2410C] px-2 py-0.5 rounded font-semibold">
                OK
              </button>
            </form>
          ) : (
            <div className="truncate flex items-center gap-1">
              <span className="font-serif text-[14px] truncate font-medium">
                {currentMedia.display_name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1 text-white/70 hover:text-white"
                title="Ubah Nama"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Counter and Detail Modal Button */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono opacity-70">
            {currentIndex + 1} / {mediaList.length}
          </span>
          <button
            onClick={() => setShowDetailModal(true)}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
            title="Info Berkas"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area (Full display with letterbox/pillarbox black bars) */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden w-full h-full">
        {currentMedia.media_type === 'video' ? (
          <div className="w-full h-full flex items-center justify-center p-2">
            <VideoPlayer
              key={currentMedia.id}
              media={currentMedia}
              src={mediaSrc}
              isVault={isVault}
              vaultToken={vaultToken}
              onToggleFavorite={onToggleFavorite}
              autoPlay={true}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-1">
            <img
              key={currentMedia.id}
              src={mediaSrc}
              alt={currentMedia.display_name}
              className="max-w-full max-h-full object-contain animate-enter"
            />
          </div>
        )}

        {/* Prev / Next Tap Buttons */}
        {hasPrev && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {hasNext && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Sticky Toolbar */}
      <footer className="h-16 px-4 bg-black/85 backdrop-blur-md border-t border-white/15 z-30 flex items-center justify-around text-white">
        {/* Favorite */}
        <button
          onClick={() => onToggleFavorite(currentMedia.id, !currentMedia.is_favorite)}
          className={`flex flex-col items-center justify-center gap-1 ${
            currentMedia.is_favorite ? 'text-[#EF4444]' : 'text-white/80 active:text-white'
          }`}
        >
          <Heart className={`w-5 h-5 ${currentMedia.is_favorite ? 'fill-[#EF4444]' : ''}`} />
          <span className="text-[10px]">Favorit</span>
        </button>

        {/* Vault Lock / Unlock */}
        {isVault ? (
          <button
            onClick={() => onUnlock(currentMedia.id)}
            className="flex flex-col items-center justify-center gap-1 text-[#10B981] active:text-white"
          >
            <Unlock className="w-5 h-5" />
            <span className="text-[10px]">Keluarkan</span>
          </button>
        ) : (
          <button
            onClick={() => onLock(currentMedia.id)}
            className="flex flex-col items-center justify-center gap-1 text-white/80 active:text-[#C2410C]"
          >
            <Lock className="w-5 h-5 text-[#C2410C]" />
            <span className="text-[10px]">Brankas</span>
          </button>
        )}

        {/* Organize to Album */}
        {!isVault && onOrganize && (
          <button
            onClick={() => onOrganize(currentMedia)}
            className="flex flex-col items-center justify-center gap-1 text-white/80 active:text-white"
          >
            <Folder className="w-5 h-5" />
            <span className="text-[10px]">Album</span>
          </button>
        )}

        {/* Download */}
        {!isVault && (
          <button
            onClick={() => startDownload(currentMedia)}
            className="flex flex-col items-center justify-center gap-1 text-white/80 active:text-white"
          >
            <Download className="w-5 h-5" />
            <span className="text-[10px]">Unduh</span>
          </button>
        )}

        {/* Delete (Move to Trash) */}
        <button
          onClick={() => onDelete(currentMedia.id)}
          className="flex flex-col items-center justify-center gap-1 text-[#EF4444] active:opacity-70"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-[10px]">Sampah</span>
        </button>
      </footer>

      {/* Info Metadata Modal */}
      <MediaDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        media={currentMedia}
      />
    </div>
  );
}

