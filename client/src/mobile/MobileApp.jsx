import React, { useState } from 'react';
import {
  Cloud, Image, Film, Folder, Shield, ShieldCheck, Server,
  Upload, Search, User, X, LogOut, ArrowUpCircle, HardDrive, Wifi
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import MobileGalleryView from './MobileGalleryView';
import MobileVideoHubView from './MobileVideoHubView';
import MobileAlbumsView from './MobileAlbumsView';
import MobileVaultView from './MobileVaultView';
import MobileAdminView from './MobileAdminView';
import QuotaBar from '../components/QuotaBar';
import { formatBytes } from '../components/QuotaBar';

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
  const { user, logout } = useAuth();
  const { isUnlocked, remainingSeconds } = useVault();

  const [currentTab, setTab] = useState('gallery'); // 'gallery', 'videos', 'albums', 'vault', 'admin'
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  const navItems = [
    { id: 'gallery', label: 'Galeri', icon: Image },
    { id: 'videos', label: 'Video', icon: Film },
    { id: 'albums', label: 'Album', icon: Folder },
    {
      id: 'vault',
      label: 'Brankas',
      icon: isUnlocked ? ShieldCheck : Shield,
      badge: isUnlocked ? `${remainingSeconds}s` : null
    },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Server });
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col text-[#1C1917] selection:bg-[#FDF6EC] selection:text-[#C2410C]">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFBF5] border-b-2 border-[#D6D3D1] px-4 h-14 flex items-center justify-between shadow-none">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center border border-[#9A3412]">
            <Cloud className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-[#1C1917] tracking-tight leading-none">
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
              showSearch ? 'bg-[#FDF6EC] text-[#C2410C]' : 'text-[#57534E] hover:text-[#1C1917]'
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

          <button
            onClick={() => setProfileDrawerOpen(true)}
            className="w-8 h-8 rounded-full bg-[#D4A373] text-[#1C1917] font-semibold text-[13px] flex items-center justify-center font-serif border border-[#D6D3D1] ml-1"
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </button>
        </div>
      </header>

      {/* Expandable Search Input on Mobile */}
      {showSearch && (
        <div className="p-3 bg-white border-b border-[#D6D3D1] animate-in slide-in-from-top-1 duration-150">
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
      <main className="flex-1 w-full">
        {currentTab === 'gallery' && (
          <MobileGalleryView
            searchQuery={searchQuery}
            onOpenViewer={onOpenViewer}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
          />
        )}

        {currentTab === 'videos' && (
          <MobileVideoHubView
            onOpenViewer={onOpenViewer}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
          />
        )}

        {currentTab === 'albums' && (
          <MobileAlbumsView
            onOpenViewer={onOpenViewer}
            onToggleFavorite={onToggleFavorite}
            onLock={onLockMedia}
            onOrganize={onOrganizeMedia}
            onDelete={onDeleteMedia}
            onRename={onRenameMedia}
          />
        )}

        {currentTab === 'vault' && (
          <MobileVaultView
            onOpenViewer={onOpenViewer}
            onUnlockMedia={onUnlockMedia}
            onDeleteMedia={onDeleteMedia}
            onRenameMedia={onRenameMedia}
          />
        )}

        {currentTab === 'admin' && user?.role === 'admin' && (
          <MobileAdminView />
        )}
      </main>

      {/* Bottom Navigation Bar (Thumb-Friendly Tab Bar) */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-[#FFFBF5] border-t-2 border-[#D6D3D1] z-40 flex items-center justify-around px-2">
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
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
                isActive ? 'text-[#C2410C]' : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 text-[9px] font-mono font-bold bg-[#22C55E] text-white px-1 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User Profile & Quota Bottom Sheet (Drawer) */}
      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[#1C1917]/30 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-t-2 border-[#D6D3D1] rounded-t-[12px] p-5 shadow-modal animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E5E4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#D4A373] text-[#1C1917] font-serif font-bold text-lg flex items-center justify-center">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-base text-[#1C1917] leading-none">
                    {user?.username}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#C2410C] bg-[#FAF1E6] px-1.5 py-0.2 rounded border border-[#D4A373] mt-1 inline-block">
                    {user?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setProfileDrawerOpen(false)}
                className="p-1.5 text-[#57534E] hover:text-[#1C1917]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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

            {/* Server IP Info */}
            <div className="p-3 bg-[#FFFBF5] border border-[#E7E5E4] rounded-[6px] mb-4 text-[12px] text-[#57534E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#22C55E]" />
                <span>Alamat Host Server:</span>
              </div>
              <strong className="font-mono text-[#1C1917]">192.168.18.78:8080</strong>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setProfileDrawerOpen(false);
                logout();
              }}
              className="w-full btn-destructive h-[42px] text-[14px] justify-center mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

