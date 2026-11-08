import React, { useState, useRef } from 'react';
import {
  Cloud, Lock, User, Wifi, AlertCircle, Globe, Trash2, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { getSavedAccounts, removeAccount } from '../utils/savedAccounts';

export default function LoginPage() {
  const { login, loginPublic, register } = useAuth();
  const { t } = useLanguage();

  const [savedList, setSavedList] = useState(() => {
    return getSavedAccounts().filter((a) => a.role !== 'admin' && a.username !== 'admin');
  });

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordInputRef = useRef(null);

  const handleSelectAccount = (acc) => {
    setError('');
    setUsername(acc.username);
    setPassword('');
    // Automatically focus on password field
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveAccount = (e, accId) => {
    e.stopPropagation();
    const remaining = removeAccount(accId);
    const filtered = remaining.filter((a) => a.role !== 'admin' && a.username !== 'admin');
    setSavedList(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat otentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublicLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginPublic();
    } catch (err) {
      setError(err.message || 'Gagal masuk sebagai pengguna publik.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#000000] flex flex-col justify-center items-center p-6 selection:bg-[#FFEDD5] selection:text-[#C2410C] text-[#0A0A0A] dark:text-[#FAFAFA] transition-colors">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#C2410C] text-white rounded-[12px] flex items-center justify-center mx-auto mb-4 shadow-primary-glow">
          <Cloud className="w-9 h-9 stroke-[2.2]" />
        </div>
        <h1 className="font-serif font-bold text-3xl tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
          Personal Local Cloud & Media Hub
        </h1>
        <p className="text-[14px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1.5 flex items-center justify-center gap-1.5">
          <Wifi className="w-4 h-4 text-[#10B981]" />
          <span>Local Area Network: <strong>192.168.18.78:8080</strong></span>
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] max-w-md w-full p-8 shadow-modal animate-enter">
        {/* Toggle Login / Register Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F4F5] dark:bg-[#14141A] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`py-2 text-[14px] font-semibold rounded-[4px] transition-all ${
              !isRegister ? 'bg-[#C2410C] text-white shadow-primary-glow' : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
            }`}
          >
            {t('loginAction', 'Masuk (Login)')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`py-2 text-[14px] font-semibold rounded-[4px] transition-all ${
              isRegister ? 'bg-[#C2410C] text-white shadow-primary-glow' : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
            }`}
          >
            {t('newAccount', 'Daftar Akun Baru')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#2A0808] border border-[#EF4444]/40 rounded-[6px] text-[#EF4444] dark:text-[#FCA5A5] text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Form: Username & Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5 text-[#0A0A0A] dark:text-[#FAFAFA]">
              Username
            </label>
            <div className="flex items-center w-full h-[42px] px-3.5 rounded-[8px] bg-white dark:bg-[#121217] border border-[#E8E8EC] dark:border-[#272733] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all">
              <User className="w-4 h-4 text-[#9C9C9C] shrink-0 mr-3" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#71717A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5 text-[#0A0A0A] dark:text-[#FAFAFA]">
              Password
            </label>
            <div className="flex items-center w-full h-[42px] px-3.5 rounded-[8px] bg-white dark:bg-[#121217] border border-[#E8E8EC] dark:border-[#272733] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all">
              <Lock className="w-4 h-4 text-[#9C9C9C] shrink-0 mr-3" />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#71717A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#9C9C9C] hover:text-[#C2410C] p-1 transition-colors shrink-0"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isRegister && (
              <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1.5">
                {t('newAccountQuota', 'Akun baru akan mendapatkan kuota default')} <strong>15 GB</strong>.
              </p>
            )}
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full btn-primary h-[44px] text-[15px] justify-center"
            >
              {loading ? t('processing', 'Memproses...') : (isRegister ? t('registerBtn', 'Daftar Akun') : t('enterMyCloud', 'Masuk ke MyCloud'))}
            </button>
          </div>
        </form>

        {/* Saved Accounts on this Device (di bawah form username & password) */}
        {savedList.length > 0 && !isRegister && (
          <div className="mt-5 pt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#6B6B6B] dark:text-[#9C9C9C]">
                {t('savedAccountsTitle', 'Akun di Perangkat Ini')}
              </span>
              <span className="text-[10px] text-[#9C9C9C] dark:text-[#6B6B6B]">
                {savedList.length} {t('accounts', 'Akun')}
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
              {savedList.map((acc) => {
                const isSelected = username.toLowerCase() === acc.username.toLowerCase();
                const isPublic = acc.role === 'public' || acc.username === 'public';

                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc)}
                    className={`p-2 rounded-[8px] border transition-all flex items-center justify-between cursor-pointer group ${
                      isSelected
                        ? 'bg-[#C2410C]/10 border-[#C2410C] text-[#C2410C]'
                        : 'bg-[#F4F4F5] dark:bg-[#141418] border-[#E8E8EC] dark:border-[#272733] hover:border-[#C2410C]/60 text-[#0A0A0A] dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={api.getAvatarUrl(acc)}
                        alt={acc.username}
                        className="w-7 h-7 rounded-full object-cover border border-[#E8E8EC] dark:border-[#272733] shrink-0"
                      />
                      <div className="truncate text-left">
                        <span className="text-[13px] font-medium block truncate">
                          {isPublic ? t('publicUser', 'Public User') : acc.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] hidden sm:inline">
                        {isSelected ? '✓ Terpilih' : 'Lanjutkan'}
                      </span>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, acc.id)}
                        className="p-1 rounded text-[#9C9C9C] hover:text-[#EF4444] hover:bg-red-500/10 transition-colors opacity-70 group-hover:opacity-100"
                        title={t('removeAccount', 'Hapus dari perangkat')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider: Akses User Public */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E8EC] dark:border-[#1F1F27]" />
          </div>
          <span className="relative px-3 bg-white dark:bg-[#0A0A0E] text-[11px] text-[#9C9C9C] uppercase font-mono tracking-wider">
            {t('orPublic', 'atau akses publik')}
          </span>
        </div>

        {/* 1-Click Public User Access Button */}
        <button
          type="button"
          onClick={handlePublicLogin}
          disabled={loading}
          className="w-full p-3.5 rounded-[8px] bg-[#FFF7ED] dark:bg-[#1E1109] hover:bg-[#FFEDD5] dark:hover:bg-[#2A160A] border border-[#C2410C]/30 hover:border-[#C2410C] text-[#C2410C] dark:text-[#FB923C] font-semibold text-[14px] flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] group"
        >
          <Globe className="w-4.5 h-4.5 stroke-[2.2] group-hover:scale-110 transition-transform" />
          <span>{t('publicLoginBtn', 'Masuk sebagai User Public (50 GB Shared)')}</span>
        </button>
        <p className="text-[11px] text-center text-[#6B6B6B] dark:text-[#9C9C9C] mt-2">
          {t('publicDesc', 'Tanpa password • Akses bersama untuk berbagi & unduh berkas')}
        </p>
      </div>
    </div>
  );
}
