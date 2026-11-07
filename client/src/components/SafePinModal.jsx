import React, { useState } from 'react';
import { X, ShieldCheck, Lock, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../api';

export default function SafePinModal({ isOpen, onClose, onSuccess }) {
  const { user, refreshUser } = useAuth();
  const { unlockVault } = useVault();
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
      setError('PIN minimal 4 digit.');
      return;
    }

    setLoading(true);
    try {
      if (isSettingUp) {
        if (pin !== confirmPin) {
          setError('Konfirmasi PIN tidak cocok.');
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
      setError(err.message || 'PIN salah atau gagal memverifikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/30 backdrop-blur-[2px]">
      <div className="bg-white border-2 border-[#D6D3D1] rounded-[8px] max-w-sm w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150 text-center">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-[#57534E] hover:text-[#1C1917] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-14 h-14 bg-[#FFFBF5] border-2 border-[#D4A373] rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-7 h-7 text-[#C2410C]" />
        </div>

        <h3 className="text-xl font-serif font-semibold text-[#1C1917] mb-1">
          {isSettingUp ? 'Atur PIN Brankas' : 'Buka Kunci Brankas'}
        </h3>
        <p className="text-[13px] text-[#57534E] mb-5">
          {isSettingUp
            ? 'Buat PIN sekunder untuk mengunci foto & video rahasia.'
            : 'Masukkan PIN master Anda untuk mengakses media di dalam brankas.'}
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-[#FEF2F2] border border-[#DC2626] rounded text-[#DC2626] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[13px] font-semibold text-[#1C1917] mb-1">
              {isSettingUp ? 'Buat PIN Baru (Min 4 Digit)' : 'Masukkan PIN Brankas'}
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
                className="input-artisan w-full text-center tracking-[0.5em] text-lg font-mono font-bold"
              />
            </div>
          </div>

          {isSettingUp && (
            <div>
              <label className="block text-[13px] font-semibold text-[#1C1917] mb-1">
                Ulangi PIN Konfirmasi
              </label>
              <input
                type="password"
                maxLength={8}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="input-artisan w-full text-center tracking-[0.5em] text-lg font-mono font-bold"
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
              <span>{loading ? 'Memproses...' : (isSettingUp ? 'Simpan PIN & Buka' : 'Buka Brankas')}</span>
            </button>
          </div>
        </form>

        <p className="text-[11px] text-[#A8A29E] mt-4">
          Otomatis terkunci setelah 3 menit tidak aktif atau saat berpindah aplikasi.
        </p>
      </div>
    </div>
  );
}

