import React, { useState } from 'react';
import {
  Cloud, Upload, Search, User, LogOut, Shield, ShieldCheck, HardDrive, Wifi,
  Moon, Sun, Trash2, Camera, Languages, X, ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTransfer } from '../context/TransferContext';
import { api } from '../api';
import { formatBytes } from './QuotaBar';
import SwitchUserSection from './SwitchUserSection';
import NetworkBadge from './NetworkBadge';

export default function Navbar({
  onOpenUpload,
  searchQuery,
  setSearchQuery,
  onSelectTab,
  onOpenAvatarModal,
  isSidebarHidden,
  onToggleSidebar,
  onOpenTransferList
}) {
  const { user, logout } = useAuth();
  const { isUnlocked, remainingSeconds } = useVault();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { activeTransfersCount, isUploading, isDownloading, hasFailure } = useTransfer();
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
          title={isSidebarHidden ? t('openSidebar', 'Buka Menu (Sidebar)') : t('closeSidebar', 'Tutup Menu (Sidebar)')}
        >
          <div className="w-8 h-8 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
            <Cloud className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h1 className="font-display font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight leading-none">
            MyCloud
          </h1>
        </button>

        {/* Adaptive Network Connection Badge */}
        <div className="hidden sm:block">
          <NetworkBadge />
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="flex items-center w-full h-[38px] px-3.5 rounded-[8px] bg-[#F4F4F5] dark:bg-[#121217] border border-[#E8E8EC] dark:border-[#1F1F27] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all">
          <Search className="w-4 h-4 text-[#9C9C9C] shrink-0 mr-2.5" />
          <input
            type="text"
            placeholder={t('searchPlaceholder', 'Cari foto, video, atau judul berkas...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent border-none outline-none text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#9C9C9C]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-[#9C9C9C] hover:text-[#C2410C] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Transfer List Trigger Button */}
        <button
          onClick={onOpenTransferList}
          className="w-8 h-8 rounded-full border border-[#E8E8EC] dark:border-[#1F1F27] bg-white dark:bg-[#0A0A0E] hover:bg-[#F4F4F5] dark:hover:bg-[#141418] flex items-center justify-center text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#C2410C] dark:hover:text-[#EA580C] active:scale-95 transition-all relative"
          title="Transfer List"
        >
          <ArrowUpDown className="w-4 h-4 stroke-[2.2]" />
          {(activeTransfersCount > 0 || hasFailure) && (
            <span
              className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0A0A0E] ${
                hasFailure ? 'bg-[#EF4444]' : isUploading ? 'bg-[#C2410C]' : 'bg-[#10B981]'
              } animate-pulse`}
            />
          )}
        </button>

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
              {user?.username === 'public' ? 'Public (Shared)' : user?.username}
            </span>
          </button>

          {userDropdown && (
            <>
              {/* Backdrop to close dropdown on outside click */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserDropdown(false)}
              />

              <div
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[16px] shadow-2xl p-3 z-50 text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA] animate-enter select-none space-y-2.5"
              >
                {/* 1. Combined User Profile & Storage Capacity Card */}
                <div className="p-3.5 rounded-[12px] bg-[#F8F9FA] dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E]">
                  {/* Top: Avatar, Name, Role Badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={avatarUrl}
                      alt={user?.username}
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#C2410C] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-snug truncate">
                        {user?.username === 'public' ? 'Public User' : user?.username}
                      </p>
                      <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] dark:text-[#FB923C] px-2 py-0.5 rounded border border-[#C2410C]/20 inline-block mt-0.5">
                        {user?.role === 'admin'
                          ? t('administrator', 'Administrator')
                          : user?.role === 'public'
                          ? t('publicShared', 'Public Shared (50 GB)')
                          : t('userRole', 'User')}
                      </span>
                    </div>
                  </div>

                  {/* Storage Capacity Sub-section inside the same card */}
                  {(() => {
                    const used = user?.used_storage_bytes || 0;
                    const quota = user?.storage_quota_bytes || 1;
                    const pct = Math.min(100, Math.max(0, Math.round((used / quota) * 100)));

                    return (
                      <div className="pt-2.5 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">
                            <HardDrive className="w-3.5 h-3.5 text-[#C2410C]" />
                            <span>{t('storageCapacity', 'Storage Capacity')}</span>
                          </div>
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border border-[#C2410C]/20">
                            {pct}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#E5E7EB] dark:bg-[#272732] h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#C2410C] to-[#EA580C] transition-all duration-300"
                            style={{ width: `${Math.max(3, pct)}%` }}
                          />
                        </div>

                        {/* Used vs Limit */}
                        <div className="flex justify-between items-center text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1.5 font-mono">
                          <span>
                            {t('used', 'Used')}: <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">{formatBytes(used)}</strong>
                          </span>
                          <span>
                            {t('limit', 'Limit')}: <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">{formatBytes(quota)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Host Server Info */}
                <div className="px-3 py-2 bg-[#F8F9FA] dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] rounded-[10px] text-[11.5px] text-[#6B6B6B] dark:text-[#9C9C9C] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{t('hostServer', 'Host Server')}:</span>
                  </div>
                  <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">192.168.18.78:8080</strong>
                </div>

                {/* 3. Fitur Switch User di Perangkat */}
                <div className="border border-[#E8E8EC] dark:border-[#22222E] rounded-[12px] bg-[#F8F9FA] dark:bg-[#14141B] overflow-hidden">
                  <SwitchUserSection onAfterSwitch={() => setUserDropdown(false)} />
                </div>

                {/* 4. Logout Button */}
                <button
                  onClick={() => {
                    setUserDropdown(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-left text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#200A0A] rounded-[10px] flex items-center gap-2 font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout', 'Keluar (Logout)')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
