import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Lock, KeyRound, Clock, FolderLock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import MediaCard from '../components/MediaCard';
import SafePinModal from '../components/SafePinModal';
import { api } from '../api';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { subscribeMediaEvent } from '../utils/mediaEvents';
import { useLanguage } from '../context/LanguageContext';

export default function VaultPage({
  onOpenViewer,
  onUnlockMedia,
  onDeleteMedia,
  onRenameMedia,
  onContextMenu,
  onShowDetail
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { vaultToken, isUnlocked, remainingSeconds, lockVault } = useVault();
  const [vaultMedia, setVaultMedia] = useState([]);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadVaultMedia = async (silent = false) => {
    if (!vaultToken) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.listVaultMedia(vaultToken);
      setVaultMedia(data.media || []);
    } catch (e) {
      console.error('Failed to load vault media:', e);
      lockVault();
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked && vaultToken) {
      loadVaultMedia();
    } else {
      setVaultMedia([]);
    }
  }, [isUnlocked, vaultToken]);

  useEffect(() => {
    if (!isUnlocked || !vaultToken) return;
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'lock') {
        loadVaultMedia(true);
      } else if (event.type === 'unlock' || event.type === 'delete') {
        setVaultMedia((prev) => prev.filter((m) => m.id !== event.id));
      } else if (event.type === 'rename') {
        setVaultMedia((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, display_name: event.name } : m))
        );
      }
    });
    return unsub;
  }, [isUnlocked, vaultToken]);

  // If vault is locked, show lock screen
  if (!isUnlocked) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center py-24 animate-enter">
        <div className="w-20 h-20 bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-10 h-10 text-[#C2410C]" />
        </div>

        <h2 className="font-serif font-bold text-2xl text-[#0A0A0A] dark:text-[#FAFAFA] mb-2">
          {t('vault', 'Brankas Terkunci')}
        </h2>
        <p className="text-[14px] text-[#6B6B6B] dark:text-[#9C9C9C] mb-6 leading-relaxed">
          {t('vaultLockedDesc', 'Semua file foto & video di dalam brankas ini terisolasi sepenuhnya dan tidak akan muncul di Galeri Utama, Carousel Memori, maupun Video Hub.')}
        </p>

        <button
          onClick={() => setPinModalOpen(true)}
          className="btn-primary text-[15px] px-6 py-3 shadow-modal mx-auto"
        >
          <KeyRound className="w-5 h-5" />
          <span>{user?.has_pin ? t('openWithPin', 'Buka dengan PIN Brankas') : t('setupPinNow', 'Atur PIN Brankas Sekarang')}</span>
        </button>

        <SafePinModal
          isOpen={pinModalOpen}
          onClose={() => setPinModalOpen(false)}
          onSuccess={loadVaultMedia}
        />
      </div>
    );
  }

  // Vault is UNLOCKED
  return (
    <div className="p-6 max-w-7xl mx-auto animate-enter">
      {/* Vault Unlocked Header */}
      <div className="mb-6 p-4 bg-[#ECFDF5] dark:bg-[#062817] border border-[#10B981]/40 rounded-[12px] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-lg text-[#065F46] dark:text-[#34D399]">
              {t('vaultActive', 'Brankas Aktif (Terbuka)')}
            </h3>
            <p className="text-[12px] text-[#065F46]/90 dark:text-[#34D399]/90 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              {t('vaultSessionNote', 'Sesi aktif tanpa batas selama di menu ini. Timer 180s otomatis berjalan jika keluar dari menu.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={lockVault}
            className="btn-destructive text-[13px] py-1.5 px-3.5 h-[36px]"
          >
            <Lock className="w-4 h-4" />
            <span>{t('lockVaultNow', 'Kunci Brankas Sekarang')}</span>
          </button>
        </div>
      </div>

      {/* Vault Content Feed */}
      {loading ? (
        <MediaGridSkeleton count={4} />
      ) : vaultMedia.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
          <FolderLock className="w-12 h-12 text-[#C2410C] mx-auto mb-3" />
          <h4 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            {t('vaultEmptyTitle', 'Belum ada media di brankas')}
          </h4>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1 max-w-sm mx-auto">
            {t('vaultHowTo', 'Klik menu 3-titik atau klik kanan pada foto/video mana saja di Galeri Utama, lalu pilih')} <strong>{t('lockToVaultShort', 'Kunci ke Brankas')}</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {vaultMedia.map((media, idx) => (
            <MediaCard
              key={media.id}
              media={media}
              isVault={true}
              vaultToken={vaultToken}
              onClick={() => onOpenViewer(vaultMedia, idx, true, vaultToken)}
              onToggleFavorite={() => {}}
              onUnlock={onUnlockMedia}
              onDelete={onDeleteMedia}
              onRename={onRenameMedia}
              onContextMenu={onContextMenu}
              onShowDetail={onShowDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
