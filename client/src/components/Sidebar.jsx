import React, { useState, useEffect } from 'react';
import {
  Home, Images, Folder, FileText, Trash2, Settings, HardDrive, X, Terminal,
  Sun, Moon, Languages, Camera, Users, LogOut, Shield, ShieldCheck, ChevronDown, Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useVault } from '../context/VaultContext';
import { api } from '../api';
import QuotaBar from './QuotaBar';
import SwitchUserSection from './SwitchUserSection';

export default function Sidebar({
  currentTab,
  setTab,
  onHide,
  onOpenAvatarModal,
  isMobile = false
}) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { isUnlocked, remainingSeconds } = useVault();

  const [adminDiskStats, setAdminDiskStats] = useState(null);
  const [switchUserOpen, setSwitchUserOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.getAdminStats()
        .then((res) => {
          if (res?.disk) setAdminDiskStats(res.disk);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const navItems = [
    {
      id: 'home',
      label: user?.role === 'admin' ? t('serverDashboard', 'Server Dashboard') : t('home', 'Home'),
      icon: Home
    }
  ];

  // Pada desktop, sertakan galeri, all files, dan documents (pada mobile dihilangkan sesuai request)
  if (!isMobile) {
    if (user?.role !== 'admin') {
      navItems.push({ id: 'gallery', label: t('gallery', 'Galeri'), icon: Images });
    }
    navItems.push(
      { id: 'allfiles', label: t('allFiles', 'All Files'), icon: Folder },
      { id: 'documents', label: t('documents', 'Dokumen'), icon: FileText }
    );
  }

  if (user?.role !== 'admin') {
    navItems.push(
      { id: 'vault', label: t('vault', 'Brankas Terkunci'), icon: isUnlocked ? ShieldCheck : Shield }
    );
  }

  navItems.push(
    { id: 'trash', label: t('trash', 'Tempat Sampah'), icon: Trash2 }
  );

  // Menu Terminal khusus Admin
  if (user?.role === 'admin') {
    navItems.push({ id: 'terminal', label: 'Terminal Server', icon: Terminal });
  }

  const handleSelectNav = (tabId) => {
    setTab(tabId);
    if (onHide) onHide();
  };

  const containerClasses = isMobile
    ? 'w-full h-full overflow-y-auto bg-white dark:bg-[#0E0E12] flex flex-col justify-between p-4 scrollbar-none select-none'
    : 'w-64 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto bg-white dark:bg-[#000000] border-r border-[#E8E8EC] dark:border-[#1F1F27] flex flex-col justify-between shrink-0 p-4 transition-colors z-30 scrollbar-none select-none';

  return (
    <aside className={containerClasses}>
      <div className="space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          {isMobile ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center shadow-xs">
                <Cloud className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
                  MyCloud
                </h2>
                <p className="text-[10px] font-mono text-[#8E8E9E]">Pagelist / Menu</p>
              </div>
            </div>
          ) : (
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#9C9C9C]">
              {t('menu', 'Menu')}
            </span>
          )}

          {onHide && (
            <button
              onClick={onHide}
              className="p-1 rounded-[6px] text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white hover:bg-[#F4F4F5] dark:hover:bg-[#141418] transition-colors"
              title={t('closeMenu', 'Tutup Menu')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 1. Main Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13.5px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] dark:text-[#FB923C] font-semibold border border-[#C2410C]/20 shadow-xs'
                    : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#141418] hover:text-[#0A0A0A] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-[#C2410C] dark:text-[#FB923C]'
                        : item.id === 'trash'
                        ? 'text-[#EF4444]'
                        : item.id === 'vault' && isUnlocked
                        ? 'text-[#10B981]'
                        : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.id === 'vault' && isUnlocked && (
                  <span className="text-[9.5px] font-mono font-bold bg-[#ECFDF5] text-[#059669] dark:bg-[#062817] dark:text-[#34D399] px-1.5 py-0.5 rounded border border-[#10B981]/20 shrink-0">
                    {remainingSeconds}s
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 2. App Settings (Pengaturan Aplikasi) */}
        <div className="pt-3 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="px-2 pb-1.5 flex items-center gap-1.5 text-[10.5px] font-mono uppercase font-bold tracking-wider text-[#9C9C9C]">
            <Settings className="w-3 h-3 text-[#C2410C]" />
            <span>{t('appSettings', 'Pengaturan Aplikasi')}</span>
          </div>

          <div className="space-y-1">
            {/* Dark Mode Switch */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#6B6B6B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#141418] hover:text-[#0A0A0A] dark:hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {isDark ? (
                  <Sun className="w-4 h-4 text-[#F59E0B]" />
                ) : (
                  <Moon className="w-4 h-4 text-[#6B6B6B]" />
                )}
                <span>{isDark ? t('lightMode', 'Mode Terang') : t('darkMode', 'Mode Gelap')}</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border border-[#C2410C]/20">
                {isDark ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Language Switcher */}
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#6B6B6B] dark:text-[#A1A1AA]">
              <div className="flex items-center gap-2.5">
                <Languages className="w-4 h-4 text-[#6B6B6B] dark:text-[#9C9C9C]" />
                <span>{t('language', 'Bahasa')}</span>
              </div>
              <div className="flex items-center gap-1 bg-[#F4F4F6] dark:bg-[#1F1F27] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#272733]">
                <button
                  onClick={() => setLang('id')}
                  className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-all ${
                    lang === 'id'
                      ? 'bg-[#C2410C] text-white shadow-xs font-semibold'
                      : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-white'
                  }`}
                >
                  ID
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-all ${
                    lang === 'en'
                      ? 'bg-[#C2410C] text-white shadow-xs font-semibold'
                      : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Account Settings (Pengaturan Akun) */}
        <div className="pt-3 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="px-2 pb-1.5 flex items-center gap-1.5 text-[10.5px] font-mono uppercase font-bold tracking-wider text-[#9C9C9C]">
            <Users className="w-3 h-3 text-[#C2410C]" />
            <span>{t('accountSettings', 'Pengaturan Akun')}</span>
          </div>

          <div className="space-y-1">
            {/* Change Profile Picture (Disabled for admin) */}
            {user?.role !== 'admin' && (
              <button
                onClick={() => {
                  if (onHide) onHide();
                  if (onOpenAvatarModal) onOpenAvatarModal();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#6B6B6B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#141418] hover:text-[#0A0A0A] dark:hover:text-white transition-colors"
              >
                <Camera className="w-4 h-4 text-[#C2410C]" />
                <span>{t('changeAvatar', 'Ganti Foto Profil')}</span>
              </button>
            )}

            {/* Switch User Expandable Toggle (Hanya untuk desktop) */}
            {!isMobile && (
              <div>
                <button
                  onClick={() => setSwitchUserOpen(!switchUserOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#6B6B6B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#141418] hover:text-[#0A0A0A] dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[#EA580C]" />
                    <span>{t('switchUserTitle', 'Ganti Akun di Perangkat')}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      switchUserOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {switchUserOpen && (
                  <div className="mt-1 pl-2 border-l-2 border-[#C2410C]/40 animate-enter">
                    <SwitchUserSection onAfterSwitch={onHide} />
                  </div>
                )}
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={() => {
                if (onHide) onHide();
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#200A0A] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('logout', 'Keluar (Logout)')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quota Bar at Bottom */}
      <div className="pt-4 mt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
        <QuotaBar
          usedBytes={
            user?.role === 'admin'
              ? adminDiskStats?.used ?? user?.used_storage_bytes ?? 0
              : user?.used_storage_bytes || 0
          }
          quotaBytes={
            user?.role === 'admin'
              ? adminDiskStats?.total ?? 500 * 1024 * 1024 * 1024
              : user?.storage_quota_bytes || 1
          }
          title={user?.role === 'admin' ? 'Total Storage Server' : undefined}
        />
      </div>
    </aside>
  );
}
