import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import GalleryPage from '../pages/GalleryPage';
import VideoHubPage from '../pages/VideoHubPage';
import VaultPage from '../pages/VaultPage';
import AlbumsPage from '../pages/AlbumsPage';
import AdminPage from '../pages/AdminPage';
import TrashPage from '../pages/TrashPage';
import MediaContextMenu from '../components/MediaContextMenu';
import MediaDetailModal from '../components/MediaDetailModal';
import AvatarModal from '../components/AvatarModal';

export default function DesktopApp({
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
  const { user, refreshUser } = useAuth();
  const { notifyTabChange } = useVault();
  const [currentTab, setCurrentTabState] = useState('gallery'); // 'gallery', 'videos', 'albums', 'vault', 'trash', 'admin'
  const [searchQuery, setSearchQuery] = useState('');

  // Context Menu & Modals
  const [contextMenu, setContextMenu] = useState({ isOpen: false, media: null, position: { x: 0, y: 0 } });
  const [detailModalMedia, setDetailModalMedia] = useState(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const setTab = (newTab) => {
    setCurrentTabState(newTab);
    notifyTabChange(newTab);
  };

  const handleOpenContextMenu = (e, media) => {
    setContextMenu({
      isOpen: true,
      media,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#000000] text-[#0A0A0A] dark:text-[#FAFAFA] transition-colors">
      {/* Top Navbar */}
      <Navbar
        onOpenUpload={onOpenUpload}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenQuotaModal={onOpenQuotaModal}
        onSelectTab={setTab}
        onOpenAvatarModal={() => setAvatarModalOpen(true)}
      />

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setTab={setTab}
          onRequestIncreaseQuota={onOpenQuotaModal}
        />

        {/* Main Desktop Content Area */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-64px)] animate-enter">
          {currentTab === 'gallery' && (
            <GalleryPage
              searchQuery={searchQuery}
              onOpenViewer={onOpenViewer}
              onToggleFavorite={onToggleFavorite}
              onLock={onLockMedia}
              onOrganize={onOrganizeMedia}
              onDelete={onDeleteMedia}
              onRename={onRenameMedia}
              onContextMenu={handleOpenContextMenu}
              onShowDetail={(media) => setDetailModalMedia(media)}
            />
          )}

          {currentTab === 'videos' && (
            <VideoHubPage
              onOpenViewer={onOpenViewer}
              onToggleFavorite={onToggleFavorite}
              onLock={onLockMedia}
              onOrganize={onOrganizeMedia}
              onDelete={onDeleteMedia}
              onRename={onRenameMedia}
              onContextMenu={handleOpenContextMenu}
              onShowDetail={(media) => setDetailModalMedia(media)}
            />
          )}

          {currentTab === 'albums' && (
            <AlbumsPage
              onOpenViewer={onOpenViewer}
              onToggleFavorite={onToggleFavorite}
              onLock={onLockMedia}
              onOrganize={onOrganizeMedia}
              onDelete={onDeleteMedia}
              onRename={onRenameMedia}
              onContextMenu={handleOpenContextMenu}
              onShowDetail={(media) => setDetailModalMedia(media)}
            />
          )}

          {currentTab === 'vault' && (
            <VaultPage
              onOpenViewer={onOpenViewer}
              onUnlockMedia={onUnlockMedia}
              onDeleteMedia={onDeleteMedia}
              onRenameMedia={onRenameMedia}
              onContextMenu={handleOpenContextMenu}
              onShowDetail={(media) => setDetailModalMedia(media)}
            />
          )}

          {currentTab === 'trash' && (
            <TrashPage onRefreshQuota={refreshUser} />
          )}

          {currentTab === 'admin' && user?.role === 'admin' && (
            <AdminPage />
          )}
        </main>
      </div>

      {/* Floating Right-Click Context Menu */}
      <MediaContextMenu
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        media={contextMenu.media}
        position={contextMenu.position}
        isMobile={false}
        isVault={currentTab === 'vault'}
        onToggleFavorite={onToggleFavorite}
        onLock={onLockMedia}
        onUnlock={onUnlockMedia}
        onOrganize={onOrganizeMedia}
        onRename={onRenameMedia}
        onDelete={onDeleteMedia}
        onShowDetail={(media) => setDetailModalMedia(media)}
      />

      {/* Media Detail Modal */}
      <MediaDetailModal
        isOpen={Boolean(detailModalMedia)}
        onClose={() => setDetailModalMedia(null)}
        media={detailModalMedia}
      />

      {/* Avatar Change Modal */}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onUpdated={refreshUser}
      />

      {/* Floating Action Button (FAB) - Upload */}
      <button
        onClick={onOpenUpload}
        className="fixed bottom-8 right-8 z-40 btn-primary h-12 px-5 rounded-full shadow-lg shadow-[#C2410C]/30 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all text-[14px] font-medium"
        title="Upload Media"
      >
        <Upload className="w-5 h-5 stroke-[2.2]" />
        <span>Upload</span>
      </button>
    </div>
  );
}
