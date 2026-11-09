import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud, Home, Images, Image, Film, Folder, Shield, ShieldCheck, Server,
  Upload, Search, User, X, LogOut, ArrowUpCircle, HardDrive, Wifi,
  Moon, Sun, Trash2, Camera, Languages, Terminal as TerminalIcon, ArrowUp, ArrowUpDown, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTransfer } from '../context/TransferContext';
import TransferListView from '../components/TransferListView';
import MobileFloatingTransferButton from '../components/MobileFloatingTransferButton';
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
import QuotaBar, { formatBytes } from '../components/QuotaBar';
import SwitchUserSection from '../components/SwitchUserSection';
import Sidebar from '../components/Sidebar';
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
  const { activeTransfersCount, isUploading, isDownloading, hasFailure } = useTransfer();

  const [currentTab, setCurrentTabState] = useState(() => {
    return localStorage.getItem('mycloud_active_tab') || 'home';
  });
  const [previousTab, setPreviousTab] = useState('home');
  const [activeFolder, setActiveFolder] = useState(() => {
    try {
      const saved = localStorage.getItem('mycloud_active_folder');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [gallerySubView, setGallerySubView] = useState(() => {
    return localStorage.getItem('mycloud_gallery_subview') || 'all';
  });
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [pagelistDrawerOpen, setPagelistDrawerOpen] = useState(false);
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

  // Floating Upload Button Hide-on-scroll state
  const [showUploadBtn, setShowUploadBtn] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollYRef.current;
      if (diff > 8 && currentScrollY > 50) {
        setShowUploadBtn(false);
      } else if (diff < -8 || currentScrollY <= 50) {
        setShowUploadBtn(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    localStorage.setItem('mycloud_active_tab', newTab);
    notifyTabChange(newTab);
  };

  // Browser tab title follows the active menu.
  useEffect(() => {
    document.title = 'MyCloud';
  }, []);

  // Strict role check: admin shouldn't see gallery, user shouldn't see admin/terminal
  useEffect(() => {
    if (user?.role === 'admin' && currentTab === 'gallery') {
      setTab('home');
    } else if (user?.role !== 'admin' && (currentTab === 'admin' || currentTab === 'terminal')) {
      setTab('home');
    }
  }, [user?.role]);

  const handleNavigate = (tab, subView = 'all', folderId = null) => {
    if (subView) {
      setGallerySubView(subView);
      localStorage.setItem('mycloud_gallery_subview', subView);
    }
    if (folderId) {
      localStorage.setItem('mycloud_active_folder', JSON.stringify({ id: folderId }));
    }
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0B0B0E] flex flex-col text-[#0A0A0A] dark:text-[#F4F4F5] selection:bg-[#FFEDD5] selection:text-[#C2410C] transition-colors">
      {/* Mobile Top App Bar (Always present on all tabs except allfiles root, which has its own Drive header) */}
      {currentTab !== 'allfiles' && (
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0E0E12]/95 backdrop-blur-md border-b border-[#E8E8EC] dark:border-[#1E1E26] px-4 h-14 flex items-center justify-between shadow-none transition-colors">
          {/* Brand & Page Title */}
          {currentTab === 'transfer' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab(previousTab || 'home')}
                className="w-8 h-8 -ml-1.5 rounded-full flex items-center justify-center hover:bg-[#F4F4F6] dark:hover:bg-[#1A1A24] active:scale-90 text-[#0A0A0A] dark:text-[#FAFAFA] transition-all"
                title="Kembali"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.4]" />
              </button>
              <div className="w-8 h-8 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
                <Cloud className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h1 className="font-display font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight leading-none">
                Transfer List
              </h1>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPagelistDrawerOpen(true)}
              className="flex items-center gap-2 -ml-1 px-1.5 py-1 rounded-[10px] hover:bg-[#F4F4F6] dark:hover:bg-[#1A1A24] active:scale-95 transition-all text-left"
              title="Buka Pagelist / Menu"
            >
              <div className="w-8 h-8 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center shadow-sm">
                <Cloud className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h1 className="font-display font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight leading-none">
                MyCloud
              </h1>
            </button>
          )}

          {/* Right actions: Transfer List + Profile Avatar */}
          <div className="flex items-center gap-2">
            {/* Small round Transfer List trigger button to the left of the avatar */}
            {currentTab !== 'transfer' && (
              <button
                onClick={() => {
                  setPreviousTab(currentTab);
                  setTab('transfer');
                }}
                className="w-8 h-8 rounded-full border border-[#E8E8EC] dark:border-[#1F1F27] bg-white dark:bg-[#14141B] flex items-center justify-center text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#C2410C] dark:hover:text-[#EA580C] active:scale-95 transition-all relative"
                title="Transfer List"
              >
                <ArrowUpDown className="w-4 h-4 stroke-[2.2]" />
                {(activeTransfersCount > 0 || hasFailure) && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0E0E12] ${
                      hasFailure ? 'bg-[#EF4444]' : 'bg-[#C2410C]'
                    } animate-pulse`}
                  />
                )}
              </button>
            )}

            {/* User Avatar Circle */}
            <button
              onClick={() => setProfileDrawerOpen(true)}
              className="w-8 h-8 rounded-full border border-[#E8E8EC] dark:border-[#1F1F27] overflow-hidden ml-0.5 active:scale-95 transition-transform"
            >
              <img
                src={avatarUrl}
                alt={user?.username}
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </header>
      )}

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
            onOpenUpload={onOpenUpload}
            onFolderChange={setActiveFolder}
            onOpenProfile={() => setProfileDrawerOpen(true)}
            onOpenPagelist={() => setPagelistDrawerOpen(true)}
            onOpenTransferList={() => {
              setPreviousTab('allfiles');
              setTab('transfer');
            }}
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

        {currentTab === 'transfer' && (
          <TransferListView
            hideHeader={true}
            onBack={() => setTab(previousTab || 'home')}
            onOpenUpload={onOpenUpload}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) - Upload & Background Transfer Progress */}
      {currentTab !== 'terminal' && currentTab !== 'trash' && currentTab !== 'transfer' && currentTab !== 'allfiles' && !(user?.role === 'admin' && (currentTab === 'home' || currentTab === 'admin')) && (
        <MobileFloatingTransferButton
          show={showUploadBtn}
          onClickUpload={() => onOpenUpload(currentTab === 'allfiles' ? activeFolder : null)}
          onClickTransferList={() => {
            setPreviousTab(currentTab);
            setTab('transfer');
          }}
        />
      )}

      {/* Floating Bottom Navigation Bar (Always visible on mobile) */}
      <nav className="fixed bottom-3 inset-x-3 sm:inset-x-6 max-w-md mx-auto h-[62px] bg-white/95 dark:bg-[#121217]/95 backdrop-blur-xl border border-[#E8E8EC] dark:border-[#20202A] rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.10)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.60)] z-40 flex items-center justify-around px-2 transition-all">
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
                  ? 'text-[#C2410C] font-semibold bg-[#FFF7ED] dark:bg-[#25150D] dark:text-[#EA580C]'
                  : 'text-[#6B6B6B] dark:text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]'
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

      {/* Mobile Pagelist Drawer (Slides in from the left when clicking MyCloud in navbar) */}
      {pagelistDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-enter"
          onClick={() => setPagelistDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[290px] sm:w-[320px] max-w-[85vw] h-full bg-white dark:bg-[#0E0E12] border-r border-[#E8E8EC] dark:border-[#1F1F27] shadow-2xl flex flex-col animate-in slide-in-from-left duration-250"
          >
            <Sidebar
              currentTab={currentTab}
              setTab={(tab) => {
                setTab(tab);
                setPagelistDrawerOpen(false);
              }}
              onHide={() => setPagelistDrawerOpen(false)}
              onOpenAvatarModal={() => {
                setPagelistDrawerOpen(false);
                setAvatarModalOpen(true);
              }}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* User Profile & Avatar Menu Bottom Sheet (Drawer) */}
      {profileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setProfileDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#14141B] border-t border-[#E8E8EC] dark:border-[#22222E] rounded-t-[24px] p-5 pb-8 shadow-modal animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto text-[#0A0A0A] dark:text-[#FAFAFA] space-y-3"
          >
            {/* Drawer Drag Pill */}
            <div className="w-10 h-1 rounded-full bg-[#E8E8EC] dark:bg-[#2A2A38] mx-auto mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8EC] dark:border-[#20202A]">
              <h2 className="text-base font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                {t('userProfile', 'Profil Pengguna')}
              </h2>
              <button
                onClick={() => setProfileDrawerOpen(false)}
                className="p-1 rounded-full text-[#6B6B6B] dark:text-[#9C9C9C] hover:bg-[#F4F4F6] dark:hover:bg-[#1A1A24] active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Combined User Profile & Storage Capacity Card */}
            <div className="p-3.5 rounded-[16px] bg-[#F8F9FA] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#262636]">
              {/* Top: Avatar, Name, Role Badge */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={avatarUrl}
                  alt={user?.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#C2410C] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base leading-snug truncate">
                    {user?.username === 'public' ? 'Public User' : user?.username}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#C2410C] bg-[#FFF7ED] dark:bg-[#2A1208] px-2 py-0.5 rounded border border-[#C2410C]/20 mt-1 inline-block">
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
                const used = user?.role === 'admin' ? (adminDiskStats?.used ?? user?.used_storage_bytes ?? 0) : (user?.used_storage_bytes || 0);
                const quota = user?.role === 'admin' ? (adminDiskStats?.total ?? 500 * 1024 * 1024 * 1024) : (user?.storage_quota_bytes || 1);
                const pct = Math.min(100, Math.max(0, Math.round((used / quota) * 100)));

                return (
                  <div className="pt-3 border-t border-[#E8E8EC] dark:border-[#262636]">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">
                        <HardDrive className="w-3.5 h-3.5 text-[#C2410C]" />
                        <span>{t('storageCapacity', 'Storage Capacity')}</span>
                      </div>
                      <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border border-[#C2410C]/20">
                        {pct}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#E5E7EB] dark:bg-[#2A2A38] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C2410C] to-[#EA580C] transition-all duration-300"
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>

                    {/* Used vs Limit */}
                    <div className="flex justify-between items-center text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-2 font-mono">
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
            <div className="px-3.5 py-2.5 bg-[#F8F9FA] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#262636] rounded-[14px] text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#10B981]" />
                <span>{t('hostServer', 'Host Server')}:</span>
              </div>
              <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">192.168.18.78:8080</strong>
            </div>

            {/* 3. Fitur Switch User di Perangkat */}
            <div className="border border-[#E8E8EC] dark:border-[#262636] rounded-[16px] bg-[#F8F9FA] dark:bg-[#1A1A24] overflow-hidden">
              <SwitchUserSection onAfterSwitch={() => setProfileDrawerOpen(false)} />
            </div>

            {/* 4. Logout Button */}
            <button
              onClick={() => {
                setProfileDrawerOpen(false);
                logout();
              }}
              className="w-full btn-destructive h-[42px] text-[14px] justify-center rounded-[14px]"
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
