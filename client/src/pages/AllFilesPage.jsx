import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder, FolderPlus, FileText, Image, Video, HardDrive, Search, LayoutGrid, List,
  Download, Trash2, Edit2, Heart, Lock, MoreVertical, ArrowUpDown, ChevronRight,
  ArrowLeft, X, Check, Upload
} from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { triggerMediaEvent, subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';
import { useLanguage, localeFor } from '../context/LanguageContext';
import { useTransfer } from '../context/TransferContext';

export default function AllFilesPage({
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onContextMenu,
  onShowDetail,
  onOpenUpload,
  onFolderChange,
  onOpenText
}) {
  const { t, lang } = useLanguage();
  const { startDownload } = useTransfer();
  const [currentFolder, setCurrentFolder] = useState(() => {
    try {
      const saved = localStorage.getItem('mycloud_active_folder');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [files, setFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('mycloud_active_folder');
      const folder = saved ? JSON.parse(saved) : null;
      const sort = localStorage.getItem('mycloud_pref_allfiles_sort') || 'newest';
      const filter = localStorage.getItem('mycloud_pref_allfiles_filter') || 'all';
      const params = { sort };
      if (filter !== 'all') params.media_type = filter;
      if (folder) params.category_id = folder.id;
      else params.root_only = 'true';
      const cached = api.getCachedMedia ? api.getCachedMedia(params) : null;
      return (cached && cached.media) || [];
    } catch (e) {
      return [];
    }
  });

  const [folders, setFolders] = useState(() => {
    try {
      const cached = api.getCachedCategories ? api.getCachedCategories() : null;
      return (cached && cached.categories) || [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => files.length === 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (onFolderChange) onFolderChange(currentFolder);
    if (currentFolder) {
      localStorage.setItem('mycloud_active_folder', JSON.stringify({ id: currentFolder.id, name: currentFolder.name }));
    } else {
      localStorage.removeItem('mycloud_active_folder');
    }
  }, [currentFolder]);

  // Preference persistence (Requirement 3)
  const [filterType, setFilterType] = useState(() => localStorage.getItem('mycloud_pref_allfiles_filter') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState(() => localStorage.getItem('mycloud_pref_allfiles_sort') || 'newest');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('mycloud_pref_allfiles_view') || 'grid');

  // Create folder modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [submittingFolder, setSubmittingFolder] = useState(false);

  // Rename folder modal state
  const [folderToRename, setFolderToRename] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(false);

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('mycloud_pref_allfiles_view', mode);
  };

  const changeSortOption = (sort) => {
    setSortOption(sort);
    localStorage.setItem('mycloud_pref_allfiles_sort', sort);
  };

  const changeFilterType = (type) => {
    setFilterType(type);
    localStorage.setItem('mycloud_pref_allfiles_filter', type);
  };

  const loadFolders = async () => {
    try {
      const res = await api.listCategories();
      const catList = res.categories || [];
      setFolders(catList);
      if (currentFolder) {
        const found = catList.find((c) => c.id === currentFolder.id);
        if (found) {
          if (found.name !== currentFolder.name) {
            setCurrentFolder(found);
            localStorage.setItem('mycloud_active_folder', JSON.stringify({ id: found.id, name: found.name }));
          }
        } else if (catList.length > 0) {
          setCurrentFolder(null);
          localStorage.removeItem('mycloud_active_folder');
        }
      }
    } catch (err) {
      console.warn('Failed to load folders:', err);
    }
  };

  const loadFiles = async (silent = false) => {
    try {
      const params = {
        sort: sortOption,
        page: 1,
        limit: 50
      };
      if (filterType !== 'all') {
        params.media_type = filterType;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (currentFolder) {
        params.category_id = currentFolder.id;
      } else if (!searchQuery.trim()) {
        params.root_only = 'true';
      }

      // Check cache first: if present, render instantly in 0ms!
      const cached = api.getCachedMedia ? api.getCachedMedia(params) : null;
      if (cached && cached.media) {
        setFiles(cached.media);
        setPage(1);
        setHasMore(cached.hasMore ?? (cached.media.length >= 50));
        if (!silent) setLoading(false);
      } else if (!silent) {
        setLoading(true);
      }

      const res = await api.listMedia(params, { forceRefresh: !cached });
      setFiles(res.media || []);
      setPage(1);
      setHasMore(res.hasMore ?? ((res.media || []).length >= 50));
    } catch (err) {
      console.error('Failed to load all files:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Infinite Scroll fetcher for subsequent pages
  const loadMoreFiles = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = {
        sort: sortOption,
        page: nextPage,
        limit: 50
      };
      if (filterType !== 'all') {
        params.media_type = filterType;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (currentFolder) {
        params.category_id = currentFolder.id;
      } else if (!searchQuery.trim()) {
        params.root_only = 'true';
      }

      const res = await api.listMedia(params);
      const newItems = res.media || [];

      if (newItems.length > 0) {
        setFiles((prev) => {
          const ids = new Set(prev.map((f) => f.id));
          const fresh = newItems.filter((f) => !ids.has(f.id));
          return [...prev, ...fresh];
        });
        setPage(nextPage);
      }
      setHasMore(res.hasMore ?? (newItems.length >= 50));
    } catch (err) {
      console.error('Failed to load more files:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadFiles();
  }, [filterType, sortOption, searchQuery, currentFolder]);

  // Desktop Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreFiles();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, filterType, sortOption, searchQuery, currentFolder]);

  // Desktop shortcut: Backspace goes back to the parent folder.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Backspace' || !currentFolder) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      setCurrentFolder(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFolder]);

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
      alert(err.message || t('createFolderFailed', 'Gagal membuat folder'));
    } finally {
      setSubmittingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(t('deleteFolderConfirm', 'Hapus folder "{name}"? File di dalam folder tidak akan terhapus.').split('{name}').join(folderName))) return;
    try {
      await api.deleteCategory(folderId);
      triggerMediaEvent({ type: 'folder' });
      if (currentFolder?.id === folderId) {
        setCurrentFolder(null);
      }
      await loadFolders();
    } catch (err) {
      alert(err.message || t('deleteFolderFailed', 'Gagal menghapus folder'));
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
      alert(err.message || t('renameFolderFailed', 'Gagal mengubah nama folder.'));
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-enter">
      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C] mb-1">
            <span>MyCloud</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span
              onClick={() => setCurrentFolder(null)}
              className="cursor-pointer hover:text-[#C2410C] transition-colors"
            >
              All Files
            </span>
            {currentFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#C2410C] font-semibold">{currentFolder.name}</span>
              </>
            )}
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
            {currentFolder ? currentFolder.name : t('allFilesDir', 'All Files (Direktori Utama)')}
          </h2>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5 font-mono">
            {files.length} {t('fileCount', 'file')} {currentFolder ? t('filesInFolder', 'dalam folder ini') : t('filesStored', 'tersimpan')} • {t('totalLabel', 'Total')} {formatBytes(totalBytes)}
          </p>
        </div>

        {/* Action Button: Create Folder (Upload button at top removed as per request #2) */}
        <div className="flex items-center gap-2">
          {currentFolder && (
            <button
              onClick={() => setCurrentFolder(null)}
              className="btn-secondary text-[13px] h-9 px-3.5 rounded-[6px] flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('allFolders', 'Semua Folder')}</span>
            </button>
          )}
          {currentFolder && (
            <button
              onClick={() => openRenameFolder(currentFolder)}
              className="btn-secondary text-[13px] h-9 px-3.5 rounded-[6px] flex items-center gap-2"
              title={t('renameFolder', 'Ubah Nama Folder')}
            >
              <Edit2 className="w-4 h-4 text-[#C2410C]" />
              <span>{t('renameShort', 'Ubah Nama')}</span>
            </button>
          )}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-secondary text-[13px] h-9 px-3.5 rounded-[6px] flex items-center gap-2"
            title={t('createFolderTitle', 'Buat Folder Baru')}
          >
            <FolderPlus className="w-4 h-4 text-[#C2410C]" />
            <span>{t('newFolder', 'Folder Baru')}</span>
          </button>
        </div>
      </div>

      {/* Folders Section (Only in Root View and when folders exist) */}
      {!currentFolder && folders.length > 0 && !searchQuery.trim() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
              <Folder className="w-4 h-4 text-[#C2410C]" />
              <span>{t('folderLabel', 'Folder')} ({folders.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setCurrentFolder(folder)}
                className="card-artisan p-3.5 cursor-pointer group flex items-center justify-between hover:border-[#C2410C] transition-all bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center shrink-0">
                    <Folder className="w-5 h-5 fill-[#C2410C]/20" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate group-hover:text-[#C2410C] transition-colors">
                      {folder.name}
                    </p>
                    <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">
                      {folder.media_count || 0} {t('fileCount', 'file')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openRenameFolder(folder);
                    }}
                    className="p-1.5 text-[#9C9C9C] hover:text-[#C2410C] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('renameFolder', 'Ubah Nama Folder')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id, folder.name);
                    }}
                    className="p-1.5 text-[#9C9C9C] hover:text-[#EF4444] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('deleteFolder', 'Hapus Folder')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px]">
        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => changeFilterType('all')}
            className={`chip-filter ${filterType === 'all' ? 'chip-filter-active' : ''}`}
          >
            {t('allFilesChip', 'Semua File')}
          </button>
          <button
            onClick={() => changeFilterType('image')}
            className={`chip-filter ${filterType === 'image' ? 'chip-filter-active' : ''}`}
          >
            <Image className="w-3 h-3" />
            <span>{t('photos', 'Foto')}</span>
          </button>
          <button
            onClick={() => changeFilterType('video')}
            className={`chip-filter ${filterType === 'video' ? 'chip-filter-active' : ''}`}
          >
            <Video className="w-3 h-3" />
            <span>{t('videos', 'Video')}</span>
          </button>
          <button
            onClick={() => changeFilterType('document')}
            className={`chip-filter ${filterType === 'document' ? 'chip-filter-active' : ''}`}
          >
            <FileText className="w-3 h-3" />
            <span>{t('documents', 'Dokumen')}</span>
          </button>
        </div>

        {/* Right Tools: Search, Sort, View Toggle */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Quick Filter Search */}
          <div className="flex items-center h-[32px] px-2.5 rounded-[6px] bg-[#F4F4F5] dark:bg-[#121218] border border-[#E8E8EC] dark:border-[#1F1F27] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all w-44 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#9C9C9C] shrink-0 mr-2" />
            <input
              type="text"
              placeholder={t('searchFilePlaceholder', 'Cari file...')}
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

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => changeSortOption(e.target.value)}
              className="input-artisan h-[32px] py-0 text-[12px] bg-white dark:bg-[#000000]"
            >
              <option value="newest">{t('sortNewest', 'Terbaru')}</option>
              <option value="oldest">{t('sortOldest', 'Terlama')}</option>
              <option value="size_desc">{t('sortLargest', 'Ukuran Terbesar')}</option>
              <option value="size_asc">{t('sortSmallest', 'Ukuran Terkecil')}</option>
            </select>
          </div>

          {/* View Mode Toggle (Remembers choice in localStorage) */}
          <div className="flex items-center gap-0.5 bg-[#F4F4F5] dark:bg-[#121218] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27]">
            <button
              onClick={() => changeViewMode('list')}
              className={`p-1.5 rounded-[4px] transition-colors ${viewMode === 'list' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => changeViewMode('grid')}
              className={`p-1.5 rounded-[4px] transition-colors ${viewMode === 'grid' ? 'bg-[#C2410C] text-white' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <MediaGridSkeleton count={8} />
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
          <Folder className="w-12 h-12 text-[#C2410C] mx-auto mb-3 opacity-40" />
          <h4 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            {currentFolder ? t('emptyFolder', 'Folder ini masih kosong') : t('noFiles', 'Tidak ada file')}
          </h4>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1 max-w-sm mx-auto">
            {currentFolder
              ? t('emptyFolderHint', 'Gunakan tombol Upload di kanan bawah atau atur file untuk memindahkannya ke folder ini.')
              : t('emptyRootHint', 'Belum ada file di direktori utama Anda. Gunakan tombol Upload di kanan bawah untuk menambahkan file.')}
          </p>
          {currentFolder && onOpenUpload && (
            <button
              onClick={() => onOpenUpload(currentFolder)}
              className="mt-4 btn-primary h-9 px-4 text-[13px] inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{t('uploadToThisFolder', 'Upload File ke Folder Ini')}</span>
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* Table / List View */
        <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E8EC] dark:border-[#1F1F27] bg-[#FAFAFA] dark:bg-[#121218] text-[11px] font-mono uppercase tracking-wider text-[#6B6B6B] dark:text-[#9C9C9C]">
                <th className="py-3 px-4">{t('fileName', 'Nama File')}</th>
                <th className="py-3 px-4 hidden sm:table-cell">{t('typeColumn', 'Jenis')}</th>
                <th className="py-3 px-4">{t('size', 'Ukuran')}</th>
                <th className="py-3 px-4 hidden md:table-cell">{t('uploadedDate', 'Tanggal Diunggah')}</th>
                <th className="py-3 px-4 text-right">{t('actionColumn', 'Aksi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8EC] dark:divide-[#1F1F27] text-[13px]">
              {files.map((file, idx) => {
                const isDoc = file.media_type === 'document';
                const isVid = file.media_type === 'video';
                const isImg = file.media_type === 'image';

                return (
                  <tr
                    key={file.id}
                    onClick={() => handleFileClick(file, idx)}
                    className="hover:bg-[#F4F4F5] dark:hover:bg-[#141418] cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[6px] overflow-hidden bg-[#F4F4F5] dark:bg-[#121217] flex items-center justify-center shrink-0 border border-[#E8E8EC] dark:border-[#1F1F27]">
                          {isDoc ? (
                            file.thumbnail_path ? (
                              <img
                                src={api.getThumbnailUrl(file.id)}
                                alt={file.display_name}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <FileText className="w-4 h-4 text-[#C2410C]" />
                            )
                          ) : (
                            <img
                              src={api.getThumbnailUrl(file.id)}
                              alt={file.display_name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA] group-hover:text-[#C2410C] transition-colors truncate max-w-xs sm:max-w-md">
                          {file.display_name || file.original_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] uppercase">
                      {file.media_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                      {formatBytes(file.file_size)}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                      {new Date(file.created_at).toLocaleDateString(localeFor(lang), {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startDownload(file)}
                          className="p-1.5 text-[#6B6B6B] hover:text-[#C2410C] rounded hover:bg-[#E8E8EC] dark:hover:bg-[#1F1F27]"
                          title={t('downloadShort', 'Unduh')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete && onDelete(file.id)}
                          className="p-1.5 text-[#6B6B6B] hover:text-[#EF4444] rounded hover:bg-[#E8E8EC] dark:hover:bg-[#1F1F27]"
                          title={t('deleteToTrash', 'Hapus ke Sampah')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file, idx) => (
            <MediaCard
              key={file.id}
              media={file}
              onClick={() => handleFileClick(file, idx)}
              onToggleFavorite={onToggleFavorite}
              onLock={onLock}
              onOrganize={() => onOrganize && onOrganize(file)}
              onDelete={onDelete}
              onRename={onRename}
              onContextMenu={onContextMenu}
              onShowDetail={onShowDetail}
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {files.length > 0 && (
        <div ref={sentinelRef} className="py-8 flex flex-col items-center justify-center gap-2">
          {loadingMore && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] shadow-xs text-[13px] text-[#8E8E9E]">
              <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
              <span>Memuat berkas lainnya...</span>
            </div>
          )}
          {!hasMore && (
            <div className="text-[12px] text-[#8E8E9E] font-mono tracking-wide py-2">
              ✓ Semua berkas telah dimuat ({files.length} berkas)
            </div>
          )}
        </div>
      )}

      {/* Modal Buat Folder Baru */}
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
                  {t('createFolderTitle', 'Buat Folder Baru')}
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
                  {t('folderNameLabel', 'Nama Folder')}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={t('folderNamePlaceholder', 'Misal: Kuliah, Dokumen Proyek, Liburan...')}
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
                  {t('cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={submittingFolder || !newFolderName.trim()}
                  className="btn-primary text-[13px] h-9 px-4"
                >
                  {submittingFolder ? t('creatingText', 'Membuat...') : t('createFolder', 'Buat Folder')}
                </button>
              </div>
            </form>
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
                  {t('renameFolder', 'Ubah Nama Folder')}
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
                  {t('renameFolderLabel', 'Nama Folder Baru')}
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
                  {t('cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={renamingFolder || !renameFolderName.trim()}
                  className="btn-primary text-[13px] h-9 px-4"
                >
                  {renamingFolder ? t('savingText', 'Menyimpan...') : t('save', 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
