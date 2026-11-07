import React, { useState, useEffect } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Lock, Unlock, KeyRound,
  Trash2, Eye, EyeOff, AlertTriangle, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import MediaCard from '../components/MediaCard';
import SafePinModal from '../components/SafePinModal';
import { api } from '../api';

export default function VaultPage({ onOpenViewer, onUnlockMedia, onDeleteMedia, onRenameMedia }) {
  const { user } = useAuth();
  const { vaultToken, isUnlocked, remainingSeconds, lockVault } = useVault();
  const [vaultMedia, setVaultMedia] = useState([]);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadVaultMedia = async () => {
    if (!vaultToken) return;
    setLoading(true);
    try {
      const data = await api.listVaultMedia(vaultToken);
      setVaultMedia(data.media || []);
    } catch (e) {
      console.error('Failed to load vault media:', e);
      // If token expired
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

  // If vault is locked, show lock screen
  if (!isUnlocked) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center py-24">
        <div className="w-20 h-20 bg-[#FFFBF5] border-2 border-[#D4A373] rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-10 h-10 text-[#C2410C]" />
        </div>

        <h2 className="font-serif font-bold text-2xl text-[#1C1917] mb-2">
          Brankas Terkunci (Safe Vault)
        </h2>
        <p className="text-[14px] text-[#57534E] mb-6 leading-relaxed">
          Semua file foto & video di dalam brankas ini terisolasi sepenuhnya dan tidak akan muncul di Galeri Utama, Carousel Memori, maupun Video Hub.
        </p>

        <button
          onClick={() => setPinModalOpen(true)}
          className="btn-primary text-[15px] px-6 py-3 shadow-modal mx-auto"
        >
          <KeyRound className="w-5 h-5" />
          <span>{user?.has_pin ? 'Buka dengan PIN Brankas' : 'Atur PIN Brankas Sekarang'}</span>
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Vault Unlocked Header */}
      <div className="mb-6 p-4 bg-[#F0FDF4] border-2 border-[#22C55E] rounded-[8px] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#22C55E] text-white flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-lg text-[#166534]">
              Brankas Aktif (Terbuka)
            </h3>
            <p className="text-[12px] text-[#166534]/80 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              Auto-lock dalam <strong className="font-mono">{remainingSeconds} detik</strong> (atau saat berpindah jendela).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={lockVault}
            className="btn-destructive text-[13px] py-1.5 px-3.5 h-[36px]"
          >
            <Lock className="w-4 h-4" />
            <span>Kunci Brankas Sekarang</span>
          </button>
        </div>
      </div>

      {/* Vault Media List */}
      {loading ? (
        <div className="text-center py-20 text-[#A8A29E] font-serif text-lg">
          Memuat berkas brankas rahasia...
        </div>
      ) : vaultMedia.length === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-dashed border-[#D6D3D1] rounded-[8px] p-8">
          <Shield className="w-12 h-12 text-[#D4A373] mx-auto mb-3" />
          <h4 className="font-serif font-semibold text-lg text-[#1C1917]">
            Brankas Kosong
          </h4>
          <p className="text-[13px] text-[#57534E] mt-1 max-w-sm mx-auto">
            Untuk memasukkan media ke brankas rahasia, pilih menu titik tiga pada file di Galeri Utama dan klik <strong>Kunci ke Brankas</strong>.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-semibold text-[#57534E]">
              {vaultMedia.length} berkas terlindungi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {vaultMedia.map((media, idx) => (
              <MediaCard
                key={media.id}
                media={media}
                isVault={true}
                vaultToken={vaultToken}
                onClick={() => onOpenViewer(vaultMedia, idx, true, vaultToken)}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

