import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder, FolderPlus, FileText, Image, Video, HardDrive, Search, LayoutGrid, List,
  Download, Trash2, Edit2, ChevronRight, ArrowLeft, X, Upload
} from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { triggerMediaEvent, subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';

export default function MobileAllFilesView({
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress,
  onOpenText,
  onOpenUpload,
  onFolderChange
}) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (onFolderChange) onFolderChange(currentFolder);
  }, [currentFolder]);

  // Persistence (Requirement 3)
  const [filterType, setFilterType] = useState(() => localStorage.getItem('mycloud_pref_allfiles_filter') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState(() => localStorage.getItem('mycloud_pref_allfiles_sort') || 'newest');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('mycloud_pref_allfiles_view') || 'grid');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Folder modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [submittingFolder, setSubmittingFolder] = useState(false);

  // Rename folder modal
  const [folderToRename, setFolderToRename] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(false);

  // Folder long-press action sheet
  const [folderMenu, setFolderMenu] = useState(null);
  const folderPressTimer = useRef(null);
  const folderPressOrigin = useRef({ x: 0, y: 0 });
  const folderLongPressTriggered = useRef(false);

  const clearFolderPress = () => {
    if (folderPressTimer.current) {
      clearTimeout(folderPressTimer.current);
      folderPressTimer.current = null;
    }
  };

  const startFolderPress = (folder, e) => {
    clearFolderPress();
    folderLongPressTriggered.current = false;
    const point = e.touches?.[0] || e;
    folderPressOrigin.current = { x: point.clientX || 0, y: point.clientY || 0 };
    folderPressTimer.current = setTimeout(() => {
      folderLongPressTriggered.current = true;
      if (navigator.vibrate) navigator.vibrate(35);
      setFolderMenu(folder);
    }, 500);
  };

  const moveFolderPress = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    const diffX = Math.abs(touch.clientX - folderPressOrigin.current.x);
    const diffY = Math.abs(touch.clientY - folderPressOrigin.current.y);
    if (diffX > 10 || diffY > 10) clearFolderPress();
  };

  const handleFolderClick = (folder) => {
    if (folderLongPressTriggered.current) {
      folderLongPressTriggered.current = false;
      return;
    }
    setCurrentFolder(folder);
  };

  const closeFolderMenu = () => {
    setFolderMenu(null);
    folderLongPressTriggered.current = false;
  };

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('mycloud_pref_allfiles_view', mode);
  };

  const changeFilterType = (type) => {
    setFilterType(type);
    localStorage.setItem('mycloud_pref_allfiles_filter', type);
    setCurrentPage(1);
  };

  const loadFolders = async () => {
    try {
      const res = await api.listCategories();
      setFolders(res.categories || []);
    } catch (err) {
      console.warn('Failed to load folders:', err);
    }
  };

  const loadFiles = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { sort: sortOption };
      if (filterType !== 'all') {
        params.media_type = filterType;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (currentFolder) {
        params.category_id = currentFolder.id;
      }

      const res = await api.listMedia(params);
      setFiles(res.media || []);
      if (!silent) setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load mobile all files:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadFiles();
  }, [filterType, sortOption, searchQuery, currentFolder]);

  // Real-time reactive media event listener
  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setFiles((prev) =>
          prev.map((f) => (f.id === event.id ? { ...f, is_favorite: event.is_favorite } : f))
        );
      } else if (event.type === 'delete' || event.type === 'lock') {
        setFiles((prev) => prev.filter((f) => f.id !== event.id));
      } else if (event.type === 'rename') {
        setFiles((prev) =>
          prev.map((f) => (f.id === event.id ? { ...f, display_name: event.name } : f))
        );
      } else if (['upload', 'restore', 'unlock', 'rename_rollback', 'folder', 'organize'].includes(event.type)) {
        loadFiles(true);
        loadFolders();
      }
    });
    return unsub;
  }, [filterType, sortOption, searchQuery, currentFolder]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setSubmittingFolder(true);
    try {
      await api.createCategory(newFolderName.trim(), 'folder');
      triggerMediaEvent({ type: 'folder' });
      setNewFolderName('');
      setCreateModalOpen(false);
      await loadFolders();
    } catch (err) {
      alert(err.message || 'Gagal membuat folder');
    } finally {
      setSubmittingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Hapus folder "${folderName}"? File di dalam folder tidak akan terhapus.`)) return;
    try {
      await api.deleteCategory(folderId);
      triggerMediaEvent({ type: 'folder' });
      if (currentFolder?.id === folderId) {
        setCurrentFolder(null);
      }
      await loadFolders();
    } catch (err) {
      alert(err.message || 'Gagal menghapus folder');
    }
  };

  const openRenameFolder = (folder) => {
    setFolderToRename(folder);
    setRenameFolderName(folder?.name || '');
  };

  const handleRenameFolder = async (e) => {
    e.preventDefault();
    if (!folderToRename || !renameFolderName.trim()) return;
    setRenamingFolder(true);
    try {
      await api.renameCategory(folderToRename.id, renameFolderName.trim());
      const nextName = renameFolderName.trim();
      setFolders((prev) =>
        prev.map((f) => (f.id === folderToRename.id ? { ...f, name: nextName } : f))
      );
      if (currentFolder?.id === folderToRename.id) {
        setCurrentFolder((prev) => (prev ? { ...prev, name: nextName } : prev));
      }
      triggerMediaEvent({ type: 'folder' });
      setFolderToRename(null);
      await loadFolders();
    } catch (err) {
      alert(err.message || 'Gagal mengubah nama folder');
    } finally {
      setRenamingFolder(false);
    }
  };

  const handleFileClick = (item, idx) => {
    recordRecentItem(item);
    if (item.media_type === 'document') {
      if (isTxtFile(item) && onOpenText) {
        onOpenText(item);
      } else {
        window.open(api.getStreamUrl(item.id), '_blank');
      }
    } else {
      if (onOpenViewer) onOpenViewer(files, idx);
    }
  };

  const totalBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  }, [files]);

  const totalItems = files.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return files.slice(start, start + pageSize);
  }, [files, currentPage, pageSize]);

  return (
    <div className="p-4 pb-28 max-w-md mx-auto space-y-4 animate-enter">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
            <span>MyCloud</span>
            <ChevronRight className="w-3 h-3" />
            <span
              onClick={() => setCurrentFolder(null)}
              className="cursor-pointer hover:text-[#C2410C]"
            >
              All Files
            </span>
            {currentFolder && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[#C2410C] font-semibold">{currentFolder.name}</span>
              </>
            )}
          </div>
          <h2 className="font-serif font-bold text-xl text-[#0A0A0A] dark:text-[#FAFAFA]">
            {currentFolder ? currentFolder.name : 'All Files (Direktori)'}
          </h2>
          <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">
            {files.length} file • {formatBytes(totalBytes)}
          </p>
        </div>

        {/* Action: Folder Baru */}
        <div className="flex items-center gap-1.5">
          {currentFolder && (
            <button
              onClick={() => setCurrentFolder(null)}
              className="p-1.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27] text-[#6B6B6B] dark:text-[#A1A1AA]"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border border-[#C2410C]/20 rounded-[8px] text-[12px] font-semibold active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Folder</span>
          </button>
        </div>
      </div>

      {/* Folders List (When in Root View) */}
      {!currentFolder && folders.length > 0 && !searchQuery.trim() && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
              Folder ({folders.length})
            </span>
            <span className="text-[10px] text-[#9C9C9C] dark:text-[#71717A]">
              Tekan lama untuk opsi
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {folders.map((folder) => (
              <div
                key={folder.id}
                role="button"
                tabIndex={0}
                onTouchStart={(e) => startFolderPress(folder, e)}
                onTouchMove={moveFolderPress}
                onTouchEnd={clearFolderPress}
                onTouchCancel={clearFolderPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  clearFolderPress();
                  folderLongPressTriggered.current = true;
                  setFolderMenu(folder);
                }}
                onClick={() => handleFolderClick(folder)}
                className="card-artisan group p-2 min-h-[78px] flex flex-col justify-between cursor-pointer select-none rounded-[12px] bg-white dark:bg-[#0A0A0E] active:scale-[0.97] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-8 h-8 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/15 text-[#C2410C] flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4 fill-[#C2410C]/20" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#C4C4CC] dark:text-[#52525B] mt-1 shrink-0" />
                </div>
                <div className="min-w-0 mt-1.5">
                  <p className="text-[12px] leading-[1.3] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                    {folder.name}
                  </p>
                  <p className="text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono mt-0.5">
                    {folder.media_count || 0} file
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => changeFilterType('all')}
          className={`chip-filter shrink-0 ${filterType === 'all' ? 'chip-filter-active' : ''}`}
        >
          Semua
        </button>
        <button
          onClick={() => changeFilterType('image')}
          className={`chip-filter shrink-0 ${filterType === 'image' ? 'chip-filter-active' : ''}`}
        >
          <Image className="w-3 h-3" /> Foto
        </button>
        <button
          onClick={() => changeFilterType('video')}
          className={`chip-filter shrink-0 ${filterType === 'video' ? 'chip-filter-active' : ''}`}
        >
          <Video className="w-3 h-3" /> Video
        </button>
        <button
          onClick={() => changeFilterType('document')}
          className={`chip-filter shrink-0 ${filterType === 'document' ? 'chip-filter-active' : ''}`}
        >
          <FileText className="w-3 h-3" /> Dokumen
        </button>
      </div>

      {/* Search & View Mode Switcher */}
      <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-[#0A0A0E] rounded-[10px] border border-[#E8E8EC] dark:border-[#1F1F27]">
        <div className="flex items-center flex-1 h-[32px] px-2.5 rounded-[6px] bg-[#F4F4F5] dark:bg-[#121218] border border-[#E8E8EC] dark:border-[#1F1F27] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all">
          <Search className="w-3.5 h-3.5 text-[#9C9C9C] shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Cari nama file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent border-none outline-none text-[12px] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#9C9C9C]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-[#9C9C9C] hover:text-[#C2410C] transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[4px] border border-[#E8E8EC] dark:border-[#1F1F27]">
          <button
            onClick={() => changeViewMode('list')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
            title="List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => changeViewMode('grid')}
            className={`p-1.5 rounded-[3px] transition-colors ${
              viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
            }`}
            title="Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Files List / Grid */}
      {loading ? (
        <MediaGridSkeleton count={6} />
      ) : files.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
          <Folder className="w-10 h-10 text-[#C2410C] mx-auto mb-2 opacity-40" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            {currentFolder ? 'Folder ini kosong' : 'Tidak ada file'}
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Gunakan tombol Upload di kanan bawah untuk mengunggah berkas.
          </p>
          {currentFolder && onOpenUpload && (
            <button
              onClick={() => onOpenUpload(currentFolder)}
              className="mt-3 btn-primary h-8 px-4 text-[12px] inline-flex items-center gap-1.5 rounded-full"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload ke Folder Ini</span>
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* List Mode */
        <div className="space-y-2">
          {paginatedFiles.map((file, idx) => {
            const globalIdx = files.findIndex((f) => f.id === file.id);
            return (
              <MobileMediaListItem
                key={file.id}
                media={file}
                onClick={() => handleFileClick(file, globalIdx)}
                onToggleFavorite={onToggleFavorite}
                onLock={onLock}
                onOrganize={() => onOrganize && onOrganize(file)}
                onDelete={onDelete}
                onRename={onRename}
                onLongPress={onLongPress}
              />
            );
          })}
        </div>
      ) : (
        /* Grid Mode */
        <div className="grid grid-cols-2 gap-3">
          {paginatedFiles.map((file, idx) => {
            const globalIdx = files.findIndex((f) => f.id === file.id);
            return (
              <MobileMediaCard
                key={file.id}
                media={file}
                onClick={() => handleFileClick(file, globalIdx)}
                onToggleFavorite={onToggleFavorite}
                onLock={onLock}
                onOrganize={() => onOrganize && onOrganize(file)}
                onDelete={onDelete}
                onRename={onRename}
                onLongPress={onLongPress}
              />
            );
          })}
        </div>
      )}

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <MobilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal Buat Folder Mobile */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-enter"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-5 shadow-modal"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#C2410C]" />
                <h3 className="font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                  Folder Baru
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6B6B6B] dark:text-[#9C9C9C] mb-1.5">
                  Nama Folder
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nama folder..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input-artisan w-full text-[13px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary text-[13px] h-9 px-3.5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingFolder || !newFolderName.trim()}
                  className="btn-primary text-[13px] h-9 px-4"
                >
                  {submittingFolder ? 'Membuat...' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Action Sheet (long press) */}
      {folderMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-enter"
          onClick={closeFolderMenu}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#0A0A0E] border-t border-[#E8E8EC] dark:border-[#1F1F27] rounded-t-[20px] px-4 pt-3 pb-7 shadow-modal"
          >
            <div className="w-10 h-1 rounded-full bg-[#E8E8EC] dark:bg-[#272733] mx-auto mb-4" />
            <div className="flex items-center gap-3 pb-3 mb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
              <div className="w-10 h-10 rounded-[9px] bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/15 text-[#C2410C] flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 fill-[#C2410C]/20" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                  {folderMenu.name}
                </p>
                <p className="text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono mt-0.5">
                  {folderMenu.media_count || 0} file
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const target = folderMenu;
                closeFolderMenu();
                openRenameFolder(target);
              }}
              className="w-full flex items-center gap-3 px-2 py-3 rounded-[10px] text-[14px] font-medium text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#121218] active:bg-[#F4F4F5] dark:active:bg-[#121218]"
            >
              <Edit2 className="w-4 h-4 text-[#C2410C]" />
              Ubah Nama Folder
            </button>
            <button
              type="button"
              onClick={() => {
                const target = folderMenu;
                closeFolderMenu();
                handleDeleteFolder(target.id, target.name);
              }}
              className="w-full flex items-center gap-3 px-2 py-3 rounded-[10px] text-[14px] font-medium text-left text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#2A0A0A] active:bg-[#FEF2F2] dark:active:bg-[#2A0A0A]"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Folder
            </button>
            <button
              type="button"
              onClick={closeFolderMenu}
              className="mt-2 w-full h-10 rounded-[10px] bg-[#F4F4F5] dark:bg-[#121218] text-[13px] font-semibold text-[#6B6B6B] dark:text-[#A1A1AA] active:scale-[0.99]"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Modal Ubah Nama Folder */}
      {folderToRename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-enter"
          onClick={() => setFolderToRename(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-5 shadow-modal"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C2410C]" />
                <h3 className="font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                  Ubah Nama Folder
                </h3>
              </div>
              <button
                onClick={() => setFolderToRename(null)}
                className="p-1 text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameFolder} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6B6B6B] dark:text-[#9C9C9C] mb-1.5">
                  Nama Folder Baru
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  className="input-artisan w-full text-[13px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderToRename(null)}
                  className="btn-secondary text-[13px] h-9 px-3.5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={renamingFolder || !renameFolderName.trim()}
                  className="btn-primary text-[13px] h-9 px-4"
                >
                  {renamingFolder ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
