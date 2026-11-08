import React, { useState } from 'react';
import { X, ShieldCheck, Lock, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function SafePinModal({ isOpen, onClose, onSuccess }) {
  const { user, refreshUser } = useAuth();
  const { unlockVault } = useVault();
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isSettingUp = !user?.has_pin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4) {
      setError(t('pinMin', 'PIN minimal 4 digit.'));
      return;
    }

    setLoading(true);
    try {
      if (isSettingUp) {
        if (pin !== confirmPin) {
          setError(t('pinMismatch', 'Konfirmasi PIN tidak cocok.'));
          setLoading(false);
          return;
        }
        await api.setupPin(pin);
        await refreshUser();
      }

      await unlockVault(pin);
      setPin('');
      setConfirmPin('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || t('pinWrong', 'PIN salah atau gagal memverifikasi.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] max-w-sm w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150 text-center text-[#0A0A0A] dark:text-[#FAFAFA]">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-14 h-14 bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-7 h-7 text-[#C2410C]" />
        </div>

        <h3 className="text-xl font-serif font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1">
          {isSettingUp ? t('setupVaultPin', 'Atur PIN Brankas') : t('unlockVaultTitle', 'Buka Kunci Brankas')}
        </h3>
        <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mb-5">
          {isSettingUp
            ? t('setupPinDesc', 'Buat PIN sekunder untuk mengunci foto & video rahasia.')
            : t('unlockPinDesc', 'Masukkan PIN master Anda untuk mengakses media di dalam brankas.')}
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-[#FEF2F2] dark:bg-[#200A0A] border border-[#EF4444]/40 rounded-[6px] text-[#EF4444] dark:text-[#FCA5A5] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1">
              {isSettingUp ? t('newPinLabel', 'Buat PIN Baru (Min 4 Digit)') : t('enterVaultPin', 'Masukkan PIN Brankas')}
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                autoFocus
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="input-artisan w-full text-center tracking-[0.5em] text-lg font-mono font-bold dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
              />
            </div>
          </div>

          {isSettingUp && (
            <div>
              <label className="block text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1">
                {t('repeatPinConfirm', 'Ulangi PIN Konfirmasi')}
              </label>
              <input
                type="password"
                maxLength={8}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="input-artisan w-full text-center tracking-[0.5em] text-lg font-mono font-bold dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full btn-primary text-[15px] h-[42px] justify-center"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? t('processing', 'Memproses...') : (isSettingUp ? t('savePinOpen', 'Simpan PIN & Buka') : t('openVault', 'Buka Brankas'))}</span>
            </button>
          </div>
        </form>

        <p className="text-[11px] text-[#A8A29E] mt-4">
          {t('autoLockNote', 'Otomatis terkunci setelah 3 menit tidak aktif atau saat berpindah aplikasi.')}
        </p>
      </div>
    </div>
  );
}

