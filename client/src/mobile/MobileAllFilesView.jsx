import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder, FolderPlus, FileText, Image, Video, Search, LayoutGrid, List,
  Trash2, Edit2, ArrowLeft, X, Upload, MoreVertical, Plus,
  ArrowUp, ArrowDown, Play, ArrowUpDown, AlertCircle, Heart, Download, Check, CheckSquare
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTransfer } from '../context/TransferContext';
import { formatBytes } from '../components/QuotaBar';
import { MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { triggerMediaEvent, subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';

function formatDriveDate(isoString, lang = 'id') {
  if (!isoString) return '';
  const d = new Date(isoString);
  const prefix = lang === 'en' ? 'Modified ' : 'Diubah ';
  const dateStr = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  return `${prefix}${dateStr}`;
}

export default function MobileAllFilesView({
  showNavbar = true,
  onSelectionChange,
  onOpenViewer,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress,
  onOpenText,
  onOpenUpload,
  onFolderChange,
  onOpenProfile,
  onOpenTransferList,
  onOpenPagelist
}) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const {
    activeTransfersCount,
    isUploading,
    isDownloading,
    hasFailure,
    overallProgress,
    startUpload,
    startDownload
  } = useTransfer();
  const directFileInputRef = useRef(null);

  const [currentFolder, setCurrentFolder] = useState(() => {
    try {
      const saved = localStorage.getItem('mycloud_active_folder');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Try initializing from cache for instant 0ms first paint
  const [files, setFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('mycloud_active_folder');
      const folder = saved ? JSON.parse(saved) : null;
      const sort = folder
        ? (localStorage.getItem('mycloud_pref_folder_sort') || 'name_asc')
        : (localStorage.getItem('mycloud_pref_root_sort') || 'name_asc');
      const params = { sort };
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
  const pageRef = useRef(page);
  pageRef.current = page;
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearchOpen, setFolderSearchOpen] = useState(false);

  // Independent Sort: Root vs Inside Folder (Persisted separately)
  const [rootSortOption, setRootSortOption] = useState(() => {
    return localStorage.getItem('mycloud_pref_root_sort') || 'name_asc';
  });
  const [folderSortOption, setFolderSortOption] = useState(() => {
    return localStorage.getItem('mycloud_pref_folder_sort') || 'name_asc';
  });

  // Independent View Mode: Root vs Inside Folder (Persisted separately)
  const [rootViewMode, setRootViewMode] = useState(() => {
    return localStorage.getItem('mycloud_pref_root_view') || 'list';
  });
  const [folderViewMode, setFolderViewMode] = useState(() => {
    return localStorage.getItem('mycloud_pref_folder_view') || 'grid';
  });

  // Active getters based on current navigation depth
  const activeSortOption = currentFolder ? folderSortOption : rootSortOption;
  const activeViewMode = currentFolder ? folderViewMode : rootViewMode;

  // Modals & Action Sheets
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [submittingFolder, setSubmittingFolder] = useState(false);

  const [folderToRename, setFolderToRename] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(false);

  const [folderMenu, setFolderMenu] = useState(null);
  const [folderHeaderMenuOpen, setFolderHeaderMenuOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [genericFileSheet, setGenericFileSheet] = useState(null);

  // Multi-Select Mode State for All Files
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const selectedFileIdsRef = useRef(selectedFileIds);
  selectedFileIdsRef.current = selectedFileIds;
  const isSelectionMode = selectedFileIds.size > 0;

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(isSelectionMode);
    }
  }, [isSelectionMode, onSelectionChange]);

  const currentFolderRef = useRef(currentFolder);
  currentFolderRef.current = currentFolder;
  const folderMenuRef = useRef(folderMenu);
  folderMenuRef.current = folderMenu;
  const createModalOpenRef = useRef(createModalOpen);
  createModalOpenRef.current = createModalOpen;
  const folderToRenameRef = useRef(folderToRename);
  folderToRenameRef.current = folderToRename;
  const actionSheetOpenRef = useRef(actionSheetOpen);
  actionSheetOpenRef.current = actionSheetOpen;
  const folderHeaderMenuOpenRef = useRef(folderHeaderMenuOpen);
  folderHeaderMenuOpenRef.current = folderHeaderMenuOpen;
  const folderSearchOpenRef = useRef(folderSearchOpen);
  folderSearchOpenRef.current = folderSearchOpen;
  const genericFileSheetRef = useRef(genericFileSheet);
  genericFileSheetRef.current = genericFileSheet;

  useEffect(() => {
    const handleAllFilesPopState = (e) => {
      // 1. Close selection mode first
      if (selectedFileIdsRef.current.size > 0) {
        setSelectedFileIds(new Set());
        e.stopImmediatePropagation();
        return;
      }

      // 2. Close generic file sheet
      if (genericFileSheetRef.current) {
        setGenericFileSheet(null);
        e.stopImmediatePropagation();
        return;
      }

      // 3. Close internal action sheets / modals
      if (actionSheetOpenRef.current) {
        setActionSheetOpen(false);
        e.stopImmediatePropagation();
        return;
      }
      if (folderHeaderMenuOpenRef.current) {
        setFolderHeaderMenuOpen(false);
        e.stopImmediatePropagation();
        return;
      }
      if (folderMenuRef.current) {
        setFolderMenu(null);
        e.stopImmediatePropagation();
        return;
      }
      if (createModalOpenRef.current) {
        setCreateModalOpen(false);
        e.stopImmediatePropagation();
        return;
      }
      if (folderToRenameRef.current) {
        setFolderToRename(null);
        e.stopImmediatePropagation();
        return;
      }
      if (folderSearchOpenRef.current) {
        setFolderSearchOpen(false);
        e.stopImmediatePropagation();
        return;
      }

      // If state is modal or viewer_subsheet, DO NOT exit current folder
      if (
        e.state?.type === 'modal' ||
        e.state?.name === 'context' ||
        e.state?.name === 'detail' ||
        e.state?.name === 'generic_file' ||
        e.state?.name === 'folder_menu' ||
        e.state?.type === 'selection' ||
        e.state?.type === 'viewer_subsheet'
      ) {
        return;
      }

      // If inside a folder and state is still this folder, retain it
      if (currentFolderRef.current && e.state?.type === 'folder' && String(e.state?.folder?.id) === String(currentFolderRef.current.id)) {
        return;
      }

      // 4. If inside a folder, only step back to root when user stepped back to root allfiles
      if (currentFolderRef.current) {
        if (!e.state || (e.state.type === 'tab' && e.state.tab === 'allfiles') || e.state.type !== 'folder') {
          const cached = api.getCachedMedia ? api.getCachedMedia({ sort: rootSortOption, root_only: 'true' }) : null;
          if (cached && cached.media) {
            setFiles(cached.media);
            setLoading(false);
          } else {
            setFiles([]);
            setLoading(true);
          }
          setCurrentFolder(null);
          e.stopImmediatePropagation();
        }
      }
    };

    window.addEventListener('popstate', handleAllFilesPopState);
    return () => window.removeEventListener('popstate', handleAllFilesPopState);
  }, []);

  // Selection mode helpers
  const enterSelectionMode = (fileId) => {
    if (selectedFileIdsRef.current.size === 0) {
      window.history.pushState({ type: 'selection', mode: 'allfiles' }, '', '#select');
    }
    setSelectedFileIds(new Set([fileId]));
  };

  const clearSelection = () => {
    const savedY = window.scrollY;
    setSelectedFileIds(new Set());
    if (window.history.state?.type === 'selection') {
      window.history.back();
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' });
      });
    }
  };

  const toggleSelectFile = (fileId) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
        if (next.size === 0 && window.history.state?.type === 'selection') {
          window.history.back();
        }
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleLongPressFile = (file) => {
    if (selectedFileIdsRef.current.size === 0) {
      enterSelectionMode(file.id);
    } else {
      toggleSelectFile(file.id);
    }
  };

  // Touch handlers for long-press selection
  const touchTimerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const longPressTriggeredTimeRef = useRef(0);

  const handleTouchStart = (file, e) => {
    if (e.touches && e.touches.length > 1) return;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      touchTimerRef.current = null;
      longPressTriggeredTimeRef.current = Date.now();
      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (err) {}
      }
      handleLongPressFile(file);
    }, 450);
  };

  const handleTouchStartFolder = (folder, e) => {
    if (e.touches && e.touches.length > 1) return;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      touchTimerRef.current = null;
      longPressTriggeredTimeRef.current = Date.now();
      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (err) {}
      }
      openFolderMenu(folder);
    }, 450);
  };

  const handleTouchMove = (e) => {
    if (!touchTimerRef.current) return;
    const diffX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const diffY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (diffX > 16 || diffY > 16) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const openGenericFileSheet = (file) => {
    window.history.pushState({ type: 'modal', name: 'generic_file', tab: 'allfiles' }, '', '#file-action');
    setGenericFileSheet(file);
  };

  const closeGenericFileSheet = () => {
    if (!genericFileSheetRef.current) return;
    setGenericFileSheet(null);
    if (window.history.state?.type === 'modal' && window.history.state?.name === 'generic_file') {
      window.history.back();
    }
  };

  const openFolderMenu = (folder) => {
    window.history.pushState({ type: 'modal', name: 'folder_menu', tab: 'allfiles' }, '', '#folder-menu');
    setFolderMenu(folder);
  };

  const closeFolderMenu = () => {
    if (!folderMenuRef.current) return;
    setFolderMenu(null);
    if (window.history.state?.type === 'modal' && window.history.state?.name === 'folder_menu') {
      window.history.back();
    }
  };

  // FAB visibility syncs with showNavbar and selection mode
  const showFab = !isSelectionMode && showNavbar;

  useEffect(() => {
    if (onFolderChange) onFolderChange(currentFolder);
    setFolderHeaderMenuOpen(false);
    setFolderSearchOpen(false);
    if (currentFolder) {
      localStorage.setItem('mycloud_active_folder', JSON.stringify({ id: currentFolder.id, name: currentFolder.name }));
    } else {
      localStorage.removeItem('mycloud_active_folder');
    }
  }, [currentFolder]);

  // View Mode switcher (isolated per depth)
  const changeViewMode = (mode) => {
    if (currentFolder) {
      setFolderViewMode(mode);
      localStorage.setItem('mycloud_pref_folder_view', mode);
    } else {
      setRootViewMode(mode);
      localStorage.setItem('mycloud_pref_root_view', mode);
    }
  };

  // Cycle sort option (isolated per depth): name_asc -> name_desc -> modified_desc -> name_asc
  const handleToggleSort = () => {
    let next;
    const current = activeSortOption;
    if (current === 'name_asc') {
      next = 'name_desc';
    } else if (current === 'name_desc') {
      next = 'modified_desc';
    } else {
      next = 'name_asc';
    }

    if (currentFolder) {
      setFolderSortOption(next);
      localStorage.setItem('mycloud_pref_folder_sort', next);
    } else {
      setRootSortOption(next);
      localStorage.setItem('mycloud_pref_root_sort', next);
    }
  };

  const getSortLabel = () => {
    if (activeSortOption === 'name_asc') {
      return lang === 'en' ? 'Name A - Z' : 'Nama A - Z';
    }
    if (activeSortOption === 'name_desc') {
      return lang === 'en' ? 'Name Z - A' : 'Nama Z - A';
    }
    return lang === 'en' ? 'Date modified' : 'Waktu diubah';
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
          // Folder no longer exists on server
          setCurrentFolder(null);
          localStorage.removeItem('mycloud_active_folder');
        }
      }
    } catch (err) {
      console.warn('Failed to load folders:', err);
    }
  };

  // Safe file loader with race-condition guard
  useEffect(() => {
    let ignore = false;

    const fetchFiles = async () => {
      const activeSort = currentFolder ? folderSortOption : rootSortOption;
      const params = {
        sort: activeSort,
        page: 1,
        limit: 50
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (currentFolder) {
        params.category_id = currentFolder.id;
      } else if (!searchQuery.trim()) {
        params.root_only = 'true';
      }

      // Check cache first: if cached data exists, render instantly (0ms) without skeletons!
      const cached = api.getCachedMedia ? api.getCachedMedia(params) : null;
      if (cached && cached.media) {
        setFiles(cached.media);
        setPage(1);
        setHasMore(cached.hasMore ?? (cached.media.length >= 50));
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const res = await api.listMedia(params, { forceRefresh: !cached });
        if (!ignore) {
          setFiles(res.media || []);
          setPage(1);
          setHasMore(res.hasMore ?? ((res.media || []).length >= 50));
        }
      } catch (err) {
        console.error('Failed to load mobile all files:', err);
        if (!ignore && !cached) {
          setFiles([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchFiles();

    return () => {
      ignore = true;
    };
  }, [currentFolder, rootSortOption, folderSortOption, searchQuery]);

  // Infinite Scroll loader for files
  const loadMoreFiles = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const activeSort = currentFolder ? folderSortOption : rootSortOption;
      const params = {
        sort: activeSort,
        page: nextPage,
        limit: 50
      };
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

  // IntersectionObserver for Infinite Scroll (300px lookahead buffer)
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreFiles();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, currentFolder, rootSortOption, folderSortOption, searchQuery]);

  useEffect(() => {
    loadFolders();
  }, []);

  // Reactive media updates (realtime sync)
  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setFiles((prev) =>
          prev.map((f) => (f.id === event.id ? { ...f, is_favorite: event.is_favorite } : f))
        );
      } else if (event.type === 'delete' || event.type === 'lock') {
        setFiles((prev) => prev.some((f) => f.id === event.id) ? prev.filter((f) => f.id !== event.id) : prev);
      } else if (event.type === 'rename') {
        setFiles((prev) =>
          prev.map((f) => (f.id === event.id ? { ...f, display_name: event.name } : f))
        );
      } else if (['upload', 'restore', 'unlock', 'rename_rollback', 'folder', 'organize'].includes(event.type)) {
        loadFolders();
        // re-fetch files silently while maintaining loaded limit and scroll position
        const activeSort = currentFolder ? folderSortOption : rootSortOption;
        const currentLimit = Math.max(50, (pageRef.current || 1) * 50);
        const params = { sort: activeSort, limit: currentLimit };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (currentFolder) {
          params.category_id = currentFolder.id;
        } else if (!searchQuery.trim()) {
          params.root_only = 'true';
        }
        const savedY = window.scrollY;
        api.listMedia(params).then((res) => {
          setFiles(res.media || []);
          requestAnimationFrame(() => {
            window.scrollTo({ top: savedY, behavior: 'instant' });
          });
        }).catch(() => { });
      }
    });
    return unsub;
  }, [currentFolder, rootSortOption, folderSortOption, searchQuery]);

  const handleFolderClick = (folder) => {
    if (Date.now() - longPressTriggeredTimeRef.current < 800) {
      return;
    }
    const activeSort = folderSortOption;
    const cached = api.getCachedMedia ? api.getCachedMedia({ sort: activeSort, category_id: folder.id }) : null;
    if (cached && cached.media) {
      setFiles(cached.media);
      setLoading(false);
    } else {
      setFiles([]);
      setLoading(true);
    }
    setCurrentFolder(folder);
    window.history.pushState(
      { type: 'folder', tab: 'allfiles', folder: { id: folder.id, name: folder.name } },
      '',
      '#folder-' + folder.id
    );
  };

  const handleBackToRoot = () => {
    if (window.history.state?.type === 'folder') {
      window.history.back();
    } else {
      const activeSort = rootSortOption;
      const cached = api.getCachedMedia ? api.getCachedMedia({ sort: activeSort, root_only: 'true' }) : null;
      if (cached && cached.media) {
        setFiles(cached.media);
        setLoading(false);
      } else {
        setFiles([]);
        setLoading(true);
      }
      setCurrentFolder(null);
    }
  };

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
        handleBackToRoot();
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
    // If long-press was triggered recently, swallow this synthetic click completely
    if (Date.now() - longPressTriggeredTimeRef.current < 800) {
      return;
    }
    if (selectedFileIdsRef.current.size > 0) {
      toggleSelectFile(item.id);
      return;
    }

    recordRecentItem(item);

    const ext = (item.original_name ? item.original_name.split('.').pop() : '').toLowerCase();
    const isImg = item.media_type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'svg'].includes(ext);
    const isVid = item.media_type === 'video' || ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp'].includes(ext);
    const isDoc = item.media_type === 'document' || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'json', 'log'].includes(ext);

    if (isImg || isVid) {
      const visualFiles = (sortedFiles || []).filter(f => {
        const e = (f.original_name ? f.original_name.split('.').pop() : '').toLowerCase();
        return f.media_type === 'image' || f.media_type === 'video' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'mp4', 'mkv', 'mov'].includes(e);
      });
      const visualIdx = visualFiles.findIndex(f => f.id === item.id);
      if (onOpenViewer) onOpenViewer(visualFiles, visualIdx !== -1 ? visualIdx : 0);
    } else if (isDoc) {
      if (isTxtFile(item) && onOpenText) {
        onOpenText(item);
      } else {
        window.open(api.getStreamUrl(item.id), '_blank');
      }
    } else {
      // Non-previewable generic files (ZIP, APK, TAR, EXE, etc.) -> open action sheet popup
      openGenericFileSheet(item);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.size === sortedFiles.length && sortedFiles.length > 0) {
      clearSelection();
    } else {
      if (selectedFileIds.size === 0) {
        window.history.pushState({ type: 'selection', mode: 'allfiles' }, '', '#select');
      }
      setSelectedFileIds(new Set(sortedFiles.map(f => f.id)));
    }
  };

  const handleBulkFavorite = async () => {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;
    const selected = sortedFiles.filter(f => selectedFileIds.has(f.id));
    const anyNotFav = selected.some(f => !f.is_favorite);
    const targetFav = anyNotFav ? 1 : 0;
    setFiles(prev => prev.map(f => selectedFileIds.has(f.id) ? { ...f, is_favorite: targetFav } : f));
    clearSelection();
    for (const id of ids) {
      try {
        await api.toggleFavorite(id);
        triggerMediaEvent({ type: 'favorite', id, is_favorite: targetFav });
      } catch (e) {}
    }
  };

  const handleBulkOrganize = () => {
    const selected = sortedFiles.filter(f => selectedFileIds.has(f.id));
    if (selected.length === 0) return;
    if (onOrganize) onOrganize(selected);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;
    const count = ids.length;
    if (!window.confirm(`Pindahkan ${count} file ke Tempat Sampah?`)) return;
    setFiles(prev => prev.filter(f => !selectedFileIds.has(f.id)));
    clearSelection();
    for (const id of ids) {
      try {
        await api.deleteMedia(id);
        triggerMediaEvent({ type: 'delete', id });
      } catch (e) {}
    }
  };

  const handleDirectUploadChange = (e) => {
    const pickedFiles = Array.from(e.target.files || []);
    if (pickedFiles.length > 0) {
      startUpload(pickedFiles, currentFolder);
    }
    e.target.value = '';
  };

  // Folders sorted & filtered (always sorted by rootSortOption)
  const sortedFolders = useMemo(() => {
    if (!folders || folders.length === 0) return [];
    let list = [...folders];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (rootSortOption === 'name_asc') {
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else if (rootSortOption === 'name_desc') {
      return list.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
    } else {
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
  }, [folders, rootSortOption, searchQuery]);

  // Files sorted & filtered (sorted by activeSortOption)
  const sortedFiles = useMemo(() => {
    if (!files || files.length === 0) return [];
    let list = [...files];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((f) =>
        (f.display_name || f.original_name || '').toLowerCase().includes(q)
      );
    }
    if (activeSortOption === 'name_asc') {
      return list.sort((a, b) =>
        (a.display_name || a.original_name || '').localeCompare(
          b.display_name || b.original_name || '',
          undefined,
          { sensitivity: 'base' }
        )
      );
    } else if (activeSortOption === 'name_desc') {
      return list.sort((a, b) =>
        (b.display_name || b.original_name || '').localeCompare(
          a.display_name || a.original_name || '',
          undefined,
          { sensitivity: 'base' }
        )
      );
    } else {
      return list.sort(
        (a, b) => new Date(b.captured_at || b.created_at || 0) - new Date(a.captured_at || a.created_at || 0)
      );
    }
  }, [files, activeSortOption, searchQuery]);

  const avatarUrl = api.getAvatarUrl(user);

  return (
    <div className="min-h-screen pb-32 bg-[#FAFAFA] dark:bg-[#0B0B0E] text-[#0A0A0A] dark:text-[#F4F4F5]">
      {/* 1. TOP NAVBAR / SELECTION BAR */}
      {isSelectionMode ? (
        <>
          <header className="fixed top-0 inset-x-0 z-50 bg-[#C2410C] text-white px-4 h-14 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3">
              <button
                onClick={clearSelection}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-white/20 active:scale-90 transition-all text-white"
                title="Batal"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="font-semibold text-base font-sans tracking-tight text-white">
                {selectedFileIds.size} dipilih
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSelectAll}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white"
              >
                {selectedFileIds.size === sortedFiles.length ? 'Batal Semua' : 'Semua'}
              </button>

              <button
                onClick={handleBulkFavorite}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all text-white"
                title="Favorit"
              >
                <Heart className="w-5 h-5 fill-white" />
              </button>

              <button
                onClick={handleBulkOrganize}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all text-white"
                title="Pindahkan ke folder"
              >
                <Folder className="w-5 h-5" />
              </button>

              <button
                onClick={handleBulkDelete}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all text-white"
                title="Hapus"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </header>
          <div className="h-14" />
        </>
      ) : !currentFolder ? (
        /* Root View Navbar: MyCloud Brand + Integrated Capsule Search Bar + Avatar */
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0B0E]/95 backdrop-blur-md border-b border-[#E8E8EC] dark:border-[#1E1E28] px-3.5 h-14 flex items-center justify-between gap-2.5 shadow-none">
          {/* Brand - Clickable to open Mobile Pagelist */}
          <button
            type="button"
            onClick={() => onOpenPagelist && onOpenPagelist()}
            className="flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform text-left"
            title="Buka Pagelist"
          >
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-tr from-[#C2410C] to-[#EA580C] text-white flex items-center justify-center shadow-sm">
              <Folder className="w-4 h-4 fill-white/20 stroke-[2.2]" />
            </div>
            <span className="font-display font-bold text-[17px] text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight hidden xs:inline">
              MyCloud
            </span>
          </button>

          {/* Capsule Search Input */}
          <div className="flex-1 flex items-center h-9 px-3 rounded-full bg-[#F4F4F6] dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] focus-within:border-[#C2410C] focus-within:ring-2 focus-within:ring-[#C2410C]/20 transition-all">
            <Search className="w-3.5 h-3.5 text-[#8E8E9E] shrink-0 mr-2" />
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search in MyCloud...' : 'Cari di MyCloud...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none text-[12.5px] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#8E8E9E]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-[#8E8E9E] hover:text-[#C2410C] transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Transfer List Trigger Button */}
          <button
            onClick={() => onOpenTransferList && onOpenTransferList()}
            className="w-8 h-8 rounded-full border border-[#E8E8EC] dark:border-[#22222E] bg-white dark:bg-[#14141B] flex items-center justify-center text-[#6B6B6B] dark:text-[#A1A1AA] hover:text-[#C2410C] active:scale-95 transition-all relative shrink-0"
            title="Transfer List"
          >
            <ArrowUpDown className="w-4 h-4 stroke-[2.2]" />
            {(activeTransfersCount > 0 || hasFailure) && (
              <span
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0B0B0E] ${hasFailure ? 'bg-[#EF4444]' : isUploading ? 'bg-[#C2410C]' : 'bg-[#10B981]'
                  } animate-pulse`}
              />
            )}
          </button>

          {/* User Avatar */}
          <button
            onClick={() => onOpenProfile && onOpenProfile()}
            className="w-8 h-8 rounded-full border border-[#E8E8EC] dark:border-[#22222E] overflow-hidden shrink-0 active:scale-95 transition-transform"
            title="Profil"
          >
            <img
              src={avatarUrl}
              alt={user?.username}
              className="w-full h-full object-cover"
            />
          </button>
        </header>
      ) : (
        /* Folder View Navbar (Screenshot 2): ← Folder Name ... 🔍 ... ⋮ */
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0B0E]/95 backdrop-blur-md border-b border-[#E8E8EC] dark:border-[#1E1E28] px-3 h-14 flex items-center justify-between gap-2 shadow-none relative">
          {/* Back button & Folder Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={handleBackToRoot}
              className="p-2 -ml-1 text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-black/5 dark:hover:bg-white/10 rounded-full active:scale-90 transition-transform shrink-0"
              title="Kembali ke Root"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
            </button>
            <h2 className="font-semibold text-[16px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate leading-tight">
              {currentFolder.name}
            </h2>
          </div>

          {/* Right: Search Icon & Three Dots Menu */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setFolderSearchOpen((prev) => !prev)}
              className={`p-2 rounded-full transition-colors ${folderSearchOpen
                  ? 'text-[#C2410C] bg-[#FFF7ED] dark:bg-[#25150D]'
                  : 'text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]'
                }`}
              title="Cari dalam folder"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => setFolderHeaderMenuOpen((prev) => !prev)}
              className="p-2 -mr-1 rounded-full text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] active:scale-90 transition-transform"
              title="Menu folder"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Folder Header Dropdown Popup (Rename & Delete) */}
          {folderHeaderMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setFolderHeaderMenuOpen(false)}
              />
              <div className="absolute top-13 right-3 z-50 w-52 bg-white dark:bg-[#161622] rounded-[16px] shadow-2xl border border-[#E8E8EC] dark:border-[#22222E] p-1.5 animate-enter">
                <button
                  type="button"
                  onClick={() => {
                    setFolderHeaderMenuOpen(false);
                    openRenameFolder(currentFolder);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-left hover:bg-[#F4F4F5] dark:hover:bg-[#1E1E2A] text-[#0A0A0A] dark:text-[#FAFAFA]"
                >
                  <Edit2 className="w-4 h-4 text-[#C2410C]" />
                  <span>{lang === 'en' ? 'Rename Folder' : 'Ubah Nama Folder'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFolderHeaderMenuOpen(false);
                    handleDeleteFolder(currentFolder.id, currentFolder.name);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-left hover:bg-[#FEF2F2] dark:hover:bg-[#2A0F0F] text-[#EF4444]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Delete Folder' : 'Hapus Folder'}</span>
                </button>
              </div>
            </>
          )}

          {/* Expandable Folder Search Bar */}
          {folderSearchOpen && (
            <div className="absolute top-14 inset-x-0 bg-white dark:bg-[#0B0B0E] border-b border-[#E8E8EC] dark:border-[#1E1E28] px-3.5 py-2 z-30 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center h-9 px-3 rounded-full bg-[#F4F4F6] dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] focus-within:border-[#C2410C]">
                <Search className="w-3.5 h-3.5 text-[#8E8E9E] shrink-0 mr-2" />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Cari di ${currentFolder.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-none text-[12.5px] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#8E8E9E]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-[#8E8E9E] hover:text-[#C2410C] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      {/* 2. SUB-HEADER TOOLBAR (Google Drive Style: Name ↑/Sort Button on Left, List/Grid Pill on Right) */}
      <div className="px-4 py-2 flex items-center justify-between gap-2 border-b border-[#EFEFEF] dark:border-[#161620]">
        {/* Sort Button (Cycles independently: Name A-Z -> Name Z-A -> Date Modified) */}
        <button
          onClick={handleToggleSort}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F4F6] dark:bg-[#14141B] hover:bg-[#EBEBEF] dark:hover:bg-[#1C1C26] active:scale-95 transition-all text-[#0A0A0A] dark:text-[#FAFAFA] text-[13px] font-medium border border-[#E8E8EC] dark:border-[#22222E]"
        >
          <span>{getSortLabel()}</span>
          {activeSortOption === 'name_asc' ? (
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5] text-[#C2410C]" />
          ) : activeSortOption === 'name_desc' ? (
            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5] text-[#C2410C]" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 stroke-[2.5] text-[#8E8E9E]" />
          )}
        </button>

        {/* View Mode Segmented Pill (List vs Grid, independent per depth) */}
        <div className="flex items-center bg-[#F4F4F6] dark:bg-[#14141B] p-1 rounded-full border border-[#E8E8EC] dark:border-[#22222E]">
          <button
            onClick={() => changeViewMode('list')}
            className={`p-1.5 rounded-full transition-all ${activeViewMode === 'list'
                ? 'bg-white dark:bg-[#252534] text-[#C2410C] dark:text-white shadow-sm'
                : 'text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
            title="List View"
          >
            <List className="w-4 h-4 stroke-[2.2]" />
          </button>
          <button
            onClick={() => changeViewMode('grid')}
            className={`p-1.5 rounded-full transition-all ${activeViewMode === 'grid'
                ? 'bg-white dark:bg-[#252534] text-[#C2410C] dark:text-white shadow-sm'
                : 'text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT: FOLDERS & FILES */}
      <div className="p-3 space-y-4">
        {loading ? (
          <MediaGridSkeleton count={8} />
        ) : (
          <>
            {/* VIEW MODE: LIST (Screenshot 2 Style) */}
            {activeViewMode === 'list' ? (
              <div className="space-y-1">
                {/* A. Folders List (only when at root) */}
                {!currentFolder && sortedFolders.length > 0 && (
                  <div className="mb-2">
                    {sortedFolders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => handleFolderClick(folder)}
                        onTouchStart={(e) => handleTouchStartFolder(folder, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (Date.now() - longPressTriggeredTimeRef.current > 1000) {
                            longPressTriggeredTimeRef.current = Date.now();
                            openFolderMenu(folder);
                          }
                        }}
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                        className="flex items-center justify-between py-2.5 px-3 rounded-[14px] hover:bg-black/5 dark:hover:bg-[#14141B] active:bg-black/5 dark:active:bg-[#14141B] transition-colors cursor-pointer group select-none"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Folder Icon Squircle */}
                          <div className="w-11 h-11 rounded-[14px] bg-[#F4F4F6] dark:bg-[#181822] border border-[#E8E8EC] dark:border-[#22222E] flex items-center justify-center shrink-0 text-[#C4C4CC] dark:text-[#A1A1AA] group-hover:text-[#C2410C] transition-colors">
                            <Folder className="w-5 h-5 fill-[#E4E4E7] dark:fill-[#252532]" />
                          </div>
                          {/* Title & Modified Date */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-[#0A0A0A] dark:text-[#F4F4F5] truncate leading-tight">
                              {folder.name}
                            </p>
                            <p className="text-[11px] text-[#8E8E9E] mt-0.5 font-mono">
                              {formatDriveDate(folder.created_at, lang)}
                              {folder.media_count !== undefined ? ` • ${folder.media_count} file` : ''}
                            </p>
                          </div>
                        </div>

                        {/* 3-Dots Menu */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFolderMenu(folder);
                          }}
                          className="p-2 text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#F4F4F5] active:scale-90 transition-transform"
                          title="Opsi folder"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* B. Files List */}
                {sortedFiles.map((file, idx) => {
                  const isSelected = selectedFileIds.has(file.id);

                  return (
                    <div
                      key={file.id}
                      onClick={() => handleFileClick(file, idx)}
                      onTouchStart={(e) => handleTouchStart(file, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (Date.now() - longPressTriggeredTimeRef.current > 1000) {
                          longPressTriggeredTimeRef.current = Date.now();
                          handleLongPressFile(file);
                        }
                      }}
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-[14px] hover:bg-black/5 dark:hover:bg-[#14141B] active:bg-black/5 dark:active:bg-[#14141B] transition-colors cursor-pointer group select-none ${
                        isSelected ? 'bg-[#FFF7ED] dark:bg-[#25150D] ring-2 ring-[#C2410C]/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Selection Checkbox (Visible in selection mode) */}
                        {isSelectionMode && (
                          <div className="shrink-0 pointer-events-none mr-0.5">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[#CBD5E1] dark:border-[#3F3F46]" />
                            )}
                          </div>
                        )}

                        {/* Media Icon Badge / Thumbnail (All files including PDF & DOCX with thumbnails render WebP) */}
                        <div
                          className={`w-11 h-11 rounded-[14px] overflow-hidden flex items-center justify-center shrink-0 border border-[#E8E8EC] dark:border-[#22222E] relative ${file.media_type === 'image'
                              ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#EA580C]'
                              : file.media_type === 'video'
                                ? 'bg-[#FAF5FF] dark:bg-[#1E1428] text-[#A855F7]'
                                : 'bg-[#EFF6FF] dark:bg-[#101B2E] text-[#3B82F6]'
                            }`}
                        >
                          {file.thumbnail_path ? (
                            <div className="w-full h-full relative">
                              <img
                                src={api.getThumbnailUrl(file.id)}
                                alt={file.display_name}
                                draggable="false"
                                className="w-full h-full object-cover object-top pointer-events-none select-none"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                              {file.media_type === 'video' && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                                </div>
                              )}
                              <div className="w-full h-full hidden items-center justify-center">
                                <FileText className="w-5 h-5" />
                              </div>
                            </div>
                          ) : file.media_type === 'image' ? (
                            <Image className="w-5 h-5" />
                          ) : file.media_type === 'video' ? (
                            <Video className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>

                        {/* Filename & Modified Date */}
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[#0A0A0A] dark:text-[#F4F4F5] truncate leading-tight">
                            {file.display_name || file.original_name}
                          </p>
                          <p className="text-[11px] text-[#8E8E9E] mt-0.5 font-mono">
                            {formatDriveDate(file.captured_at || file.created_at, lang)} • {formatBytes(file.file_size)}
                          </p>
                        </div>
                      </div>

                      {/* 3-Dots Menu */}
                      {!isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onLongPress) onLongPress(file);
                          }}
                          className="p-2 text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#F4F4F5] active:scale-90 transition-transform"
                          title="Opsi file"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VIEW MODE: GRID (Screenshot 3 Style) */
              <div className="space-y-4">
                {/* A. Folders Grid (Screenshot 3 top cards, only when at root) */}
                {!currentFolder && sortedFolders.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {sortedFolders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => handleFolderClick(folder)}
                        onTouchStart={(e) => handleTouchStartFolder(folder, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (Date.now() - longPressTriggeredTimeRef.current > 1000) {
                            longPressTriggeredTimeRef.current = Date.now();
                            openFolderMenu(folder);
                          }
                        }}
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                        className="rounded-[18px] bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] p-3 flex flex-col justify-between h-[126px] cursor-pointer active:scale-[0.98] transition-all hover:border-[#C2410C]/40 dark:hover:border-[#333342] select-none shadow-xs"
                      >
                        {/* Top row: folder icon + name + 3 dots */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Folder className="w-4 h-4 text-[#8E8E9E] shrink-0" />
                            <span className="text-[12.5px] font-semibold text-[#0A0A0A] dark:text-[#F4F4F5] truncate">
                              {folder.name}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openFolderMenu(folder);
                            }}
                            className="p-1 -mr-1 text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#F4F4F5] shrink-0 active:scale-90"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Centered big folder graphic */}
                        <div className="flex-1 flex items-center justify-center py-2">
                          <Folder className="w-13 h-13 text-[#E8E8EC] dark:text-[#252534] fill-[#E4E4E7] dark:fill-[#20202E] stroke-[1.4]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* B. Media Grid (Screenshot 3 bottom cards) */}
                <div className="grid grid-cols-2 gap-3">
                  {sortedFiles.map((file, idx) => {
                    const isSelected = selectedFileIds.has(file.id);

                    return (
                      <div
                        key={file.id}
                        onClick={() => handleFileClick(file, idx)}
                        onTouchStart={(e) => handleTouchStart(file, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (Date.now() - longPressTriggeredTimeRef.current > 1000) {
                            longPressTriggeredTimeRef.current = Date.now();
                            handleLongPressFile(file);
                          }
                        }}
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                        className={`rounded-[18px] bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] p-2.5 flex flex-col h-[180px] cursor-pointer active:scale-[0.98] transition-all hover:border-[#C2410C]/40 dark:hover:border-[#333342] select-none shadow-xs relative ${
                          isSelected ? 'ring-3 ring-[#C2410C] ring-offset-2 dark:ring-offset-[#0B0B0E] scale-[0.97]' : ''
                        }`}
                      >
                        {/* Top row: badge + filename + checkbox/3 dots */}
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div
                              className={`w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 ${file.media_type === 'image'
                                  ? 'bg-[#EF4444] text-white'
                                  : file.media_type === 'video'
                                    ? 'bg-[#A855F7] text-white'
                                    : 'bg-[#3B82F6] text-white'
                                }`}
                            >
                              {file.media_type === 'image' ? (
                                <Image className="w-2.5 h-2.5" />
                              ) : file.media_type === 'video' ? (
                                <Video className="w-2.5 h-2.5" />
                              ) : (
                                <FileText className="w-2.5 h-2.5" />
                              )}
                            </div>
                            <span className="text-[11.5px] font-medium text-[#0A0A0A] dark:text-[#F4F4F5] truncate">
                              {file.display_name || file.original_name}
                            </span>
                          </div>

                          {isSelectionMode ? (
                            <div className="shrink-0 pointer-events-none">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-[#C2410C] text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-[#CBD5E1] dark:border-[#3F3F46]" />
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onLongPress) onLongPress(file);
                              }}
                              className="p-1 -mr-1 text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#F4F4F5] shrink-0 active:scale-90"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Card Preview Box: Renders WebP thumbnail for images, videos, AND documents (PDF, DOCX, etc.) */}
                        <div className="flex-1 rounded-[12px] overflow-hidden bg-[#F4F4F6] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1A1A24] flex items-center justify-center relative">
                          {file.thumbnail_path ? (
                            <div className="relative w-full h-full">
                              <img
                                src={api.getThumbnailUrl(file.id)}
                                alt={file.display_name}
                                draggable="false"
                                className="w-full h-full object-cover object-top pointer-events-none select-none"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                              {file.media_type === 'video' && (
                                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                  <div className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                                    <Play className="w-3 h-3 fill-white ml-0.5" />
                                  </div>
                                </div>
                              )}
                              <div className="w-full h-full hidden flex-col items-center justify-center p-2 text-center">
                                <FileText className="w-7 h-7 text-[#3B82F6] mb-1" />
                                <span className="text-[10px] text-[#8E8E9E] font-mono">
                                  {file.original_name?.split('.').pop()?.toUpperCase() || 'DOC'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                              {file.media_type === 'image' ? (
                                <Image className="w-7 h-7 text-[#EF4444] mb-1" />
                              ) : file.media_type === 'video' ? (
                                <Video className="w-7 h-7 text-[#A855F7] mb-1" />
                              ) : (
                                <>
                                  <FileText className="w-7 h-7 text-[#3B82F6] mb-1" />
                                  <span className="text-[10px] text-[#8E8E9E] font-mono">
                                    {file.original_name?.split('.').pop()?.toUpperCase() || 'DOC'}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {sortedFiles.length === 0 && (!folders.length || currentFolder) && (
              <div className="text-center py-16 px-4 bg-white dark:bg-[#14141B] border border-dashed border-[#E8E8EC] dark:border-[#22222E] rounded-[20px] my-6">
                <Folder className="w-12 h-12 text-[#C2410C] mx-auto mb-3 opacity-40" />
                <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {currentFolder ? 'Folder ini masih kosong' : 'Belum ada file'}
                </h4>
                <p className="text-[12px] text-[#8E8E9E] mt-1 max-w-xs mx-auto">
                  Ketuk tombol <span className="text-[#C2410C] font-semibold">+</span> di kanan bawah untuk mengunggah berkas atau membuat folder baru.
                </p>
                {currentFolder && (
                  <button
                    onClick={() => {
                      if (directFileInputRef.current) {
                        directFileInputRef.current.click();
                      } else {
                        setActionSheetOpen(true);
                      }
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-tr from-[#C2410C] to-[#EA580C] text-white text-[12px] font-semibold shadow-md active:scale-95"
                  >
                    <Upload className="w-4 h-4 stroke-[2.2]" />
                    <span>Upload ke {currentFolder.name}</span>
                  </button>
                )}
              </div>
            )}

            {/* Infinite Scroll Sentinel */}
            {files.length > 0 && (
              <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-2">
                {loadingMore && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] shadow-xs text-[12px] text-[#8E8E9E]">
                    <div className="w-4 h-4 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin" />
                    <span>Memuat berkas lainnya...</span>
                  </div>
                )}
                {!hasMore && (
                  <div className="text-[11px] text-[#8E8E9E] font-mono tracking-wide py-2">
                    ✓ Semua berkas telah dimuat ({files.length} berkas)
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. GOOGLE DRIVE "+" FLOATING ACTION BUTTON (FAB) & TRANSFER PROGRESS */}
      {(() => {
        const isTransferring = isUploading || isDownloading;
        const isSpecialState = isTransferring || hasFailure;

        const radius = 26;
        const circumference = 2 * Math.PI * radius;
        const displayProgress = Math.max(5, Math.min(100, overallProgress || 0));
        const strokeOffset = circumference - (circumference * displayProgress) / 100;

        let ringColor = '#EA580C';
        let bgGradient = 'bg-gradient-to-tr from-[#C2410C] to-[#EA580C]';
        let shadowGlow = 'shadow-[0_8px_25px_rgba(194,65,12,0.45)]';

        if (hasFailure) {
          ringColor = '#EF4444';
          bgGradient = 'bg-gradient-to-tr from-[#DC2626] to-[#EF4444]';
          shadowGlow = 'shadow-[0_8px_25px_rgba(239,68,68,0.5)]';
        } else if (isDownloading) {
          ringColor = '#10B981';
          bgGradient = 'bg-gradient-to-tr from-[#059669] to-[#34D399]';
          shadowGlow = 'shadow-[0_8px_25px_rgba(16,185,129,0.5)]';
        }

        const isFabVisible = !isSelectionMode && (showNavbar || isSpecialState);

        return (
          <button
            onClick={() => setActionSheetOpen(true)}
            className={`fixed bottom-[84px] right-4 z-40 w-14 h-14 ${isSpecialState ? 'rounded-full' : 'rounded-[20px]'
              } ${bgGradient} text-white ${shadowGlow} flex items-center justify-center active:scale-90 transition-all duration-300 ease-out select-none ${isFabVisible
                ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
                : 'translate-y-16 opacity-0 scale-75 pointer-events-none'
              }`}
            title={
              hasFailure
                ? 'Tambah baru (Transfer sebelumnya gagal)'
                : isUploading
                  ? `Mengunggah (${displayProgress}%) - Ketuk untuk tambah baru`
                  : isDownloading
                    ? `Mengunduh (${displayProgress}%) - Ketuk untuk tambah baru`
                    : 'Tambah berkas atau folder baru'
            }
          >
            {/* SVG Circular Progress Ring (Visible when transferring or failed) */}
            {isSpecialState && (
              <svg
                viewBox="0 0 58 58"
                className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              >
                <circle
                  cx="29"
                  cy="29"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="29"
                  cy="29"
                  r={radius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-300 ease-out"
                />
              </svg>
            )}

            {hasFailure ? (
              <AlertCircle className="w-6 h-6 stroke-[2.4] text-white animate-bounce" />
            ) : isDownloading ? (
              <ArrowDown className="w-6 h-6 stroke-[2.5] text-white animate-pulse" />
            ) : isUploading ? (
              <ArrowUp className="w-6 h-6 stroke-[2.5] text-white" />
            ) : (
              <Plus className="w-7 h-7 stroke-[2.6]" />
            )}
          </button>
        );
      })()}

      {/* Hidden Native File Input for Direct Android Upload */}
      <input
        ref={directFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleDirectUploadChange}
      />

      {/* 5. ACTION SHEET MODAL: UPLOAD OR BUAT FOLDER */}
      {actionSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-enter"
          onClick={() => setActionSheetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#14141B] border-t border-[#E8E8EC] dark:border-[#22222E] rounded-t-[24px] p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 rounded-full bg-[#E8E8EC] dark:bg-[#2A2A38] mx-auto mb-4" />
            <h3 className="font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA] mb-4">
              {lang === 'en' ? 'Create or Upload' : 'Tambah Baru'}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-2">
              {/* Upload Berkas -> triggers Android Native File Chooser */}
              <button
                onClick={() => {
                  setActionSheetOpen(false);
                  if (directFileInputRef.current) {
                    directFileInputRef.current.click();
                  } else if (onOpenUpload) {
                    onOpenUpload(currentFolder);
                  }
                }}
                className="p-4 rounded-[16px] bg-[#F4F4F6] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#252534] flex flex-col items-center justify-center text-center gap-2 hover:border-[#C2410C]/40 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#FFF7ED] dark:bg-[#2A140A] text-[#C2410C] flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="font-semibold text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {lang === 'en' ? 'Upload Files' : 'Upload Berkas'}
                </span>
                <span className="text-[11px] text-[#8E8E9E]">
                  {currentFolder ? `ke ${currentFolder.name}` : 'Pilih dari perangkat'}
                </span>
              </button>

              {/* Buat Folder */}
              <button
                onClick={() => {
                  setActionSheetOpen(false);
                  setCreateModalOpen(true);
                }}
                className="p-4 rounded-[16px] bg-[#F4F4F6] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#252534] flex flex-col items-center justify-center text-center gap-2 hover:border-[#3B82F6]/40 active:scale-95 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#EFF6FF] dark:bg-[#101B2E] text-[#3B82F6] flex items-center justify-center shadow-xs">
                  <FolderPlus className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="font-semibold text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {lang === 'en' ? 'New Folder' : 'Folder Baru'}
                </span>
                <span className="text-[11px] text-[#8E8E9E]">
                  {lang === 'en' ? 'Organize files' : 'Kelompokkan berkas'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActionSheetOpen(false)}
              className="mt-3 w-full h-10 rounded-[12px] bg-[#F4F4F6] dark:bg-[#181822] text-[13px] font-semibold text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] active:scale-[0.99]"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 5B. POPUP ACTION SHEET UNTUK BERKAS UMUM (ZIP, APK, TAR, DLL) */}
      {genericFileSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-enter"
          onClick={closeGenericFileSheet}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#14141B] border-t border-[#E8E8EC] dark:border-[#22222E] rounded-t-[24px] p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1 rounded-full bg-[#E8E8EC] dark:bg-[#2A2A38] mx-auto mb-4" />

            {/* Header info */}
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-[#E8E8EC] dark:border-[#22222E]">
              <div className="w-12 h-12 rounded-[14px] bg-[#FFF7ED] dark:bg-[#2A140A] text-[#C2410C] flex items-center justify-center shrink-0 border border-[#C2410C]/20">
                <FileText className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                  {genericFileSheet.display_name || genericFileSheet.original_name}
                </p>
                <p className="text-[11px] text-[#8E8E9E] font-mono mt-0.5">
                  {formatBytes(genericFileSheet.file_size)} • {formatDriveDate(genericFileSheet.created_at, lang)}
                </p>
                <p className="text-[11px] text-[#C2410C] font-mono mt-0.5 truncate">
                  📁 {genericFileSheet.category_names || currentFolder?.name || 'Folder Utama (Root)'}
                </p>
              </div>
              <button
                onClick={closeGenericFileSheet}
                className="p-1.5 text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] rounded-full active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Action Buttons: download, favorite, delete, move to folder */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Unduh */}
              <button
                onClick={() => {
                  startDownload(genericFileSheet);
                  closeGenericFileSheet();
                }}
                className="p-3.5 rounded-[16px] bg-[#F4F4F6] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#252534] flex items-center gap-3 hover:border-[#10B981]/50 active:scale-95 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#ECFDF5] dark:bg-[#06291C] text-[#10B981] flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">Unduh File</p>
                  <p className="text-[10px] text-[#8E8E9E]">Simpan ke perangkat</p>
                </div>
              </button>

              {/* 2. Favorit */}
              <button
                onClick={() => {
                  if (onToggleFavorite) onToggleFavorite(genericFileSheet);
                  closeGenericFileSheet();
                }}
                className="p-3.5 rounded-[16px] bg-[#F4F4F6] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#252534] flex items-center gap-3 hover:border-[#EF4444]/50 active:scale-95 transition-all text-left"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${genericFileSheet.is_favorite ? 'bg-[#FEF2F2] dark:bg-[#2A0E0E] text-[#EF4444]' : 'bg-[#F4F4F6] dark:bg-[#1A1A24] text-[#8E8E9E]'}`}>
                  <Heart className={`w-4 h-4 stroke-[2.2] ${genericFileSheet.is_favorite ? 'fill-[#EF4444]' : ''}`} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                    {genericFileSheet.is_favorite ? 'Hapus Favorit' : 'Favorit'}
                  </p>
                  <p className="text-[10px] text-[#8E8E9E]">Beri bintang</p>
                </div>
              </button>

              {/* 3. Pindahkan ke Folder */}
              <button
                onClick={() => {
                  if (onOrganize) onOrganize(genericFileSheet);
                  closeGenericFileSheet();
                }}
                className="p-3.5 rounded-[16px] bg-[#F4F4F6] dark:bg-[#1A1A24] border border-[#E8E8EC] dark:border-[#252534] flex items-center gap-3 hover:border-[#3B82F6]/50 active:scale-95 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#EFF6FF] dark:bg-[#101B2E] text-[#3B82F6] flex items-center justify-center shrink-0">
                  <Folder className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">Pindah Folder</p>
                  <p className="text-[10px] text-[#8E8E9E]">Atur kategori</p>
                </div>
              </button>

              {/* 4. Hapus */}
              <button
                onClick={() => {
                  if (onDelete) onDelete(genericFileSheet.id);
                  closeGenericFileSheet();
                }}
                className="p-3.5 rounded-[16px] bg-[#FEF2F2] dark:bg-[#1F1010] border border-[#EF4444]/20 flex items-center gap-3 hover:border-[#EF4444]/50 active:scale-95 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#FEE2E2] dark:bg-[#2A0E0E] text-[#EF4444] flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#EF4444]">Hapus File</p>
                  <p className="text-[10px] text-[#EF4444]/70">Pindah ke sampah</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL BUAT FOLDER */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-enter"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] rounded-[18px] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E8EC] dark:border-[#22222E]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#C2410C]" />
                <h3 className="font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                  Folder Baru
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#8E8E9E] mb-1.5">
                  Nama Folder
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Misal: Dokumen Penting, Liburan..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input-artisan w-full text-[13px] bg-[#F4F4F6] dark:bg-[#181822] border-[#E8E8EC] dark:border-[#22222E] rounded-[10px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary text-[13px] h-9 px-4 rounded-[10px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingFolder || !newFolderName.trim()}
                  className="btn-primary text-[13px] h-9 px-4 rounded-[10px]"
                >
                  {submittingFolder ? 'Membuat...' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. FOLDER OPTIONS BOTTOM SHEET (from 3 dots on a folder item) */}
      {folderMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-enter"
          onClick={closeFolderMenu}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#14141B] border-t border-[#E8E8EC] dark:border-[#22222E] rounded-t-[20px] px-4 pt-3 pb-7 shadow-modal"
          >
            <div className="w-10 h-1 rounded-full bg-[#E8E8EC] dark:bg-[#2A2A38] mx-auto mb-4" />
            <div className="flex items-center gap-3 pb-3 mb-2 border-b border-[#E8E8EC] dark:border-[#22222E]">
              <div className="w-10 h-10 rounded-[12px] bg-[#FFF7ED] dark:bg-[#2A1208] border border-[#C2410C]/15 text-[#C2410C] flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 fill-[#C2410C]/20" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                  {folderMenu.name}
                </p>
                <p className="text-[10px] text-[#8E8E9E] font-mono mt-0.5">
                  {folderMenu.media_count || 0} file • {formatDriveDate(folderMenu.created_at, lang)}
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
              className="w-full flex items-center gap-3 px-3 py-3 rounded-[10px] text-[14px] font-medium text-left text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F4F4F6] dark:hover:bg-[#181822] active:bg-[#F4F4F5] dark:active:bg-[#181822]"
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
              className="w-full flex items-center gap-3 px-3 py-3 rounded-[10px] text-[14px] font-medium text-left text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#2A0F0F] active:bg-[#FEF2F2] dark:active:bg-[#2A0F0F]"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Folder
            </button>

            <button
              type="button"
              onClick={closeFolderMenu}
              className="mt-2 w-full h-10 rounded-[10px] bg-[#F4F4F6] dark:bg-[#181822] text-[13px] font-semibold text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] active:scale-[0.99]"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 8. MODAL UBAH NAMA FOLDER */}
      {folderToRename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-enter"
          onClick={() => setFolderToRename(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] rounded-[18px] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E8EC] dark:border-[#22222E]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C2410C]" />
                <h3 className="font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                  Ubah Nama Folder
                </h3>
              </div>
              <button
                onClick={() => setFolderToRename(null)}
                className="p-1 text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameFolder} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#8E8E9E] mb-1.5">
                  Nama Folder Baru
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  className="input-artisan w-full text-[13px] bg-[#F4F4F6] dark:bg-[#181822] border-[#E8E8EC] dark:border-[#22222E] rounded-[10px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderToRename(null)}
                  className="btn-secondary text-[13px] h-9 px-4 rounded-[10px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={renamingFolder || !renameFolderName.trim()}
                  className="btn-primary text-[13px] h-9 px-4 rounded-[10px]"
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
