import React, { useState, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, Download, Heart, Lock, Unlock,
  Trash2, Folder, Edit2, Calendar, FileText, Info
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { api } from '../api';
import { formatBytes } from './QuotaBar';
import { recordRecentItem } from '../utils/recentHistory';
import { useLanguage, localeFor } from '../context/LanguageContext';
import { useTransfer } from '../context/TransferContext';

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
  const { t, lang } = useLanguage();
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

  // Keyboard navigation (Arrow keys, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();

      // In the video player, ArrowLeft/ArrowRight are reserved for -10s / +10s seeking.
      if (currentMedia && currentMedia.media_type === 'video') return;

      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < mediaList.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, mediaList.length, currentMedia]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent text-white">
        <div className="flex items-center gap-2 max-w-[150px] sm:max-w-md truncate">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white/10 border border-[#C2410C] text-white px-2 py-0.5 rounded text-[13px] outline-none w-28 sm:w-auto"
              />
              <button type="submit" className="text-[11px] bg-[#C2410C] px-2 py-0.5 rounded">
                {t('save', 'Simpan')}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="text-[11px] text-white/70 hover:text-white"
              >
                {t('cancel', 'Batal')}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-serif font-medium text-sm sm:text-lg truncate">
                {currentMedia.display_name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-white/60 hover:text-white p-1 rounded transition-colors shrink-0"
                title={t('renameDisplay', 'Ubah Nama Tampilan')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => onToggleFavorite(currentMedia.id, !currentMedia.is_favorite)}
            className={`p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors ${
              currentMedia.is_favorite ? 'text-[#EF4444]' : 'text-white/80 hover:text-white'
            }`}
            title={t('favorite', 'Favorit')}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${currentMedia.is_favorite ? 'fill-[#EF4444]' : ''}`} />
          </button>

          {!isVault && onOrganize && (
            <button
              onClick={() => onOrganize(currentMedia)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title={t('organizeToAlbum', 'Atur ke Album')}
            >
              <Folder className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {isVault ? (
            <button
              onClick={() => onUnlock(currentMedia.id)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title={t('unlockFromVault', 'Keluarkan dari Brankas')}
            >
              <Unlock className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          ) : (
            <button
              onClick={() => onLock(currentMedia.id)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title={t('lockToVaultSecret', 'Kunci ke Brankas Rahasia')}
            >
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {!isVault && (
            <button
              onClick={() => startDownload(currentMedia)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title={t('downloadOriginal', 'Unduh Asli')}
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors ${
              showInfo ? 'text-[#C2410C] bg-white/20' : 'text-white/80 hover:text-white'
            }`}
            title={t('metadataDetail', 'Info Metadata')}
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={() => onDelete(currentMedia.id)}
            className="p-1.5 sm:p-2 rounded-full hover:bg-[#EF4444]/20 text-white/80 hover:text-[#EF4444] transition-colors"
            title={t('deleteMedia', 'Hapus Media')}
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="w-[1px] h-5 bg-white/20 mx-0.5 sm:mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            title={t('close', 'Tutup')}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Prev / Next Arrows */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-2 sm:left-4 z-20 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-transform hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5 sm:w-8 sm:h-8" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-2 sm:right-4 z-20 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-transform hover:scale-110"
        >
          <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8" />
        </button>
      )}

      {/* Main Content Area */}
      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-8 pt-16">
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
        <div className="absolute right-0 top-16 bottom-0 w-80 bg-white dark:bg-[#0A0A0E] border-l border-[#E8E8EC] dark:border-[#1F1F27] p-6 overflow-y-auto text-[#0A0A0A] dark:text-[#FAFAFA] z-30 shadow-modal animate-in slide-in-from-right duration-200">
          <h4 className="font-serif font-semibold text-lg mb-4 text-[#0A0A0A] dark:text-[#FAFAFA] pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
            {t('fileMediaDetail', 'Detail File Media')}
          </h4>

          <div className="space-y-4 text-[13px]">
            <div>
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-0.5">{t('displayName', 'Nama Tampilan')}</span>
              <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">{currentMedia.display_name}</span>
            </div>

            <div>
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-0.5">{t('originalFileName', 'Nama File Asli')}</span>
              <span className="font-mono text-[12px] break-all text-[#0A0A0A] dark:text-[#FAFAFA]">{currentMedia.original_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-0.5">{t('sizeFileLabel', 'Ukuran File')}</span>
                <span className="font-mono font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">{formatBytes(currentMedia.file_size)}</span>
              </div>
              <div>
                <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-0.5">{t('mediaType', 'Tipe Media')}</span>
                <span className="uppercase font-semibold text-[#C2410C] dark:text-[#FB923C]">{currentMedia.media_type}</span>
              </div>
            </div>

            {currentMedia.width && currentMedia.height && (
              <div>
                <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-0.5">{t('resolutionRatio', 'Resolusi & Rasio')}</span>
                <span className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">{currentMedia.width} × {currentMedia.height}</span>
                {currentMedia.is_portrait ? (
                  <span className="ml-2 text-[11px] bg-[#FFF7ED] text-[#C2410C] dark:bg-[#2A1208] dark:text-[#FB923C] px-1.5 py-0.5 rounded border border-[#C2410C]/20">
                    Portrait 9:16
                  </span>
                ) : (
                  <span className="ml-2 text-[11px] bg-[#F4F4F5] text-[#0A0A0A] dark:bg-[#1F1F27] dark:text-[#FAFAFA] px-1.5 py-0.5 rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
                    Landscape
                  </span>
                )}
              </div>
            )}

            {currentMedia.duration_seconds > 0 && (
              <div>
                <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-0.5">{t('videoDuration', 'Durasi Video')}</span>
                <span className="font-mono font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">{currentMedia.duration_seconds} {t('seconds', 'Detik')}</span>
              </div>
            )}

            <div>
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-0.5">{t('momentTime', 'Waktu Momen')}</span>
              <span className="text-[12px] text-[#0A0A0A] dark:text-[#FAFAFA]">
                {new Date(currentMedia.captured_at || currentMedia.created_at).toLocaleString(localeFor(lang), {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </span>
            </div>

            {currentMedia.category_names && (
              <div>
                <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block mb-1">{t('albumTag', 'Album / Tag')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentMedia.category_names.split(',').map((cat, i) => (
                    <span
                      key={i}
                      className="bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/20 text-[#C2410C] dark:text-[#FB923C] px-2 py-0.5 rounded-[4px] text-[12px] font-medium"
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

