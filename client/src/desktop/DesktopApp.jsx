import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useVault } from '../context/VaultContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import HomePage from '../pages/HomePage';
import GalleryPage from '../pages/GalleryPage';
import VideoHubPage from '../pages/VideoHubPage';
import AllFilesPage from '../pages/AllFilesPage';
import DocumentsPage from '../pages/DocumentsPage';
import VaultPage from '../pages/VaultPage';
import AlbumsPage from '../pages/AlbumsPage';
import AdminPage from '../pages/AdminPage';
import AdminHomeDashboard from '../components/AdminHomeDashboard';
import TerminalPage from '../pages/TerminalPage';
import TrashPage from '../pages/TrashPage';
import MediaContextMenu from '../components/MediaContextMenu';
import MediaDetailModal from '../components/MediaDetailModal';
import AvatarModal from '../components/AvatarModal';

export default function DesktopApp({
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
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const { notifyTabChange } = useVault();
  const [currentTab, setCurrentTabState] = useState(() => {
    return localStorage.getItem('mycloud_active_tab') || 'home';
  });
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
  const [searchQuery, setSearchQuery] = useState('');

  // Sidebar toggle state for desktop (persisted in localStorage)
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    return localStorage.getItem('desktop_sidebar_hidden') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarHidden((prev) => {
      const nextVal = !prev;
      localStorage.setItem('desktop_sidebar_hidden', String(nextVal));
      return nextVal;
    });
  };

  // Context Menu & Modals
  const [contextMenu, setContextMenu] = useState({ isOpen: false, media: null, position: { x: 0, y: 0 } });
  const [detailModalMedia, setDetailModalMedia] = useState(null);
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
        onSelectTab={setTab}
        onOpenAvatarModal={() => setAvatarModalOpen(true)}
        isSidebarHidden={isSidebarHidden}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex flex-1 relative">
        {/* Left Sidebar (Pagelist) - Sticky & Collapsible */}
        {!isSidebarHidden && (
          <Sidebar
            currentTab={currentTab}
            setTab={setTab}
            onHide={toggleSidebar}
          />
        )}

        {/* Main Desktop Content Area */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-56px)] animate-enter">
          {currentTab === 'home' && (
            <HomePage
              onNavigate={handleNavigate}
              onOpenViewer={onOpenViewer}
              onOpenUpload={onOpenUpload}
              onOpenText={onOpenText}
            />
          )}

          {currentTab === 'gallery' && user?.role !== 'admin' && (
            <GalleryPage
              initialSubView={gallerySubView}
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

          {currentTab === 'allfiles' && (
            <AllFilesPage
              onOpenViewer={onOpenViewer}
              onOpenText={onOpenText}
              onToggleFavorite={onToggleFavorite}
              onLock={onLockMedia}
              onOrganize={onOrganizeMedia}
              onDelete={onDeleteMedia}
              onRename={onRenameMedia}
              onContextMenu={handleOpenContextMenu}
              onShowDetail={(media) => setDetailModalMedia(media)}
              onOpenUpload={() => onOpenUpload(activeFolder)}
              onFolderChange={setActiveFolder}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsPage
              onOpenText={onOpenText}
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
              onOpenText={onOpenText}
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
            <AdminHomeDashboard />
          )}

          {currentTab === 'terminal' && user?.role === 'admin' && (
            <TerminalPage />
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

      {/* Floating Action Button (FAB) - Upload (Hidden on Terminal, Trash, and Admin Dashboard) */}
      {currentTab !== 'terminal' && currentTab !== 'trash' && !(user?.role === 'admin' && (currentTab === 'home' || currentTab === 'admin')) && (
        <button
          onClick={() => onOpenUpload(currentTab === 'allfiles' ? activeFolder : null)}
          className="fixed bottom-8 right-8 z-40 btn-primary h-12 px-5 rounded-full shadow-lg shadow-[#C2410C]/30 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all text-[14px] font-medium"
          title={activeFolder && currentTab === 'allfiles' ? `Upload ke folder ${activeFolder.name}` : 'Upload Media'}
        >
          <Upload className="w-5 h-5 stroke-[2.2]" />
          <span>{activeFolder && currentTab === 'allfiles' ? `Upload ke ${activeFolder.name}` : 'Upload'}</span>
        </button>
      )}
    </div>
  );
}
