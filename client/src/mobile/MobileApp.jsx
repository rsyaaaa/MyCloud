import React, { useState } from 'react';
import {
  Cloud, Home, Images, Image, Film, Folder, Shield, ShieldCheck, Server,
  Upload, Search, User, X, LogOut, ArrowUpCircle, HardDrive, Wifi,
  Moon, Sun, Trash2, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import MobileHomeView from './MobileHomeView';
import MobileGalleryView from './MobileGalleryView';
import MobileVideoHubView from './MobileVideoHubView';
import MobileAllFilesView from './MobileAllFilesView';
import MobileAlbumsView from './MobileAlbumsView';
import MobileVaultView from './MobileVaultView';
import MobileAdminView from './MobileAdminView';
import MobileTrashView from './MobileTrashView';
import MobileSearchView from './MobileSearchView';
import MobileMediaDetailView from './MobileMediaDetailView';
import MediaContextMenu from '../components/MediaContextMenu';
import MediaDetailModal from '../components/MediaDetailModal';
import AvatarModal from '../components/AvatarModal';
import QuotaBar from '../components/QuotaBar';
import { api } from '../api';
import { recordRecentItem } from '../utils/recentHistory';

export default function MobileApp({
  onOpenUpload,
  onOpenQuotaModal,
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

  const [currentTab, setCurrentTabState] = useState('home'); // 'home', 'gallery', 'videos', 'albums', 'vault', 'trash', 'admin'
  const [gallerySubView, setGallerySubView] = useState('all'); // 'all', 'photo', 'video'
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

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
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const setTab = (newTab) => {
    setCurrentTabState(newTab);
    notifyTabChange(newTab);
  };

  const handleNavigate = (tab, subView = 'all', folderId = null) => {
    if (subView) setGallerySubView(subView);
    setTab(tab);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'gallery', label: 'Galeri', icon: Images },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'allfiles', label: 'All Files', icon: Folder },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

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
          />
        )}

        {currentTab === 'gallery' && (
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
          <MobileAdminView />
        )}
      </main>

      {/* Floating Action Button (FAB) - Upload */}
      <button
        onClick={onOpenUpload}
        className="fixed bottom-[86px] right-4 z-40 bg-[#C2410C] hover:bg-[#EA580C] text-white h-12 px-6 rounded-full shadow-[0_8px_25px_rgba(194,65,12,0.40)] flex items-center justify-center gap-2.5 active:scale-95 transition-all text-[14px] font-semibold tracking-wide select-none"
        title="Upload Media"
      >
        <Upload className="w-4 h-4 stroke-[2.3]" />
        <span>Upload</span>
      </button>

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
                    {user?.username}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#C2410C] bg-[#FFF7ED] dark:bg-[#2A1208] px-1.5 py-0.5 rounded border border-[#C2410C]/20 mt-1 inline-block">
                    {user?.role === 'admin' ? 'Administrator' : 'User'}
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
              <span>Ganti Foto Profil</span>
            </button>

            {/* Quota Widget */}
            <div className="mb-4">
              <QuotaBar
                usedBytes={user?.used_storage_bytes || 0}
                quotaBytes={user?.storage_quota_bytes || 1}
                onRequestIncrease={() => {
                  setProfileDrawerOpen(false);
                  onOpenQuotaModal();
                }}
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
                  <span>{isDark ? 'Mode Terang' : 'Mode Gelap (AMOLED)'}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C]">
                  {isDark ? 'ON' : 'OFF'}
                </span>
              </button>

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
                  <span>Brankas Terkunci</span>
                </div>
                {isUnlocked ? (
                  <span className="text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#059669] dark:bg-[#062817] dark:text-[#10B981] px-1.5 py-0.5 rounded border border-[#10B981]/20">
                    Terbuka {remainingSeconds}s
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
                  <span>Tempat Sampah (Trash)</span>
                </div>
              </button>

              {/* Admin Dashboard (jika admin) */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setProfileDrawerOpen(false);
                    setTab('admin');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[13px]"
                >
                  <div className="flex items-center gap-2.5 text-[#C2410C]">
                    <Server className="w-4 h-4" />
                    <span>Admin Dashboard</span>
                  </div>
                </button>
              )}
            </div>

            {/* Server IP Info */}
            <div className="p-3 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] mb-3 text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#10B981]" />
                <span>Host Server:</span>
              </div>
              <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">192.168.18.78:8080</strong>
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
              <span>Keluar (Logout)</span>
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
