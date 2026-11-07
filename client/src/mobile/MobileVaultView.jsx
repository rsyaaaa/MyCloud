import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert, ShieldCheck, Lock, KeyRound, Clock, LayoutGrid, List, FolderLock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import SafePinModal from '../components/SafePinModal';
import { api } from '../api';
import { MediaGridSkeleton, MediaListSkeleton } from '../components/SkeletonLoader';

export default function MobileVaultView({
  onOpenViewer,
  onUnlockMedia,
  onDeleteMedia,
  onRenameMedia,
  onLongPress
}) {
  const { user } = useAuth();
  const { vaultToken, isUnlocked, remainingSeconds, lockVault } = useVault();
  const [vaultMedia, setVaultMedia] = useState([]);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 12;

  const loadVaultMedia = async () => {
    if (!vaultToken) return;
    setLoading(true);
    try {
      const data = await api.listVaultMedia(vaultToken);
      setVaultMedia(data.media || []);
      setCurrentPage(1);
    } catch (e) {
      lockVault();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked && vaultToken) {
      loadVaultMedia();
    } else {
      setVaultMedia([]);
    }
  }, [isUnlocked, vaultToken]);

  const totalItems = vaultMedia.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return vaultMedia.slice(startIndex, startIndex + pageSize);
  }, [vaultMedia, currentPage, pageSize]);

  // Locked Screen
  if (!isUnlocked) {
    return (
      <div className="p-6 pb-24 max-w-sm mx-auto text-center py-16 animate-enter">
        <div className="w-16 h-16 bg-[#FFFBF5] dark:bg-[#2E2A26] border-2 border-[#D4A373] dark:border-[#3E3834] rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-8 h-8 text-[#C2410C]" />
        </div>

        <h2 className="font-serif font-bold text-xl text-[#1C1917] dark:text-[#F5F2EB] mb-1">
          Brankas Terkunci
        </h2>
        <p className="text-[13px] text-[#57534E] dark:text-[#A8A29E] mb-6 leading-relaxed">
          File di brankas ini terisolasi sepenuhnya dan memerlukan PIN master sekunder untuk membukanya.
        </p>

        <button
          onClick={() => setPinModalOpen(true)}
          className="btn-primary text-[14px] w-full py-2.5 shadow-modal justify-center"
        >
          <KeyRound className="w-4 h-4" />
          <span>{user?.has_pin ? 'Buka dengan PIN' : 'Atur PIN Brankas'}</span>
        </button>

        <SafePinModal
          isOpen={pinModalOpen}
          onClose={() => setPinModalOpen(false)}
          onSuccess={loadVaultMedia}
        />
      </div>
    );
  }

  // Unlocked Vault View
  return (
    <div className="p-4 pb-24 max-w-md mx-auto animate-enter">
      {/* Status Bar */}
      <div className="mb-4 p-3 bg-[#F0FDF4] dark:bg-[#143D14] border-2 border-[#22C55E] rounded-[8px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
          <div className="truncate">
            <span className="font-semibold text-[13px] text-[#166534] dark:text-[#86EFAC] block leading-tight">
              Brankas Terbuka
            </span>
            <span className="text-[11px] text-[#166534]/90 dark:text-[#86EFAC]/90 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              Sesi aktif tanpa batas selama di menu
            </span>
          </div>
        </div>

        <button
          onClick={lockVault}
          className="btn-destructive text-[11px] h-7 px-2.5 shrink-0"
        >
          <Lock className="w-3 h-3" />
          <span>Kunci</span>
        </button>
      </div>

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between mb-4 p-2 bg-white dark:bg-[#23201D] rounded-[6px] border border-[#E7E5E4] dark:border-[#3E3834]">
        <span className="text-[12px] font-semibold text-[#57534E] dark:text-[#A8A29E]">
          {vaultMedia.length} Media Rahasia
        </span>

        <div className="flex items-center gap-1 bg-[#FFFBF5] dark:bg-[#2E2A26] p-0.5 rounded-[4px] border border-[#D6D3D1] dark:border-[#3E3834]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#57534E] dark:text-[#A8A29E]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#57534E] dark:text-[#A8A29E]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        viewMode === 'grid' ? <MediaGridSkeleton count={4} /> : <MediaListSkeleton count={4} />
      ) : paginatedItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#23201D] border-2 border-dashed border-[#D6D3D1] dark:border-[#3E3834] rounded-[8px] p-6">
          <FolderLock className="w-10 h-10 text-[#D4A373] mx-auto mb-2" />
          <h4 className="font-serif font-semibold text-base text-[#1C1917] dark:text-[#F5F2EB]">
            Brankas Kosong
          </h4>
          <p className="text-[12px] text-[#57534E] dark:text-[#A8A29E] mt-1">
            Belum ada foto atau video yang dikunci ke brankas rahasia.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 gap-3">
              {paginatedItems.map((media) => {
                const globalIdx = vaultMedia.findIndex((m) => m.id === media.id);
                return (
                  <MobileMediaCard
                    key={media.id}
                    media={media}
                    isVault={true}
                    vaultToken={vaultToken}
                    onClick={() => onOpenViewer(vaultMedia, globalIdx, true, vaultToken)}
                    onToggleFavorite={() => {}}
                    onUnlock={onUnlockMedia}
                    onDelete={onDeleteMedia}
                    onRename={onRenameMedia}
                    onLongPress={onLongPress}
                  />
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2">
              {paginatedItems.map((media) => {
                const globalIdx = vaultMedia.findIndex((m) => m.id === media.id);
                return (
                  <MobileMediaListItem
                    key={media.id}
                    media={media}
                    isVault={true}
                    vaultToken={vaultToken}
                    onClick={() => onOpenViewer(vaultMedia, globalIdx, true, vaultToken)}
                    onToggleFavorite={() => {}}
                    onUnlock={onUnlockMedia}
                    onDelete={onDeleteMedia}
                    onRename={onRenameMedia}
                    onLongPress={onLongPress}
                  />
                );
              })}
            </div>
          )}

          <MobilePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}
