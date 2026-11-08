import React, { useState, useEffect } from 'react';
import {
  Cloud, Home, Images, Image, Film, Folder, Shield, ShieldCheck, Server,
  Upload, Search, User, X, LogOut, ArrowUpCircle, HardDrive, Wifi,
  Moon, Sun, Trash2, Camera, Languages, Terminal as TerminalIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MobileHomeView from './MobileHomeView';
import MobileGalleryView from './MobileGalleryView';
import MobileVideoHubView from './MobileVideoHubView';
import MobileAllFilesView from './MobileAllFilesView';
import MobileDocumentsView from './MobileDocumentsView';
import MobileAlbumsView from './MobileAlbumsView';
import MobileVaultView from './MobileVaultView';
import MobileAdminView from './MobileAdminView';
import AdminHomeDashboard from '../components/AdminHomeDashboard';
import TerminalPage from '../pages/TerminalPage';
import MobileTrashView from './MobileTrashView';
import MobileSearchView from './MobileSearchView';
import MobileMediaDetailView from './MobileMediaDetailView';
import MediaContextMenu from '../components/MediaContextMenu';
import MediaDetailModal from '../components/MediaDetailModal';
import AvatarModal from '../components/AvatarModal';
import { subscribeMediaEvent } from '../utils/mediaEvents';
import QuotaBar from '../components/QuotaBar';
import SwitchUserSection from '../components/SwitchUserSection';
import { api } from '../api';
import { recordRecentItem } from '../utils/recentHistory';

export default function MobileApp({
  onOpenUpload,
  onOpenText,
  onOpenViewer,
  onToggleFavorite,
  onLockMedia,
  onUnlockMedia,
  onOrganizeMedia,
  onDeleteMedia,
  onRenameMedia
}) {
  const { user, refreshUser, logout } = useAuth();
  const { isUnlocked, remainingSeconds, notifyTabChange } = useVault();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const [currentTab, setCurrentTabState] = useState('home'); // 'home', 'gallery', 'videos', 'albums', 'vault', 'trash', 'admin'
  const [activeFolder, setActiveFolder] = useState(null);
  const [gallerySubView, setGallerySubView] = useState('all'); // 'all', 'photo', 'video'
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [adminDiskStats, setAdminDiskStats] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.getAdminStats()
        .then(res => {
          if (res?.disk) setAdminDiskStats(res.disk);
        })
        .catch(() => {});
    }
  }, [user?.role]);

  // Dedicated Mobile Media Viewer State (Full-Screen View)
  const [detailViewer, setDetailViewer] = useState({
    isOpen: false,
    mediaList: [],
    currentIndex: 0,
    isVault: false,
    vaultToken: null
  });

  // Long-press Context Menu & Metadata Modal
  const [contextMenuMedia, setContextMenuMedia] = useState(null);
  const [detailModalMedia, setDetailModalMedia] = useState(null);

  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setDetailViewer((prev) => ({
          ...prev,
          mediaList: (prev.mediaList || []).map((m) =>
            m.id === event.id ? { ...m, is_favorite: event.is_favorite } : m
          )
        }));
      } else if (event.type === 'delete' || event.type === 'lock') {
        setDetailViewer((prev) => ({
          ...prev,
          isOpen: false,
          mediaList: (prev.mediaList || []).filter((m) => m.id !== event.id)
        }));
      } else if (event.type === 'rename') {
        setDetailViewer((prev) => ({
          ...prev,
          mediaList: (prev.mediaList || []).map((m) =>
            m.id === event.id ? { ...m, display_name: event.name } : m
          )
        }));
      }
    });
    return unsub;
  }, []);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const setTab = (newTab) => {
    setCurrentTabState(newTab);
    notifyTabChange(newTab);
  };

  // Browser tab title follows the active menu.
  useEffect(() => {
    document.title = 'MyCloud';
  }, []);

  const handleNavigate = (tab, subView = 'all', folderId = null) => {
    if (subView) setGallerySubView(subView);
    setTab(tab);
  };

  const navItems = [
    { id: 'home', label: user?.role === 'admin' ? 'Server' : t('home', 'Home'), icon: Home },
  ];

  // Untuk admin, halaman gallery dihapus
  if (user?.role !== 'admin') {
    navItems.push({ id: 'gallery', label: t('gallery', 'Galeri'), icon: Images });
  }

  navItems.push(
    { id: 'search', label: t('search', 'Search'), icon: Search },
    { id: 'allfiles', label: t('allFiles', 'All Files'), icon: Folder },
    { id: 'trash', label: t('trashMobile', 'Sampah'), icon: Trash2 },
  );

  // Menu Terminal untuk admin di mobile bottom bar
  if (user?.role === 'admin') {
    navItems.push({ id: 'terminal', label: 'Terminal', icon: TerminalIcon });
  }

  // Open full-screen dedicated mobile media viewer
  const handleMobileOpenViewer = (list, index, isVault = false, vaultToken = null) => {
    if (list && list[index]) {
      recordRecentItem(list[index]);
    }
    setDetailViewer({
      isOpen: true,
      mediaList: list,
      currentIndex: index,
      isVault,
      vaultToken
    });
  };

  const avatarUrl = api.getAvatarUrl(user);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#000000] flex flex-col text-[#0A0A0A] dark:text-[#FAFAFA] selection:bg-[#FFEDD5] selection:text-[#C2410C] transition-colors">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-[#E8E8EC] dark:border-[#1F1F27] px-4 h-14 flex items-center justify-between shadow-none transition-colors">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
            <Cloud className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h1 className="font-display font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight leading-none">
            MyCloud
          </h1>
        </div>

        {/* Right actions: Profile Avatar */}
        <div className="flex items-center gap-2">
          {/* User Avatar Circle */}
          <button
            onClick={() => setProfileDrawerOpen(true)}
            className="w-8 h-8 rounded-full border border-[#E8E8EC] dark:border-[#1F1F27] overflow-hidden ml-1 active:scale-95 transition-transform"
          >
            <img
              src={avatarUrl}
              alt={user?.username}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* Main Mobile Screen View Area */}
      <main className="flex-1 w-full animate-enter">
        {currentTab === 'home' && (
          <MobileHomeView
            onNavigate={handleNavigate}
            onOpenViewer={handleMobileOpenViewer}
            onOpenText={onOpenText}
          />
        )}

        {currentTab === 'gallery' && user?.role !== 'admin' && (
          <MobileGalleryView
            initialSubView={gallerySubView}
            searchQuery={searchQuery}
            onOpenViewer={handleMobileOpenViewer}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={(media) => setContextMenuMedia(media)}
          />
        )}

        {currentTab === 'search' && (
          <MobileSearchView
            onOpenViewer={handleMobileOpenViewer}
            onOpenText={onOpenText}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={(media) => setContextMenuMedia(media)}
          />
        )}

        {currentTab === 'allfiles' && (
          <MobileAllFilesView
            onOpenViewer={handleMobileOpenViewer}
            onOpenText={onOpenText}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={(media) => setContextMenuMedia(media)}
            onOpenUpload={() => onOpenUpload(activeFolder)}
            onFolderChange={setActiveFolder}
          />
        )}

        {currentTab === 'documents' && (
          <MobileDocumentsView
            onOpenText={onOpenText}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={(media) => setContextMenuMedia(media)}
          />
        )}

        {currentTab === 'videos' && (
          <MobileVideoHubView
            onOpenViewer={handleMobileOpenViewer}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={(media) => setContextMenuMedia(media)}
          />
        )}

        {currentTab === 'albums' && (
          <MobileAlbumsView
            onOpenViewer={handleMobileOpenViewer}
            onOpenText={onOpenText}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={(media) => setContextMenuMedia(media)}
          />
        )}

        {currentTab === 'vault' && (
          <MobileVaultView
            onOpenViewer={handleMobileOpenViewer}
            onUnlockMedia={onUnlockMedia}
            onDeleteMedia={onDeleteMedia}
            onRenameMedia={onRenameMedia}
            onLongPress={(media) => setContextMenuMedia(media)}
          />
        )}

        {currentTab === 'trash' && (
          <MobileTrashView
            onBack={() => setTab('gallery')}
            onRefreshQuota={refreshUser}
          />
        )}

        {currentTab === 'admin' && user?.role === 'admin' && (
          <div className="pb-28">
            <AdminHomeDashboard />
          </div>
        )}

        {currentTab === 'terminal' && user?.role === 'admin' && (
          <div className="pb-20">
            <TerminalPage />
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) - Upload (Hidden on Terminal, Trash, and Admin Dashboard) */}
      {currentTab !== 'terminal' && currentTab !== 'trash' && !(user?.role === 'admin' && (currentTab === 'home' || currentTab === 'admin')) && (
        <button
          onClick={() => onOpenUpload(currentTab === 'allfiles' ? activeFolder : null)}
          className="fixed bottom-[86px] right-4 z-40 bg-[#C2410C] hover:bg-[#EA580C] text-white h-12 px-6 rounded-full shadow-[0_8px_25px_rgba(194,65,12,0.40)] flex items-center justify-center gap-2.5 active:scale-95 transition-all text-[14px] font-semibold tracking-wide select-none"
          title={activeFolder && currentTab === 'allfiles' ? `Upload ke folder ${activeFolder.name}` : t('upload', 'Upload Media')}
        >
          <Upload className="w-4 h-4 stroke-[2.3]" />
          <span>{activeFolder && currentTab === 'allfiles' ? activeFolder.name : t('upload', 'Upload')}</span>
        </button>
      )}

      {/* Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-3 inset-x-3 sm:inset-x-6 max-w-md mx-auto h-[62px] bg-white/90 dark:bg-[#0A0A0E]/90 backdrop-blur-xl border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.70)] z-40 flex items-center justify-around px-2 transition-all">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-[16px] transition-all active:scale-95 ${
                isActive
                  ? 'text-[#C2410C] font-semibold bg-[#FFF7ED] dark:bg-[#2A1208]'
                  : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] mt-0.5 tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User Profile & Avatar Menu Bottom Sheet (Drawer) */}
      {profileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={() => setProfileDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0A0A0E] border-t border-[#E8E8EC] dark:border-[#1F1F27] rounded-t-[16px] p-5 shadow-modal animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto text-[#0A0A0A] dark:text-[#FAFAFA]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
              <div className="flex items-center gap-3">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => {
                    setProfileDrawerOpen(false);
                    setAvatarModalOpen(true);
                  }}
                >
                  <img
                    src={avatarUrl}
                    alt={user?.username}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#C2410C]"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-none">
                    {user?.username === 'public' ? 'Public User' : user?.username}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#C2410C] bg-[#FFF7ED] dark:bg-[#2A1208] px-1.5 py-0.5 rounded border border-[#C2410C]/20 mt-1 inline-block">
                    {user?.role === 'admin' ? 'Administrator' : user?.role === 'public' ? 'Public Shared (50 GB)' : 'User'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setProfileDrawerOpen(false)}
                className="p-1.5 text-[#6B6B6B] dark:text-[#9C9C9C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Change Avatar Button */}
            <button
              onClick={() => {
                setProfileDrawerOpen(false);
                setAvatarModalOpen(true);
              }}
              className="w-full btn-secondary h-9 text-[12px] justify-center mb-3"
            >
              <Camera className="w-4 h-4" />
              <span>{t('changeAvatar', 'Ganti Foto Profil')}</span>
            </button>

            {/* Quota Widget */}
            <div className="mb-4">
              <QuotaBar
                usedBytes={user?.role === 'admin' ? (adminDiskStats?.used ?? user?.used_storage_bytes ?? 0) : (user?.used_storage_bytes || 0)}
                quotaBytes={user?.role === 'admin' ? (adminDiskStats?.total ?? 500 * 1024 * 1024 * 1024) : (user?.storage_quota_bytes || 1)}
                title={user?.role === 'admin' ? 'Total Storage Server' : undefined}
              />
            </div>

            {/* Menu Options Inside Profile Drawer */}
            <div className="space-y-1 mb-4 border-t border-b border-[#E8E8EC] dark:border-[#1F1F27] py-2">
              {/* Dark Mode Switch */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#6B6B6B]" />}
                  <span>{isDark ? t('lightMode', 'Mode Terang') : t('darkMode', 'Mode Gelap')}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                  {isDark ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Language Switcher (di bawah mode terang & gelap) */}
              <div className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[13px] border-b border-[#E8E8EC] dark:border-[#1F1F27] pb-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <Languages className="w-4 h-4 text-[#6B6B6B] dark:text-[#9C9C9C]" />
                  <span>{t('language', 'Bahasa')}</span>
                </div>
                <div className="flex items-center gap-1 bg-[#E8E8EC] dark:bg-[#1F1F27] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#272733]">
                  <button
                    onClick={() => setLang('id')}
                    className={`px-2.5 py-0.5 rounded-[4px] text-[11px] font-medium transition-all ${
                      lang === 'id'
                        ? 'bg-[#C2410C] text-white shadow-sm font-semibold'
                        : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                    }`}
                  >
                    ID
                  </button>
                  <button
                    onClick={() => setLang('en')}
                    className={`px-2.5 py-0.5 rounded-[4px] text-[11px] font-medium transition-all ${
                      lang === 'en'
                        ? 'bg-[#C2410C] text-white shadow-sm font-semibold'
                        : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Brankas Terkunci (Vault Link in Avatar Menu) */}
              <button
                onClick={() => {
                  setProfileDrawerOpen(false);
                  setTab('vault');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  {isUnlocked ? (
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <Shield className="w-4 h-4 text-[#C2410C]" />
                  )}
                  <span>{t('vault', 'Brankas Terkunci')}</span>
                </div>
                {isUnlocked ? (
                  <span className="text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#059669] dark:bg-[#062817] dark:text-[#10B981] px-1.5 py-0.5 rounded border border-[#10B981]/20">
                    {t('unlockedBadge', 'Terbuka')} {remainingSeconds}s
                  </span>
                ) : (
                  <span className="text-[11px] text-[#9C9C9C]">Terkunci</span>
                )}
              </button>

              {/* Tempat Sampah (Trash Link) */}
              <button
                onClick={() => {
                  setProfileDrawerOpen(false);
                  setTab('trash');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[13px]"
              >
                <div className="flex items-center gap-2.5 text-[#EF4444]">
                  <Trash2 className="w-4 h-4" />
                  <span>{t('trashMobile', 'Sampah')}</span>
                </div>
              </button>

              {/* Admin Dashboard (jika admin) */}
              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => {
                      setProfileDrawerOpen(false);
                      setTab('home');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[13px]"
                  >
                    <div className="flex items-center gap-2.5 text-[#C2410C]">
                      <Server className="w-4 h-4" />
                      <span>{t('admin', 'Admin Dashboard')}</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDrawerOpen(false);
                      setTab('terminal');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[13px]"
                  >
                    <div className="flex items-center gap-2.5 text-[#10B981]">
                      <TerminalIcon className="w-4 h-4" />
                      <span>Terminal Server</span>
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Server IP Info */}
            <div className="p-3 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] mb-3 text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#10B981]" />
                <span>{t('hostServer', 'Host Server')}:</span>
              </div>
              <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">192.168.18.78:8080</strong>
            </div>

            {/* Fitur Switch User di Perangkat (Akun non-admin) */}
            <div className="border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px] mb-3 bg-[#FAFAFA] dark:bg-[#0A0A0E] overflow-hidden">
              <SwitchUserSection onAfterSwitch={() => setProfileDrawerOpen(false)} />
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setProfileDrawerOpen(false);
                logout();
              }}
              className="w-full btn-destructive h-[42px] text-[14px] justify-center"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('logout', 'Keluar (Logout)')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Mobile Full-Screen Media Detail Viewer */}
      <MobileMediaDetailView
        isOpen={detailViewer.isOpen}
        mediaList={detailViewer.mediaList}
        currentIndex={detailViewer.currentIndex}
        isVault={detailViewer.isVault}
        vaultToken={detailViewer.vaultToken}
        onClose={() => setDetailViewer((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(idx) => setDetailViewer((prev) => ({ ...prev, currentIndex: idx }))}
        onToggleFavorite={onToggleFavorite}
        onLock={onLockMedia}
        onUnlock={onUnlockMedia}
        onOrganize={onOrganizeMedia}
        onDelete={onDeleteMedia}
        onRename={onRenameMedia}
      />

      {/* Long-Press Mobile Context Menu (Bottom Sheet) */}
      <MediaContextMenu
        isOpen={Boolean(contextMenuMedia)}
        onClose={() => setContextMenuMedia(null)}
        media={contextMenuMedia}
        isMobile={true}
        isVault={currentTab === 'vault'}
        onToggleFavorite={onToggleFavorite}
        onLock={onLockMedia}
        onUnlock={onUnlockMedia}
        onOrganize={onOrganizeMedia}
        onRename={onRenameMedia}
        onDelete={onDeleteMedia}
        onShowDetail={(media) => setDetailModalMedia(media)}
      />

      {/* Media Detail Metadata Modal */}
      <MediaDetailModal
        isOpen={Boolean(detailModalMedia)}
        onClose={() => setDetailModalMedia(null)}
        media={detailModalMedia}
      />

      {/* Avatar Modal */}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onUpdated={refreshUser}
      />
    </div>
  );
}
