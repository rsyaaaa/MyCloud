import React, { useState } from 'react';
import {
  Users, Check, Trash2, Plus, Lock, X, AlertCircle, Loader2, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';

export default function SwitchUserSection({ onAfterSwitch }) {
  const { user, savedAccounts, switchAccount, removeSavedAccount, login } = useAuth();
  const { t } = useLanguage();

  const [switchingId, setSwitchingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal for re-authenticating when token expired
  const [reauthModal, setReauthModal] = useState({
    isOpen: false,
    account: null,
    password: '',
    error: '',
    loading: false
  });

  // Modal for adding a completely new account to this device
  const [addModal, setAddModal] = useState({
    isOpen: false,
    username: '',
    password: '',
    error: '',
    loading: false
  });

  const performSwitchSuccess = () => {
    try {
      localStorage.setItem('mycloud_active_tab', 'home');
      localStorage.removeItem('mycloud_active_folder');
      localStorage.removeItem('mycloud_active_album');
      localStorage.removeItem('mycloud_gallery_subview');
    } catch (e) {}

    if (typeof onAfterSwitch === 'function') {
      try {
        onAfterSwitch();
      } catch (e) {}
    }

    if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.flushCookies === 'function') {
      try {
        window.AndroidBridge.flushCookies();
      } catch (e) {}
    }

    // Refresh halaman dan pastikan kembali ke menu home
    if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
      window.location.replace('/');
    } else {
      window.location.reload();
    }
  };

  const handleSwitch = async (account) => {
    if (account.id === user?.id) return; // already active
    setSwitchingId(account.id);
    setErrorMessage('');

    try {
      const res = await switchAccount(account);
      if (res.success) {
        performSwitchSuccess();
      } else if (res.requirePassword) {
        setReauthModal({
          isOpen: true,
          account,
          password: '',
          error: '',
          loading: false
        });
      } else {
        setErrorMessage(res.error || 'Gagal beralih akun.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat beralih akun.');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleReauthSubmit = async (e) => {
    e.preventDefault();
    if (!reauthModal.password) return;

    setReauthModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await login(reauthModal.account.username, reauthModal.password);
      setReauthModal({ isOpen: false, account: null, password: '', error: '', loading: false });
      performSwitchSuccess();
    } catch (err) {
      setReauthModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Password salah. Silakan coba lagi.'
      }));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addModal.username.trim() || !addModal.password) {
      setAddModal((prev) => ({ ...prev, error: t('usernamePasswordRequired', 'Username dan password wajib diisi.') }));
      return;
    }

    if (addModal.username.trim().toLowerCase() === 'admin') {
      setAddModal((prev) => ({
        ...prev,
        error: t('adminCannotAdd', 'Akun admin tidak dapat ditambahkan ke daftar switch user perangkat.')
      }));
      return;
    }

    setAddModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await login(addModal.username.trim(), addModal.password);
      setAddModal({ isOpen: false, username: '', password: '', error: '', loading: false });
      performSwitchSuccess();
    } catch (err) {
      setAddModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Gagal masuk akun. Periksa username dan password.'
      }));
    }
  };

  // Filter out any admin strictly AND exclude currently logged-in active user
  const displayAccounts = (savedAccounts || []).filter(
    (acc) => acc.role !== 'admin' && acc.username !== 'admin' && acc.id !== user?.id
  );

  return (
    <div className="py-2">
      {/* Section Header */}
      <div className="px-4 py-1.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider font-bold text-[#6B6B6B] dark:text-[#9C9C9C]">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>{t('switchUserTitle', 'Ganti Akun di Perangkat')}</span>
        </div>
        <span className="text-[10px] text-[#9C9C9C] dark:text-[#6B6B6B]">
          {displayAccounts.length} {t('accounts', 'Akun')}
        </span>
      </div>

      {errorMessage && (
        <div className="mx-4 my-1.5 p-2 rounded-[6px] bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Account List */}
      <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto scrollbar-thin">
        {displayAccounts.length === 0 ? (
          <div className="px-4 py-2.5 text-[12px] text-[#9C9C9C] dark:text-[#6B6B6B] italic">
            {t('noSavedAccounts', 'Belum ada akun lain di perangkat ini.')}
          </div>
        ) : (
          displayAccounts.map((acc) => {
            const isPublic = acc.role === 'public' || acc.username === 'public';
            const isSwitching = switchingId === acc.id;

            return (
              <div
                key={acc.id}
                className="group px-4 py-2 flex items-center justify-between hover:bg-[#F4F4F5] dark:hover:bg-[#141418] cursor-pointer transition-colors"
                onClick={() => {
                  if (!isSwitching) handleSwitch(acc);
                }}
              >
                {/* User info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={api.getAvatarUrl(acc)}
                      alt={acc.username}
                      className="w-7 h-7 rounded-full object-cover border border-[#E8E8EC] dark:border-[#272733]"
                    />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                        {isPublic ? t('publicUser', 'Public User') : acc.username}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                      {isPublic ? t('sharedStorage', 'Shared Storage (50 GB)') : t('userAccount', 'Akun Pengguna')}
                    </span>
                  </div>
                </div>

                {/* Actions: Loading spinner or delete button */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isSwitching && (
                    <Loader2 className="w-4 h-4 text-[#C2410C] animate-spin" />
                  )}

                  {/* Remove Account from Device Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSavedAccount(acc.id);
                    }}
                    className="p-1 rounded-[4px] text-[#9C9C9C] hover:text-[#EF4444] hover:bg-red-500/10 transition-colors opacity-70 group-hover:opacity-100"
                    title={t('removeAccountFromDevice', 'Hapus akun dari perangkat ini')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Button: + Masuk ke Akun Lain */}
      <button
        type="button"
        onClick={() => setAddModal({ isOpen: true, username: '', password: '', error: '', loading: false })}
        className="w-full mt-1 px-4 py-2 text-left text-[12px] font-medium text-[#C2410C] hover:bg-[#FFF7ED] dark:hover:bg-[#200E08] flex items-center gap-2 transition-colors border-t border-[#E8E8EC] dark:border-[#1F1F27]"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{t('addOtherAccount', '+ Masuk ke Akun Lain')}</span>
      </button>

      {/* Re-authenticate Modal (when switching to user with expired token) */}
      {reauthModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setReauthModal({ isOpen: false, account: null, password: '', error: '', loading: false })}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] p-5 shadow-2xl text-[#0A0A0A] dark:text-[#FAFAFA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C2410C]" />
                <h4 className="font-semibold text-sm">
                  {t('reauthTitle', 'Konfirmasi Password')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setReauthModal({ isOpen: false, account: null, password: '', error: '', loading: false })}
                className="text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-2.5">
              {t('reauthSubtitle', 'Sesi login tersimpan telah berakhir. Masukkan password akun')} <strong>{reauthModal.account?.username}</strong> {t('toContinue', 'untuk melanjutkan:')}
            </p>

            <form onSubmit={handleReauthSubmit} className="mt-3 space-y-3">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder={t('passwordPlaceholder', 'Password')}
                  value={reauthModal.password}
                  onChange={(e) => setReauthModal((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] bg-[#F4F4F5] dark:bg-[#141418] border border-[#E8E8EC] dark:border-[#272733] text-[13px] outline-none focus:border-[#C2410C]"
                />
              </div>

              {reauthModal.error && (
                <div className="text-[11px] text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{reauthModal.error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReauthModal({ isOpen: false, account: null, password: '', error: '', loading: false })}
                  className="px-3 py-1.5 text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white"
                >
                  {t('cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={reauthModal.loading || !reauthModal.password}
                  className="btn-primary h-8 px-4 text-[12px] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {reauthModal.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{t('switchNow', 'Beralih Akun')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Account to Device Modal */}
      {addModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setAddModal({ isOpen: false, username: '', password: '', error: '', loading: false })}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] p-5 shadow-2xl text-[#0A0A0A] dark:text-[#FAFAFA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C2410C]" />
                <h4 className="font-semibold text-sm">
                  {t('addAccountTitle', 'Masuk ke Akun Lain')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAddModal({ isOpen: false, username: '', password: '', error: '', loading: false })}
                className="text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-2.5">
              {t('addAccountSubtitle', 'Akun yang berhasil masuk akan otomatis tersimpan di perangkat ini untuk kemudahan switch user di kemudian hari.')}
            </p>

            <form onSubmit={handleAddSubmit} className="mt-3 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#6B6B6B] dark:text-[#9C9C9C] mb-1">
                  Username
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Username"
                  value={addModal.username}
                  onChange={(e) => setAddModal((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] bg-[#F4F4F5] dark:bg-[#141418] border border-[#E8E8EC] dark:border-[#272733] text-[13px] outline-none focus:border-[#C2410C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#6B6B6B] dark:text-[#9C9C9C] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  value={addModal.password}
                  onChange={(e) => setAddModal((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[6px] bg-[#F4F4F5] dark:bg-[#141418] border border-[#E8E8EC] dark:border-[#272733] text-[13px] outline-none focus:border-[#C2410C]"
                />
              </div>

              {addModal.error && (
                <div className="text-[11px] text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{addModal.error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModal({ isOpen: false, username: '', password: '', error: '', loading: false })}
                  className="px-3 py-1.5 text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white"
                >
                  {t('cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={addModal.loading || !addModal.username.trim() || !addModal.password}
                  className="btn-primary h-8 px-4 text-[12px] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {addModal.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{t('loginAndSave', 'Masuk & Simpan')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

