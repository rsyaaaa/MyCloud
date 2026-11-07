import React, { useState, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, Download, Heart, Lock, Unlock,
  Trash2, Folder, Edit2, Calendar, FileText, Info
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { api } from '../api';
import { formatBytes } from './QuotaBar';

export default function MediaViewerModal({
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
  const [showInfo, setShowInfo] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const currentMedia = mediaList[currentIndex];

  useEffect(() => {
    if (currentMedia) {
      setEditName(currentMedia.display_name || '');
      setIsEditingName(false);
    }
  }, [currentMedia]);

  // Keyboard navigation (Arrow keys, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < mediaList.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, mediaList.length]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/90 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 h-16 px-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent text-white">
        <div className="flex items-center gap-3 max-w-md truncate">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white/10 border border-[#D4A373] text-white px-2 py-1 rounded text-[14px] outline-none"
              />
              <button type="submit" className="text-[12px] bg-[#C2410C] px-2.5 py-1 rounded">
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="text-[12px] text-white/70 hover:text-white"
              >
                Batal
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 truncate">
              <span className="font-serif font-medium text-lg truncate">
                {currentMedia.display_name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-white/60 hover:text-white p-1 rounded transition-colors"
                title="Ubah Nama Tampilan"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(currentMedia.id, !currentMedia.is_favorite)}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
              currentMedia.is_favorite ? 'text-[#DC2626]' : 'text-white/80 hover:text-white'
            }`}
            title="Favorit"
          >
            <Heart className={`w-5 h-5 ${currentMedia.is_favorite ? 'fill-[#DC2626]' : ''}`} />
          </button>

          {!isVault && onOrganize && (
            <button
              onClick={() => onOrganize(currentMedia)}
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Atur ke Album"
            >
              <Folder className="w-5 h-5" />
            </button>
          )}

          {isVault ? (
            <button
              onClick={() => onUnlock(currentMedia.id)}
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Keluarkan dari Brankas"
            >
              <Unlock className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => onLock(currentMedia.id)}
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Kunci ke Brankas Rahasia"
            >
              <Lock className="w-5 h-5" />
            </button>
          )}

          {!isVault && (
            <a
              href={api.getDownloadUrl(currentMedia.id)}
              download
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Unduh Asli"
            >
              <Download className="w-5 h-5" />
            </a>
          )}

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
              showInfo ? 'text-[#C2410C] bg-white/20' : 'text-white/80 hover:text-white'
            }`}
            title="Info Metadata"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            onClick={() => onDelete(currentMedia.id)}
            className="p-2 rounded-full hover:bg-[#DC2626]/20 text-white/80 hover:text-[#DC2626] transition-colors"
            title="Hapus Media"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-6 bg-white/20 mx-1" />

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            title="Tutup"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Prev / Next Arrows */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-transform hover:scale-110"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-transform hover:scale-110"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Main Content Area */}
      <div className="relative w-full h-full flex items-center justify-center p-8 pt-16">
        {currentMedia.media_type === 'video' ? (
          <VideoPlayer
            media={currentMedia}
            src={mediaSrc}
            isVault={isVault}
            vaultToken={vaultToken}
            onToggleFavorite={onToggleFavorite}
          />
        ) : (
          <img
            src={mediaSrc}
            alt={currentMedia.display_name}
            className="max-w-full max-h-[85vh] object-contain rounded-[4px] border border-white/10 shadow-modal select-none"
          />
        )}
      </div>

      {/* Sidebar Info Drawer */}
      {showInfo && (
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-[#FFFBF5] border-l-2 border-[#D6D3D1] p-6 overflow-y-auto text-[#1C1917] z-30 shadow-modal animate-in slide-in-from-right duration-200">
          <h4 className="font-serif font-semibold text-lg mb-4 text-[#1C1917] pb-2 border-b border-[#E7E5E4]">
            Detail File Media
          </h4>

          <div className="space-y-4 text-[13px]">
            <div>
              <span className="text-[#57534E] block mb-0.5">Nama Tampilan</span>
              <span className="font-medium">{currentMedia.display_name}</span>
            </div>

            <div>
              <span className="text-[#57534E] block mb-0.5">Nama File Asli</span>
              <span className="font-mono text-[12px] break-all">{currentMedia.original_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[#57534E] block mb-0.5">Ukuran File</span>
                <span className="font-mono font-medium">{formatBytes(currentMedia.file_size)}</span>
              </div>
              <div>
                <span className="text-[#57534E] block mb-0.5">Tipe Media</span>
                <span className="uppercase font-semibold text-[#365314]">{currentMedia.media_type}</span>
              </div>
            </div>

            {currentMedia.width && currentMedia.height && (
              <div>
                <span className="text-[#57534E] block mb-0.5">Resolusi & Rasio</span>
                <span className="font-mono">{currentMedia.width} × {currentMedia.height}</span>
                {currentMedia.is_portrait ? (
                  <span className="ml-2 text-[11px] bg-[#365314] text-white px-1.5 py-0.5 rounded">
                    Portrait 9:16
                  </span>
                ) : (
                  <span className="ml-2 text-[11px] bg-[#D4A373] text-[#1C1917] px-1.5 py-0.5 rounded">
                    Landscape
                  </span>
                )}
              </div>
            )}

            {currentMedia.duration_seconds > 0 && (
              <div>
                <span className="text-[#57534E] block mb-0.5">Durasi Video</span>
                <span className="font-mono font-medium">{currentMedia.duration_seconds} Detik</span>
              </div>
            )}

            <div>
              <span className="text-[#57534E] block mb-0.5">Waktu Momen</span>
              <span className="text-[12px]">
                {new Date(currentMedia.captured_at || currentMedia.created_at).toLocaleString('id-ID', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </span>
            </div>

            {currentMedia.category_names && (
              <div>
                <span className="text-[#57534E] block mb-1">Album / Tag</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentMedia.category_names.split(',').map((cat, i) => (
                    <span
                      key={i}
                      className="bg-[#FFFBF5] border border-[#D6D3D1] text-[#365314] px-2 py-0.5 rounded-[3px] text-[12px] font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

