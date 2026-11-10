import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud, Home, Images, Image, Film, Folder, Shield, ShieldCheck, Server,
  Upload, Search, User, X, LogOut, ArrowUpCircle, HardDrive, Wifi,
  Moon, Sun, Trash2, Camera, Languages, Terminal as TerminalIcon, ArrowUp, ArrowUpDown, ChevronLeft,
  Smartphone, Download, Sparkles
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
import NetworkBadge from '../components/NetworkBadge';
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
  const { activeTransfersCount, isUploading, isDownloading, hasFailure, startUpload } = useTransfer();
  const directFileInputRef = useRef(null);

  const isNativeApk = typeof window !== 'undefined' && (Boolean(window.AndroidBridge) || (navigator.userAgent && navigator.userAgent.includes('MyCloudApp')));

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

  // APK In-App Auto Update State & Handlers
  const [apkUpdate, setApkUpdate] = useState(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // 0. Auto-check APK update when running inside native mobile APK
  useEffect(() => {
    if (!isNativeApk) return;

    const checkApkUpdate = async () => {
      try {
        const res = await fetch('/api/app-version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();

        let currentCode = 6;
        if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.getAppVersionCode === 'function') {
          currentCode = window.AndroidBridge.getAppVersionCode();
        }

        let currentName = '1.0.5';
        if (typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.getAppVersionName === 'function') {
          currentName = window.AndroidBridge.getAppVersionName();
        }

        // Compare versionCode
        if (data && typeof data.versionCode === 'number' && data.versionCode > currentCode) {
          // Check if dismissed in this browser session
          const dismissedVersion = sessionStorage.getItem('mycloud_dismissed_apk_version');
          if (dismissedVersion !== String(data.versionCode)) {
            setApkUpdate({
              ...data,
              currentCode,
              currentName
            });
          }
        }
      } catch (err) {
        console.warn('Gagal memeriksa pembaruan APK:', err);
      }
    };

    // Small delay to ensure bridge and page are fully ready
    const timer = setTimeout(checkApkUpdate, 1200);
    return () => clearTimeout(timer);
  }, [isNativeApk]);

  // Global listener for Android Bridge download progress
  useEffect(() => {
    window.onApkUpdateProgress = (progress) => {
      setUpdateDownloading(true);
      setUpdateProgress(progress);
      if (progress >= 100) {
        setTimeout(() => {
          setUpdateDownloading(false);
        }, 1500);
      }
    };

    window.onApkUpdateError = (msg) => {
      setUpdateDownloading(false);
      setUpdateProgress(0);
      alert('Gagal mengunduh pembaruan APK: ' + msg);
    };

    return () => {
      delete window.onApkUpdateProgress;
      delete window.onApkUpdateError;
    };
  }, []);

  const hasNativeInstaller = typeof window !== 'undefined' && window.AndroidBridge && typeof window.AndroidBridge.downloadAndInstall === 'function';

  const handleStartUpdate = () => {
    if (!apkUpdate) return;

    if (hasNativeInstaller) {
      setUpdateDownloading(true);
      setUpdateProgress(5);
      window.AndroidBridge.downloadAndInstall(apkUpdate.downloadUrl || '/download/MyCloud.apk');
    } else {
      // For older v1.0.5 APK without in-app installer bridge, copy link and open
      const fullUrl = window.location.origin + (apkUpdate.downloadUrl || '/download/MyCloud.apk');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullUrl).catch(() => {});
      }
      alert('Link unduhan disalin:\n' + fullUrl + '\n\nBuka Google Chrome di HP Anda dan buka link tersebut untuk memasang APK v1.0.7 sekali ini saja.');
    }
  };

  const handleDismissUpdate = () => {
    if (apkUpdate) {
      sessionStorage.setItem('mycloud_dismissed_apk_version', String(apkUpdate.versionCode));
    }
    setApkUpdate(null);
  };

  // Mobile Navbar Auto-Hide on Scroll (Strictly disabled on 'home' tab)
  const [showNavbar, setShowNavbar] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    // If on home tab, navbar is ALWAYS fixed and NEVER hides
    if (currentTab === 'home') {
      setShowNavbar(true);
      return;
    }

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const diff = currentScrollY - lastScrollYRef.current;

        // When near top (<= 30px), always show navbar
        if (currentScrollY <= 30) {
          setShowNavbar(true);
        } else if (diff > 8) {
          // Scrolling down -> hide navbar with animation
          setShowNavbar(false);
        } else if (diff < -8) {
          // Scrolling up -> reveal navbar with animation
          setShowNavbar(true);
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentTab]);

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

  // References to preserve latest state in popstate listener without closures
  const historyDepthRef = useRef(0);
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;
  const detailViewerRef = useRef(detailViewer);
  detailViewerRef.current = detailViewer;
  const pagelistDrawerOpenRef = useRef(pagelistDrawerOpen);
  pagelistDrawerOpenRef.current = pagelistDrawerOpen;
  const profileDrawerOpenRef = useRef(profileDrawerOpen);
  profileDrawerOpenRef.current = profileDrawerOpen;
  const contextMenuMediaRef = useRef(contextMenuMedia);
  contextMenuMediaRef.current = contextMenuMedia;
  const detailModalMediaRef = useRef(detailModalMedia);
  detailModalMediaRef.current = detailModalMedia;
  const avatarModalOpenRef = useRef(avatarModalOpen);
  avatarModalOpenRef.current = avatarModalOpen;

  // Initialize root history state & manual scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    if (!window.history.state || !window.history.state.tab) {
      window.history.replaceState({ type: 'tab', tab: 'home', depth: 0 }, '', window.location.pathname);
      historyDepthRef.current = 0;
    } else {
      historyDepthRef.current = typeof window.history.state.depth === 'number' ? window.history.state.depth : 0;
      if (window.history.state.tab) {
        setCurrentTabState(window.history.state.tab);
      }
    }
  }, []);

  const setTab = (newTab) => {
    if (newTab === currentTabRef.current) return;

    setIsSelectionMode(false);
    setPreviousTab(currentTabRef.current);
    setCurrentTabState(newTab);
    localStorage.setItem('mycloud_active_tab', newTab);
    notifyTabChange(newTab);

    if (newTab === 'home') {
      historyDepthRef.current = 0;
      window.history.replaceState({ type: 'tab', tab: 'home', depth: 0 }, '', window.location.pathname);
    } else {
      const nextDepth = (historyDepthRef.current || 0) + 1;
      historyDepthRef.current = nextDepth;
      window.history.pushState({ type: 'tab', tab: newTab, depth: nextDepth }, '', '#' + newTab);
    }
  };

  // Helper functions with history state integration
  const openPagelistDrawer = () => {
    const nextDepth = (historyDepthRef.current || 0) + 1;
    historyDepthRef.current = nextDepth;
    window.history.pushState({ type: 'drawer', name: 'pagelist', tab: currentTabRef.current, depth: nextDepth }, '', '#menu');
    setPagelistDrawerOpen(true);
  };
  const closePagelistDrawer = () => {
    if (!pagelistDrawerOpenRef.current) return;
    setPagelistDrawerOpen(false);
    if (window.history.state?.type === 'drawer' && window.history.state?.name === 'pagelist') {
      window.history.back();
    }
  };

  const openProfileDrawer = () => {
    const nextDepth = (historyDepthRef.current || 0) + 1;
    historyDepthRef.current = nextDepth;
    window.history.pushState({ type: 'drawer', name: 'profile', tab: currentTabRef.current, depth: nextDepth }, '', '#profile');
    setProfileDrawerOpen(true);
  };
  const closeProfileDrawer = () => {
    if (!profileDrawerOpenRef.current) return;
    setProfileDrawerOpen(false);
    if (window.history.state?.type === 'drawer' && window.history.state?.name === 'profile') {
      window.history.back();
    }
  };

  const openContextMenu = (media) => {
    const nextDepth = (historyDepthRef.current || 0) + 1;
    historyDepthRef.current = nextDepth;
    window.history.pushState({ type: 'modal', name: 'context', tab: currentTabRef.current, depth: nextDepth }, '', '#action');
    setContextMenuMedia(media);
  };
  const closeContextMenu = () => {
    if (!contextMenuMediaRef.current) return;
    setContextMenuMedia(null);
    if (window.history.state?.type === 'modal' && window.history.state?.name === 'context') {
      window.history.back();
    }
  };

  const openDetailModal = (media) => {
    if (contextMenuMediaRef.current) {
      setContextMenuMedia(null);
      window.history.replaceState({ type: 'modal', name: 'detail', tab: currentTabRef.current, depth: historyDepthRef.current }, '', '#info');
      setDetailModalMedia(media);
      return;
    }
    const nextDepth = (historyDepthRef.current || 0) + 1;
    historyDepthRef.current = nextDepth;
    window.history.pushState({ type: 'modal', name: 'detail', tab: currentTabRef.current, depth: nextDepth }, '', '#info');
    setDetailModalMedia(media);
  };
  const closeDetailModal = () => {
    if (!detailModalMediaRef.current) return;
    setDetailModalMedia(null);
    if (window.history.state?.type === 'modal' && window.history.state?.name === 'detail') {
      window.history.back();
    }
  };

  const openAvatarModal = () => {
    const nextDepth = (historyDepthRef.current || 0) + 1;
    historyDepthRef.current = nextDepth;
    window.history.pushState({ type: 'modal', name: 'avatar', tab: currentTabRef.current, depth: nextDepth }, '', '#avatar');
    setAvatarModalOpen(true);
  };
  const closeAvatarModal = () => {
    if (!avatarModalOpenRef.current) return;
    setAvatarModalOpen(false);
    if (window.history.state?.type === 'modal' && window.history.state?.name === 'avatar') {
      window.history.back();
    }
  };

  // Open full-screen dedicated mobile media viewer with history state
  const handleMobileOpenViewer = (list, index, isVault = false, vaultToken = null) => {
    if (list && list[index]) {
      recordRecentItem(list[index]);
    }
    const nextDepth = (historyDepthRef.current || 0) + 1;
    historyDepthRef.current = nextDepth;
    window.history.pushState({ type: 'viewer', tab: currentTabRef.current, depth: nextDepth }, '', '#viewer');
    setDetailViewer({
      isOpen: true,
      mediaList: list,
      currentIndex: index,
      isVault,
      vaultToken
    });
  };
  const closeMobileViewer = () => {
    setDetailViewer((prev) => ({ ...prev, isOpen: false }));
  };

  // Central Popstate Listener for Back Navigation
  useEffect(() => {
    const handlePopState = (e) => {
      // 1. Modals & Drawers have priority
      if (avatarModalOpenRef.current) {
        setAvatarModalOpen(false);
        return;
      }
      if (detailModalMediaRef.current) {
        setDetailModalMedia(null);
        return;
      }
      if (contextMenuMediaRef.current) {
        setContextMenuMedia(null);
        return;
      }
      if (profileDrawerOpenRef.current) {
        setProfileDrawerOpen(false);
        return;
      }
      if (pagelistDrawerOpenRef.current) {
        setPagelistDrawerOpen(false);
        return;
      }
      if (detailViewerRef.current.isOpen) {
        setDetailViewer((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      // If already on Home and popstate occurs, trigger double-back exit
      if (currentTabRef.current === 'home') {
        if (window.AndroidBridge && window.AndroidBridge.exitApp) {
          window.AndroidBridge.exitApp();
        }
        return;
      }

      // 2. Tab Navigation - ignore internal modal/folder/selection back states
      const targetState = e.state || {};
      if (
        targetState.type === 'modal' ||
        targetState.type === 'drawer' ||
        targetState.type === 'folder' ||
        targetState.type === 'selection' ||
        targetState.type === 'viewer_subsheet'
      ) {
        return;
      }

      const targetTab = targetState.tab;
      if (!targetTab) {
        // If state has no tab property, do not bounce to 'home'
        return;
      }

      const targetDepth = typeof targetState.depth === 'number' ? targetState.depth : 0;
      historyDepthRef.current = targetDepth;

      if (targetTab !== currentTabRef.current) {
        setPreviousTab(currentTabRef.current);
        setCurrentTabState(targetTab);
        localStorage.setItem('mycloud_active_tab', targetTab);
        notifyTabChange(targetTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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


  const avatarUrl = api.getAvatarUrl(user);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0B0B0E] flex flex-col text-[#0A0A0A] dark:text-[#F4F4F5] selection:bg-[#FFEDD5] selection:text-[#C2410C] transition-colors">
      {/* Mobile Top App Bar (Always present on all tabs except allfiles root, which has its own Drive header) */}
      {currentTab !== 'allfiles' && (
        <header
          className={`sticky top-0 z-40 bg-white/90 dark:bg-[#0E0E12]/95 backdrop-blur-md border-b border-[#E8E8EC] dark:border-[#1E1E26] px-4 h-14 flex items-center justify-between shadow-none transition-transform duration-300 ease-in-out ${
            !isSelectionMode && (currentTab === 'home' || showNavbar)
              ? 'translate-y-0'
              : '-translate-y-full pointer-events-none'
          }`}
        >
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
              onClick={openPagelistDrawer}
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

          {/* Right actions: Network Badge + Transfer List + Profile Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Adaptive Network Connection Badge */}
            <NetworkBadge isMobile={true} />

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
              onClick={openProfileDrawer}
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
      <main className="flex-1 w-full">
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
            showNavbar={showNavbar}
            onSelectionChange={setIsSelectionMode}
            onOpenViewer={handleMobileOpenViewer}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={openContextMenu}
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
            onLongPress={openContextMenu}
          />
        )}

        {currentTab === 'allfiles' && (
          <MobileAllFilesView
            showNavbar={showNavbar}
            onSelectionChange={setIsSelectionMode}
            onOpenViewer={handleMobileOpenViewer}
            onOpenText={onOpenText}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
            onLongPress={openContextMenu}
            onOpenUpload={onOpenUpload}
            onFolderChange={setActiveFolder}
            onOpenProfile={openProfileDrawer}
            onOpenPagelist={openPagelistDrawer}
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
            onLongPress={openContextMenu}
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
            onLongPress={openContextMenu}
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
            onLongPress={openContextMenu}
          />
        )}

        {currentTab === 'vault' && user?.role !== 'admin' && (
          <MobileVaultView
            onOpenViewer={handleMobileOpenViewer}
            onUnlockMedia={onUnlockMedia}
            onDeleteMedia={onDeleteMedia}
            onRenameMedia={onRenameMedia}
            onLongPress={openContextMenu}
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
        <>
          <input
            ref={directFileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files || []);
              if (picked.length > 0) {
                startUpload(picked, activeFolder);
              }
              e.target.value = '';
            }}
          />
          <MobileFloatingTransferButton
            show={!isSelectionMode && (currentTab === 'home' || showNavbar)}
            onClickUpload={() => directFileInputRef.current?.click()}
            onClickTransferList={() => {
              setPreviousTab(currentTab);
              setTab('transfer');
            }}
          />
        </>
      )}

      {/* Floating Bottom Navigation Bar (Auto-hides on scroll down on non-home pages) */}
      <nav
        className={`fixed bottom-3 inset-x-3 sm:inset-x-6 max-w-md mx-auto h-[62px] bg-white/95 dark:bg-[#121217]/95 backdrop-blur-xl border border-[#E8E8EC] dark:border-[#20202A] rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.10)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.60)] z-40 flex items-center justify-around px-2 transition-all duration-300 ease-in-out ${
          !isSelectionMode && (currentTab === 'home' || showNavbar)
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
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
          onClick={closePagelistDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[290px] sm:w-[320px] max-w-[85vw] h-full bg-white dark:bg-[#0E0E12] border-r border-[#E8E8EC] dark:border-[#1F1F27] shadow-2xl flex flex-col animate-in slide-in-from-left duration-250"
          >
            <Sidebar
              currentTab={currentTab}
              setTab={(tab) => {
                if (window.history.state?.type === 'drawer') {
                  window.history.replaceState({ type: 'tab', tab, depth: historyDepthRef.current }, '', '#' + tab);
                  setPreviousTab(currentTabRef.current);
                  setCurrentTabState(tab);
                  localStorage.setItem('mycloud_active_tab', tab);
                  notifyTabChange(tab);
                  setPagelistDrawerOpen(false);
                } else {
                  setTab(tab);
                  setPagelistDrawerOpen(false);
                }
              }}
              onHide={closePagelistDrawer}
              onOpenAvatarModal={() => {
                setPagelistDrawerOpen(false);
                openAvatarModal();
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
          onClick={closeProfileDrawer}
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
                onClick={closeProfileDrawer}
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

            {/* 2. Host Server & Network Info */}
            <div className="px-3.5 py-2.5 bg-[#F8F9FA] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#262636] rounded-[14px] text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#10B981]" />
                <span>{t('networkModeLabel', 'Mode Jaringan')}:</span>
              </div>
              <NetworkBadge isMobile={true} />
            </div>

            {/* Download Android Native APK Button */}
            <a
              href="/download/MyCloud.apk"
              download="MyCloud.apk"
              className="flex items-center justify-between px-3.5 py-2.5 bg-[#FFF7ED] dark:bg-[#1F130B] border border-[#C2410C]/30 rounded-[14px] text-[13px] font-medium text-[#C2410C] hover:bg-[#FFEDD5] dark:hover:bg-[#2F1D11] active:scale-98 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#C2410C]" />
                <span>Unduh APK Terbaru (v1.0.7)</span>
              </div>
              <Download className="w-4 h-4 text-[#C2410C]" />
            </a>

            {/* 3. Fitur Switch User di Perangkat */}
            <div className="border border-[#E8E8EC] dark:border-[#262636] rounded-[16px] bg-[#F8F9FA] dark:bg-[#1A1A24] overflow-hidden">
              <SwitchUserSection onAfterSwitch={closeProfileDrawer} />
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
        onClose={closeMobileViewer}
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
        onClose={closeContextMenu}
        media={contextMenuMedia}
        isMobile={true}
        isVault={currentTab === 'vault'}
        onToggleFavorite={onToggleFavorite}
        onLock={onLockMedia}
        onUnlock={onUnlockMedia}
        onOrganize={onOrganizeMedia}
        onRename={onRenameMedia}
        onDelete={onDeleteMedia}
        onShowDetail={(media) => openDetailModal(media)}
      />

      {/* Media Detail Metadata Modal */}
      <MediaDetailModal
        isOpen={Boolean(detailModalMedia)}
        onClose={closeDetailModal}
        media={detailModalMedia}
      />

      {/* Avatar Modal */}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={closeAvatarModal}
        onUpdated={refreshUser}
      />

      {/* In-App APK Auto-Update Pop-Up Dialog */}
      {apkUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#121218] border border-[#E8E8EC] dark:border-[#22222E] rounded-[24px] p-5 shadow-2xl animate-enter text-[#0A0A0A] dark:text-[#FAFAFA] relative overflow-hidden"
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#FB923C]" />

            {/* Header with Icon */}
            <div className="flex items-center gap-3.5 mb-3.5 pt-1">
              <div className="w-12 h-12 rounded-[16px] bg-[#FFF7ED] dark:bg-[#2A140A] border border-[#C2410C]/20 text-[#C2410C] flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[16px] leading-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
                  Pembaruan Tersedia!
                </h3>
                <p className="text-[11.5px] text-[#8E8E9E] mt-0.5">
                  Versi baru MyCloud siap dipasang
                </p>
              </div>
            </div>

            {/* Version Transition Box */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-[12px] bg-[#F4F4F6] dark:bg-[#181822] border border-[#E8E8EC] dark:border-[#252534] mb-3 text-[12px]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8E8E9E] block">Terpasang</span>
                <span className="font-mono font-semibold text-[#6B6B6B] dark:text-[#A1A1AA]">
                  v{apkUpdate.currentName || '1.0.5'}
                </span>
              </div>
              <div className="text-[#C2410C] font-bold text-base">➔</div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#C2410C] block">Terbaru</span>
                <span className="font-mono font-bold text-[#C2410C]">
                  v{apkUpdate.versionName}
                </span>
              </div>
            </div>

            {/* Release Notes */}
            {apkUpdate.releaseNotes && (
              <div className="p-3 rounded-[12px] bg-[#FFF7ED]/50 dark:bg-[#20130D] border border-[#C2410C]/15 mb-3 text-[12px] leading-relaxed text-[#0A0A0A] dark:text-[#E4E4E7]">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#C2410C] block mb-1">
                  Apa yang baru:
                </span>
                <p className="text-[12px] text-[#4A4A5A] dark:text-[#D4D4D8]">
                  {apkUpdate.releaseNotes}
                </p>
              </div>
            )}

            {/* Notice for v1.0.5 legacy APK */}
            {!hasNativeInstaller && (
              <div className="p-3 rounded-[12px] bg-[#FEF3C7] dark:bg-[#2A200A] border border-[#F59E0B]/30 mb-4 text-[11.5px] leading-relaxed text-[#92400E] dark:text-[#FCD34D]">
                <strong className="block mb-0.5 text-[#B45309] dark:text-[#FBBF24]">⚠️ Update Pertama Kali:</strong>
                Versi v1.0.5 di HP Anda belum memiliki modul auto-installer di dalam sistemnya. Silakan klik tombol di bawah untuk menyalin link unduhan dan buka di Chrome sekali ini saja. Mulai v1.0.7, seluruh update akan 100% otomatis di dalam aplikasi!
              </div>
            )}

            {/* Download Progress Bar */}
            {updateDownloading ? (
              <div className="space-y-2 mb-2">
                <div className="flex items-center justify-between text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                  <span>Mengunduh pembaruan...</span>
                  <span className="font-mono text-[#C2410C]">{updateProgress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#E8E8EC] dark:bg-[#252534] overflow-hidden">
                  <div
                    className="h-full bg-[#C2410C] transition-all duration-200 rounded-full"
                    style={{ width: `${Math.max(5, updateProgress)}%` }}
                  />
                </div>
                <p className="text-[10.5px] text-[#8E8E9E] text-center pt-1">
                  {updateProgress >= 100
                    ? 'Membuka installer paket...'
                    : 'Aplikasi akan otomatis membuka installer setelah selesai.'}
                </p>
              </div>
            ) : (
              /* Buttons */
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDismissUpdate}
                  className="flex-1 h-11 rounded-[12px] bg-[#F4F4F6] dark:bg-[#181822] border border-[#E8E8EC] dark:border-[#252534] font-semibold text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white active:scale-95 transition-all"
                >
                  Nanti Saja
                </button>
                <button
                  type="button"
                  onClick={handleStartUpdate}
                  className="flex-1 h-11 rounded-[12px] bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold text-[13px] flex items-center justify-center gap-1.5 shadow-md shadow-[#C2410C]/25 active:scale-95 transition-all text-center px-2"
                >
                  <Download className="w-4 h-4 stroke-[2.2] shrink-0" />
                  <span className="truncate">{hasNativeInstaller ? 'Update Sekarang' : 'Salin Link Unduh'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
