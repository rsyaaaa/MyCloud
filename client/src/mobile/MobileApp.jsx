import React, { useState } from 'react';
import {
  Cloud, Image, Film, Folder, Shield, ShieldCheck, Server,
  Upload, Search, User, X, LogOut, ArrowUpCircle, HardDrive, Wifi,
  Moon, Sun, Trash2, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useTheme } from '../context/ThemeContext';
import MobileGalleryView from './MobileGalleryView';
import MobileVideoHubView from './MobileVideoHubView';
import MobileAlbumsView from './MobileAlbumsView';
import MobileVaultView from './MobileVaultView';
import MobileAdminView from './MobileAdminView';
import MobileTrashView from './MobileTrashView';
import MobileMediaDetailView from './MobileMediaDetailView';
import MediaContextMenu from '../components/MediaContextMenu';
import MediaDetailModal from '../components/MediaDetailModal';
import AvatarModal from '../components/AvatarModal';
import QuotaBar from '../components/QuotaBar';
import { api } from '../api';

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

  const [currentTab, setCurrentTabState] = useState('gallery'); // 'gallery', 'videos', 'albums', 'vault', 'trash', 'admin'
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

  const navItems = [
    { id: 'gallery', label: 'Galeri', icon: Image },
    { id: 'videos', label: 'Video', icon: Film },
    { id: 'albums', label: 'Album', icon: Folder },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Server });
  }

  // Open full-screen dedicated mobile media viewer
  const handleMobileOpenViewer = (list, index, isVault = false, vaultToken = null) => {
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
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#171514] flex flex-col text-[#1C1917] dark:text-[#F5F2EB] selection:bg-[#FDF6EC] selection:text-[#C2410C] transition-colors">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFBF5] dark:bg-[#1E1B19] border-b-2 border-[#D6D3D1] dark:border-[#3E3834] px-4 h-14 flex items-center justify-between shadow-none transition-colors">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center border border-[#9A3412]">
            <Cloud className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-[#1C1917] dark:text-[#F5F2EB] tracking-tight leading-none">
              MyCloud
            </h1>
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#D4A373]">
              Private NAS
            </span>
          </div>
        </div>

        {/* Right actions: Search toggle, Upload, Profile Avatar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-[4px] transition-colors ${
              showSearch ? 'bg-[#FDF6EC] dark:bg-[#2E2A26] text-[#C2410C]' : 'text-[#57534E] dark:text-[#A8A29E]'
            }`}
            title="Cari"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenUpload}
            className="btn-primary h-8 px-2.5 text-[12px]"
            title="Unggah Media"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah</span>
          </button>

          {/* User Avatar Circle */}
          <button
            onClick={() => setProfileDrawerOpen(true)}
            className="w-8 h-8 rounded-full border border-[#D4A373] overflow-hidden ml-1 active:scale-95 transition-transform"
          >
            <img
              src={avatarUrl}
              alt={user?.username}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* Expandable Search Input on Mobile */}
      {showSearch && (
        <div className="p-3 bg-white dark:bg-[#23201D] border-b border-[#D6D3D1] dark:border-[#3E3834] animate-enter">
          <div className="relative">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Cari foto, video, judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-artisan w-full pl-9 h-9 text-[13px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#1C1917]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Mobile Screen View Area */}
      <main className="flex-1 w-full animate-enter">
        {currentTab === 'gallery' && (
          <MobileGalleryView
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

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-[#FFFBF5] dark:bg-[#1E1B19] border-t-2 border-[#D6D3D1] dark:border-[#3E3834] z-40 flex items-center justify-around px-2 transition-colors">
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
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isActive ? 'text-[#C2410C]' : 'text-[#57534E] dark:text-[#A8A29E]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className={`text-[11px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User Profile & Avatar Menu Bottom Sheet (Drawer) */}
      {profileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150"
          onClick={() => setProfileDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#23201D] border-t-2 border-[#D6D3D1] dark:border-[#3E3834] rounded-t-[16px] p-5 shadow-modal animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto text-[#1C1917] dark:text-[#F5F2EB]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E5E4] dark:border-[#3E3834]">
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
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#D4A373]"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-none">
                    {user?.username}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#C2410C] bg-[#FAF1E6] dark:bg-[#2E2A26] px-1.5 py-0.2 rounded border border-[#D4A373] mt-1 inline-block">
                    {user?.role === 'admin' ? 'Administrator' : 'User'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setProfileDrawerOpen(false)}
                className="p-1.5 text-[#57534E] dark:text-[#A8A29E]"
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
            <div className="space-y-1 mb-4 border-t border-b border-[#E7E5E4] dark:border-[#3E3834] py-2">
              {/* Dark Mode Switch */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#57534E]" />}
                  <span>{isDark ? 'Mode Terang' : 'Mode Gelap (Dark)'}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF1E6] dark:bg-[#3E3834] text-[#C2410C]">
                  {isDark ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Brankas Terkunci (Vault Link in Avatar Menu) */}
              <button
                onClick={() => {
                  setProfileDrawerOpen(false);
                  setTab('vault');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  {isUnlocked ? (
                    <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                  ) : (
                    <Shield className="w-4 h-4 text-[#C2410C]" />
                  )}
                  <span>Brankas Terkunci</span>
                </div>
                {isUnlocked ? (
                  <span className="text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] dark:bg-[#143D14] dark:text-[#86EFAC] px-1.5 py-0.2 rounded">
                    Terbuka {remainingSeconds}s
                  </span>
                ) : (
                  <span className="text-[11px] text-[#A8A29E]">Terkunci</span>
                )}
              </button>

              {/* Tempat Sampah (Trash Link) */}
              <button
                onClick={() => {
                  setProfileDrawerOpen(false);
                  setTab('trash');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] text-[13px]"
              >
                <div className="flex items-center gap-2.5 text-[#DC2626]">
                  <Trash2 className="w-4 h-4" />
                  <span>Tempat Sampah (Trash)</span>
                </div>
              </button>
            </div>

            {/* Server IP Info */}
            <div className="p-3 bg-[#FFFBF5] dark:bg-[#2E2A26] border border-[#E7E5E4] dark:border-[#3E3834] rounded-[6px] mb-3 text-[12px] text-[#57534E] dark:text-[#A8A29E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#22C55E]" />
                <span>Host Server:</span>
              </div>
              <strong className="font-mono text-[#1C1917] dark:text-[#F5F2EB]">192.168.18.78:8080</strong>
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
