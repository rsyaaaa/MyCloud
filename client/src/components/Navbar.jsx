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
  onOpenAvatarModal,
  isSidebarHidden,
  onToggleSidebar
}) {
  const { user, logout } = useAuth();
  const { isUnlocked, remainingSeconds } = useVault();
  const { isDark, toggleTheme } = useTheme();
  const [userDropdown, setUserDropdown] = useState(false);

  const avatarUrl = api.getAvatarUrl(user);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-[#E8E8EC] dark:border-[#1F1F27] px-6 h-14 flex items-center justify-between transition-colors">
      {/* Brand & Local IP Pill */}
      <div className="flex items-center gap-4">
        {/* Clickable Brand Logo & Text to toggle Sidebar */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center gap-2.5 hover:opacity-80 active:scale-95 transition-all select-none text-left cursor-pointer"
          title={isSidebarHidden ? "Buka Menu (Sidebar)" : "Tutup Menu (Sidebar)"}
        >
          <div className="w-8 h-8 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
            <Cloud className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h1 className="font-display font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight leading-none">
            MyCloud
          </h1>
        </button>

        {/* Local Network Info Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#F4F4F5] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[4px] text-[11px] font-mono text-[#6B6B6B] dark:text-[#A1A1AA]">
          <Wifi className="w-3.5 h-3.5 text-[#10B981]" />
          <span>192.168.18.78:8080</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#9C9C9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari foto, video, atau judul berkas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-artisan w-full pl-9 h-[36px] text-[13px]"
          />
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-3">
        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2.5 p-1 rounded-full border border-[#E8E8EC] dark:border-[#1F1F27] bg-white dark:bg-[#0A0A0E] hover:bg-[#F4F4F5] dark:hover:bg-[#141418] transition-colors"
          >
            <img
              src={avatarUrl}
              alt={user?.username}
              className="w-7 h-7 rounded-full object-cover border border-[#E8E8EC] dark:border-[#1F1F27]"
            />
            <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA] pr-2 hidden sm:inline">
              {user?.username}
            </span>
          </button>

          {userDropdown && (
            <div
              onClick={() => setUserDropdown(false)}
              className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px] shadow-modal py-2 z-50 text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA] animate-enter select-none"
            >
              {/* Profile Header */}
              <div className="px-4 py-3 border-b border-[#E8E8EC] dark:border-[#1F1F27] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative group cursor-pointer" onClick={() => { setUserDropdown(false); onOpenAvatarModal(); }}>
                    <img
                      src={avatarUrl}
                      alt={user?.username}
                      className="w-11 h-11 rounded-full object-cover border border-[#E8E8EC] dark:border-[#1F1F27]"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-base leading-snug">{user?.username}</p>
                    <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] dark:text-[#FB923C] px-2 py-0.5 rounded border border-[#C2410C]/20 inline-block mt-0.5">
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
                  className="p-1.5 text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#C2410C] rounded hover:bg-[#F4F4F5] dark:hover:bg-[#141418]"
                  title="Ganti Foto Profil"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Quota Info */}
              <div className="px-4 py-2.5 text-[12px] text-[#6B6B6B] dark:text-[#A1A1AA] border-b border-[#E8E8EC] dark:border-[#1F1F27]">
                <p>
                  Penyimpanan:{' '}
                  <strong className="text-[#0A0A0A] dark:text-white font-mono">
                    {formatBytes(user?.used_storage_bytes)}
                  </strong>{' '}
                  / {formatBytes(user?.storage_quota_bytes)}
                </p>
                <button
                  onClick={onOpenQuotaModal}
                  className="mt-1 text-[#C2410C] font-medium hover:underline block text-[11px]"
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
                  className="w-full px-4 py-2 text-left hover:bg-[#F4F4F5] dark:hover:bg-[#141418] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#6B6B6B]" />}
                    <span>{isDark ? 'Mode Terang' : 'Mode Gelap (AMOLED)'}</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F4F4F5] dark:bg-[#1F1F27] text-[#C2410C]">
                    {isDark ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Brankas Menu Link */}
                <button
                  onClick={() => {
                    setUserDropdown(false);
                    if (onSelectTab) onSelectTab('vault');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#F4F4F5] dark:hover:bg-[#141418] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {isUnlocked ? (
                      <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                    ) : (
                      <Shield className="w-4 h-4 text-[#C2410C]" />
                    )}
                    <span>Brankas Terkunci</span>
                  </div>
                  {isUnlocked && (
                    <span className="text-[10px] font-mono font-medium bg-[#ECFDF5] text-[#059669] dark:bg-[#062817] dark:text-[#34D399] px-1.5 py-0.5 rounded border border-[#10B981]/20">
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
                  className="w-full px-4 py-2 text-left hover:bg-[#F4F4F5] dark:hover:bg-[#141418] flex items-center gap-2.5"
                >
                  <Trash2 className="w-4 h-4 text-[#EF4444]" />
                  <span>Tempat Sampah (Trash)</span>
                </button>
              </div>

              <div className="border-t border-[#E8E8EC] dark:border-[#1F1F27] my-1" />

              {/* Logout Button */}
              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#200A0A] flex items-center gap-2"
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
