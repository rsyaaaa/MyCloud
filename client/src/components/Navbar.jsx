import React, { useState } from 'react';
import {
  Cloud, Upload, Search, User, LogOut, Shield, ShieldCheck, HardDrive, Wifi,
  Moon, Sun, Trash2, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import { formatBytes } from './QuotaBar';

export default function Navbar({
  onOpenUpload,
  searchQuery,
  setSearchQuery,
  onOpenQuotaModal,
  onSelectTab,
  onOpenAvatarModal
}) {
  const { user, logout } = useAuth();
  const { isUnlocked, remainingSeconds } = useVault();
  const { isDark, toggleTheme } = useTheme();
  const [userDropdown, setUserDropdown] = useState(false);

  const avatarUrl = api.getAvatarUrl(user);

  return (
    <header className="sticky top-0 z-40 bg-[#FFFBF5] dark:bg-[#1E1B19] border-b-2 border-[#D6D3D1] dark:border-[#3E3834] px-6 h-16 flex items-center justify-between transition-colors">
      {/* Brand & Local IP Pill */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center border border-[#9A3412]">
            <Cloud className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl text-[#1C1917] dark:text-[#F5F2EB] tracking-tight leading-none">
              MyCloud
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4A373]">
              Local Media Hub
            </span>
          </div>
        </div>

        {/* Local Network Info Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#23201D] border border-[#D6D3D1] dark:border-[#3E3834] rounded-[4px] text-[11px] font-mono text-[#57534E] dark:text-[#A8A29E]">
          <Wifi className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>192.168.18.78:8080</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari foto, video, atau judul berkas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-artisan w-full pl-9 h-[38px] text-[13px]"
          />
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="btn-primary text-[14px] h-[38px] px-4"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Unggah Media</span>
        </button>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2.5 p-1 rounded-full border border-[#D6D3D1] dark:border-[#3E3834] bg-white dark:bg-[#23201D] hover:bg-[#FDF6EC] dark:hover:bg-[#2E2A26] transition-colors"
          >
            <img
              src={avatarUrl}
              alt={user?.username}
              className="w-8 h-8 rounded-full object-cover border border-[#D4A373]"
            />
            <span className="text-[13px] font-semibold text-[#1C1917] dark:text-[#F5F2EB] pr-2 hidden sm:inline">
              {user?.username}
            </span>
          </button>

          {userDropdown && (
            <div
              onClick={() => setUserDropdown(false)}
              className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#23201D] border-2 border-[#D6D3D1] dark:border-[#3E3834] rounded-[10px] shadow-modal py-2 z-50 text-[13px] text-[#1C1917] dark:text-[#F5F2EB] animate-enter select-none"
            >
              {/* Profile Header */}
              <div className="px-4 py-3 border-b border-[#E7E5E4] dark:border-[#3E3834] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative group cursor-pointer" onClick={() => { setUserDropdown(false); onOpenAvatarModal(); }}>
                    <img
                      src={avatarUrl}
                      alt={user?.username}
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#D4A373]"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-base leading-snug">{user?.username}</p>
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-[#FAF1E6] dark:bg-[#2E2A26] text-[#C2410C] px-1.5 py-0.2 rounded border border-[#D4A373] inline-block mt-0.5">
                      {user?.role === 'admin' ? 'Administrator' : 'User'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserDropdown(false);
                    onOpenAvatarModal();
                  }}
                  className="p-1.5 text-[#57534E] dark:text-[#A8A29E] hover:text-[#C2410C] rounded hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26]"
                  title="Ganti Foto Profil"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Quota Info */}
              <div className="px-4 py-2.5 text-[12px] text-[#57534E] dark:text-[#A8A29E] border-b border-[#E7E5E4] dark:border-[#3E3834]">
                <p>
                  Penyimpanan:{' '}
                  <strong className="text-[#1C1917] dark:text-[#F5F2EB] font-mono">
                    {formatBytes(user?.used_storage_bytes)}
                  </strong>{' '}
                  / {formatBytes(user?.storage_quota_bytes)}
                </p>
                <button
                  onClick={onOpenQuotaModal}
                  className="mt-1 text-[#C2410C] font-semibold hover:underline block text-[11px]"
                >
                  Ajukan Tambah Kuota →
                </button>
              </div>

              {/* Avatar Menu Items */}
              <div className="py-1">
                {/* Dark Mode Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTheme();
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#57534E]" />}
                    <span>{isDark ? 'Mode Terang' : 'Mode Gelap (Dark)'}</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF1E6] dark:bg-[#3E3834] text-[#C2410C]">
                    {isDark ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Brankas Menu Link (Moved here as requested!) */}
                <button
                  onClick={() => {
                    setUserDropdown(false);
                    if (onSelectTab) onSelectTab('vault');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {isUnlocked ? (
                      <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                    ) : (
                      <Shield className="w-4 h-4 text-[#C2410C]" />
                    )}
                    <span>Brankas Terkunci</span>
                  </div>
                  {isUnlocked && (
                    <span className="text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] dark:bg-[#143D14] dark:text-[#86EFAC] px-1.5 py-0.2 rounded">
                      Terbuka {remainingSeconds}s
                    </span>
                  )}
                </button>

                {/* Tempat Sampah Link */}
                <button
                  onClick={() => {
                    setUserDropdown(false);
                    if (onSelectTab) onSelectTab('trash');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] flex items-center gap-2.5"
                >
                  <Trash2 className="w-4 h-4 text-[#DC2626]" />
                  <span>Tempat Sampah (Trash)</span>
                </button>
              </div>

              <div className="border-t border-[#E7E5E4] dark:border-[#3E3834] my-1" />

              {/* Logout Button */}
              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#3D1414] flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
