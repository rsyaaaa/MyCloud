import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { useVault } from './context/VaultContext';
import { useIsMobile } from './hooks/useIsMobile';
import DesktopApp from './desktop/DesktopApp';
import MobileApp from './mobile/MobileApp';
import Toast from './components/Toast';
import UploadModal from './components/UploadModal';
import MediaViewerModal from './components/MediaViewerModal';
import TextEditorModal from './components/TextEditorModal';
import OrganizeModal from './components/OrganizeModal';
import LoginPage from './pages/LoginPage';
import { api } from './api';
import { triggerMediaEvent } from './utils/mediaEvents';

export default function App() {
  const { user, loading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile(768);

  // Prevent browser history navigation from forcibly restoring/resetting scroll positions
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  const [toasts, setToasts] = useState([]);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTargetFolder, setUploadTargetFolder] = useState(null);
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
  const [organizingMedia, setOrganizingMedia] = useState(null);
  const [textEditorMedia, setTextEditorMedia] = useState(null);

  // Viewer Modal
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMediaList, setViewerMediaList] = useState([]);
  const [viewerCurrentIndex, setViewerCurrentIndex] = useState(0);
  const [viewerIsVault, setViewerIsVault] = useState(false);
  const [viewerVaultToken, setViewerVaultToken] = useState(null);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleOpenViewer = (list, index, isVault = false, vaultToken = null) => {
    setViewerMediaList(list);
    setViewerCurrentIndex(index);
    setViewerIsVault(isVault);
    setViewerVaultToken(vaultToken);
    setViewerOpen(true);
  };

  const handleToggleFavorite = async (id, isFavorite) => {
    // 1. Optimistically fire real-time event immediately (0ms delay)
    triggerMediaEvent({ type: 'favorite', id, is_favorite: isFavorite ? 1 : 0 });
    try {
      await api.updateMedia(id, { is_favorite: isFavorite });
      addToast(isFavorite ? t('addedFavorite', 'Ditambahkan ke Favorit') : t('removedFavorite', 'Dihapus dari Favorit'), 'success');
      setViewerMediaList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_favorite: isFavorite ? 1 : 0 } : m))
      );
    } catch (e) {
      // Rollback on network failure
      triggerMediaEvent({ type: 'favorite', id, is_favorite: isFavorite ? 0 : 1 });
      addToast(e.message || t('favoriteFailed', 'Gagal mengubah status favorit.'), 'error');
    }
  };

  const handleLockMedia = async (id) => {
    // Optimistic removal from main galleries
    triggerMediaEvent({ type: 'lock', id });
    try {
      await api.lockMedia(id);
      addToast(t('movedToVault', 'Foto/video berhasil dipindahkan ke Brankas Rahasia.'), 'success');
      setViewerOpen(false);
      refreshUser();
    } catch (e) {
      triggerMediaEvent({ type: 'unlock', id });
      addToast(e.message || t('lockFailed', 'Gagal mengunci media.'), 'error');
    }
  };

  const handleUnlockMedia = async (id, vaultToken) => {
    try {
      await api.unlockMedia(id, vaultToken);
      triggerMediaEvent({ type: 'unlock', id });
      addToast(t('movedToGallery', 'File berhasil dipindahkan kembali ke Galeri Utama.'), 'success');
      setViewerOpen(false);
      refreshUser();
    } catch (e) {
      addToast(e.message || t('unlockFailed', 'Gagal membuka kunci media.'), 'error');
    }
  };

  const handleRenameMedia = async (idOrMedia, newName) => {
    const id = typeof idOrMedia === 'object' ? idOrMedia.id : idOrMedia;
    const name = typeof idOrMedia === 'object'
      ? prompt(t('renamePrompt', 'Masukkan nama tampilan baru:'), idOrMedia.display_name)
      : newName;

    if (!name || !name.trim()) return;

    // Optimistic rename
    triggerMediaEvent({ type: 'rename', id, name: name.trim() });
    try {
      await api.updateMedia(id, { display_name: name.trim() });
      addToast(t('renamed', 'Nama file berhasil diperbarui.'), 'success');
      setViewerMediaList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, display_name: name.trim() } : m))
      );
    } catch (e) {
      triggerMediaEvent({ type: 'rename_rollback', id });
      addToast(e.message || t('renameFailed', 'Gagal mengubah nama file.'), 'error');
    }
  };

  const handleDeleteMedia = async (id, vaultToken) => {
    if (!window.confirm(t('deleteConfirm', 'Pindahkan file ini ke Tempat Sampah (akan dihapus permanen dalam 31 hari)?'))) return;

    // 1. Optimistically remove item from UI immediately
    triggerMediaEvent({ type: 'delete', id });
    try {
      await api.deleteMedia(id, vaultToken);
      addToast(t('movedToTrash', 'File dipindahkan ke Tempat Sampah.'), 'success');
      setViewerOpen(false);
      refreshUser();
    } catch (e) {
      triggerMediaEvent({ type: 'restore', id });
      addToast(e.message || t('deleteFailed', 'Gagal menghapus file.'), 'error');
    }
  };

  const handleOrganizeMedia = (media) => {
    setOrganizingMedia(media);
    setOrganizeModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#000000] flex flex-col items-center justify-center p-6 text-center animate-pulse">
        <div className="w-16 h-16 rounded-[12px] bg-[#C2410C] text-white flex items-center justify-center font-display text-2xl font-bold mb-4 shadow-lg shadow-[#C2410C]/25">
          MC
        </div>
        <p className="font-display font-bold text-xl text-[#C2410C] tracking-tight">
          {t('appLoading', 'Memuat MyCloud...')}
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleOpenUpload = (targetFolder = null) => {
    setUploadTargetFolder(targetFolder);
    setUploadModalOpen(true);
  };

  const commonProps = {
    onOpenUpload: handleOpenUpload,
    onOpenText: (media) => setTextEditorMedia(media),
    onOpenViewer: handleOpenViewer,
    onToggleFavorite: handleToggleFavorite,
    onLockMedia: handleLockMedia,
    onUnlockMedia: handleUnlockMedia,
    onOrganizeMedia: handleOrganizeMedia,
    onDeleteMedia: handleDeleteMedia,
    onRenameMedia: handleRenameMedia,
  };

  return (
    <>
      {/* Toast System */}
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Render Mobile Layout or Desktop Layout cleanly based on screen size */}
      {isMobile ? (
        <MobileApp {...commonProps} />
      ) : (
        <DesktopApp {...commonProps} />
      )}

      {/* Shared Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadTargetFolder(null);
        }}
        user={user}
        targetFolder={uploadTargetFolder}
        onUploadSuccess={(folderId) => {
          refreshUser();
          triggerMediaEvent({ type: 'upload', category_id: folderId });
          addToast(t('uploadSuccessToast', 'File berhasil diupload ke cloud!'), 'success');
        }}
      />

      <TextEditorModal
        isOpen={Boolean(textEditorMedia)}
        media={textEditorMedia}
        onClose={() => setTextEditorMedia(null)}
        onSaved={() => {
          refreshUser();
          triggerMediaEvent({ type: 'upload' });
          addToast(t('textSaved', 'File teks berhasil disimpan.'), 'success');
        }}
      />

      <OrganizeModal
        isOpen={organizeModalOpen}
        onClose={() => setOrganizeModalOpen(false)}
        media={organizingMedia}
        onUpdated={() => {
          triggerMediaEvent({ type: 'organize' });
          addToast(t('albumUpdated', 'Album media berhasil diperbarui.'), 'success');
        }}
      />

      <MediaViewerModal
        isOpen={viewerOpen}
        mediaList={viewerMediaList}
        currentIndex={viewerCurrentIndex}
        onClose={() => setViewerOpen(false)}
        onNavigate={(idx) => setViewerCurrentIndex(idx)}
        onRename={handleRenameMedia}
        onOrganize={handleOrganizeMedia}
        onToggleFavorite={handleToggleFavorite}
        onLock={handleLockMedia}
        onUnlock={handleUnlockMedia}
        onDelete={handleDeleteMedia}
        isVault={viewerIsVault}
        vaultToken={viewerVaultToken}
      />
    </>
  );
}
