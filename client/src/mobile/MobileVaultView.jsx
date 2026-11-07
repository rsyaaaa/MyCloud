import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert, ShieldCheck, Lock, KeyRound, Clock, LayoutGrid, List, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import SafePinModal from '../components/SafePinModal';
import { api } from '../api';

export default function MobileVaultView({
  onOpenViewer,
  onUnlockMedia,
  onDeleteMedia,
  onRenameMedia
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
      <div className="p-6 pb-24 max-w-sm mx-auto text-center py-16">
        <div className="w-16 h-16 bg-[#FFFBF5] border-2 border-[#D4A373] rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-8 h-8 text-[#C2410C]" />
        </div>

        <h2 className="font-serif font-bold text-xl text-[#1C1917] mb-1">
          Brankas Terkunci
        </h2>
        <p className="text-[13px] text-[#57534E] mb-6 leading-relaxed">
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
    <div className="p-4 pb-24 max-w-md mx-auto">
      {/* Status Bar */}
      <div className="mb-4 p-3 bg-[#F0FDF4] border-2 border-[#22C55E] rounded-[8px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
          <div className="truncate">
            <span className="font-semibold text-[13px] text-[#166534] block leading-tight">
              Brankas Terbuka
            </span>
            <span className="text-[11px] text-[#166534]/80 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" /> Auto-lock: {remainingSeconds}s
            </span>
          </div>
        </div>

        <button
          onClick={lockVault}
          className="btn-destructive text-[11px] py-1 px-2.5 h-7 shrink-0"
        >
          <Lock className="w-3 h-3" />
          <span>Kunci</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E7E5E4]">
        <span className="text-[12px] font-semibold text-[#57534E]">
          {vaultMedia.length} berkas rahasia
        </span>

        {/* View Switcher: Grid vs Page List */}
        <div className="flex items-center gap-1 bg-[#FFFBF5] p-0.5 rounded-[4px] border border-[#D6D3D1]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#57534E]'
            }`}
            title="Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#57534E]'
            }`}
            title="Page List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#A8A29E] font-serif text-[15px]">
          Memuat brankas...
        </div>
      ) : paginatedItems.length === 0 ? (
        <div className="text-center py-16 bg-white border-2 border-dashed border-[#D6D3D1] rounded-[8px] p-6">
          <Shield className="w-10 h-10 text-[#D4A373] mx-auto mb-2" />
          <h4 className="font-serif font-semibold text-base text-[#1C1917]">
            Brankas Kosong
          </h4>
          <p className="text-[12px] text-[#57534E] mt-1">
            Gunakan opsi "Kunci ke Brankas" pada media di Galeri Utama untuk menyimpannya di sini.
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
                    onUnlock={async (id) => {
                      await onUnlockMedia(id, vaultToken);
                      loadVaultMedia();
                    }}
                    onDelete={async (id) => {
                      await onDeleteMedia(id, vaultToken);
                      loadVaultMedia();
                    }}
                    onRename={onRenameMedia}
                  />
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2.5">
              {paginatedItems.map((media) => {
                const globalIdx = vaultMedia.findIndex((m) => m.id === media.id);
                return (
                  <MobileMediaListItem
                    key={media.id}
                    media={media}
                    isVault={true}
                    vaultToken={vaultToken}
                    onClick={() => onOpenViewer(vaultMedia, globalIdx, true, vaultToken)}
                    onUnlock={async (id) => {
                      await onUnlockMedia(id, vaultToken);
                      loadVaultMedia();
                    }}
                    onDelete={async (id) => {
                      await onDeleteMedia(id, vaultToken);
                      loadVaultMedia();
                    }}
                    onRename={onRenameMedia}
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
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}

