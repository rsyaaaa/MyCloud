import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import GalleryPage from '../pages/GalleryPage';
import VideoHubPage from '../pages/VideoHubPage';
import VaultPage from '../pages/VaultPage';
import AlbumsPage from '../pages/AlbumsPage';
import AdminPage from '../pages/AdminPage';

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
  const { user } = useAuth();
  const [currentTab, setTab] = useState('gallery'); // 'gallery', 'videos', 'albums', 'vault', 'admin'
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBF5]">
      {/* Top Navbar */}
      <Navbar
        onOpenUpload={onOpenUpload}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenQuotaModal={onOpenQuotaModal}
      />

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setTab={setTab}
          onRequestIncreaseQuota={onOpenQuotaModal}
        />

        {/* Main Desktop Content Area */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-64px)]">
          {currentTab === 'gallery' && (
            <GalleryPage
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
            <VideoHubPage
              onOpenViewer={onOpenViewer}
              onToggleFavorite={onToggleFavorite}
              onLock={onLockMedia}
              onOrganize={onOrganizeMedia}
              onDelete={onDeleteMedia}
              onRename={onRenameMedia}
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
            />
          )}

          {currentTab === 'vault' && (
            <VaultPage
              onOpenViewer={onOpenViewer}
              onUnlockMedia={onUnlockMedia}
              onDeleteMedia={onDeleteMedia}
              onRenameMedia={onRenameMedia}
            />
          )}

          {currentTab === 'admin' && user?.role === 'admin' && (
            <AdminPage />
          )}
        </main>
      </div>
    </div>
  );
}

