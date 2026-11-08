import React, { useState, useEffect, useMemo } from 'react';
import { Folder, FolderPlus, ArrowLeft, Trash2, Layers, LayoutGrid, List } from 'lucide-react';
import MobileMediaCard from './MobileMediaCard';
import MobileMediaListItem from './MobileMediaListItem';
import MobilePagination from './MobilePagination';
import { api } from '../api';
import { AlbumsSkeleton, MediaGridSkeleton, MediaListSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { triggerMediaEvent, subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';

export default function MobileAlbumsView({
  onOpenViewer,
  onOpenText,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onLongPress
}) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('mycloud_active_album');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [categoryMedia, setCategoryMedia] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('album');
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  const loadCategories = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.listCategories();
      const list = data.categories || [];
      setCategories(list);
      if (selectedCategory) {
        const found = list.find((c) => c.id === selectedCategory.id);
        if (found) {
          loadCategoryMedia(found, true);
        } else if (list.length > 0) {
          setSelectedCategory(null);
          localStorage.removeItem('mycloud_active_album');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      localStorage.setItem('mycloud_active_album', JSON.stringify({ id: selectedCategory.id, name: selectedCategory.name }));
    } else {
      localStorage.removeItem('mycloud_active_album');
    }
  }, [selectedCategory]);

  const loadCategoryMedia = async (cat, silent = false) => {
    setSelectedCategory(cat);
    if (cat) {
      recordRecentItem({ folder_id: cat.id, name: cat.name, is_folder: true });
    }
    if (!silent) setLoading(true);
    try {
      const data = await api.listMedia({ category_id: cat.id });
      setCategoryMedia(data.media || []);
      if (!silent) setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const unsub = subscribeMediaEvent((event) => {
      if (event.type === 'favorite') {
        setCategoryMedia((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, is_favorite: event.is_favorite } : m))
        );
      } else if (event.type === 'delete' || event.type === 'lock') {
        setCategoryMedia((prev) => prev.filter((m) => m.id !== event.id));
      } else if (event.type === 'rename') {
        setCategoryMedia((prev) =>
          prev.map((m) => (m.id === event.id ? { ...m, display_name: event.name } : m))
        );
      } else if (['upload', 'restore', 'unlock', 'rename_rollback', 'folder', 'organize'].includes(event.type)) {
        loadCategories(true);
        if (selectedCategory) {
          loadCategoryMedia(selectedCategory, true);
        }
      }
    });
    return unsub;
  }, [selectedCategory]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await api.createCategory(newCatName.trim(), newCatType);
      triggerMediaEvent({ type: 'folder' });
      setNewCatName('');
      setIsCreating(false);
      loadCategories();
    } catch (e) {}
  };

  const handleDeleteCategory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Hapus album ini?')) return;

    try {
      await api.deleteCategory(id);
      triggerMediaEvent({ type: 'folder' });
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
      }
      loadCategories();
    } catch (e) {}
  };

  const handleMediaClick = (media, idx) => {
    if (media.media_type === 'document') {
      recordRecentItem(media);
      if (isTxtFile(media) && onOpenText) {
        onOpenText(media);
      } else {
        window.open(api.getStreamUrl(media.id), '_blank');
      }
    } else if (onOpenViewer) {
      onOpenViewer(categoryMedia, idx);
    }
  };

  const totalItems = categoryMedia.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return categoryMedia.slice(startIndex, startIndex + pageSize);
  }, [categoryMedia, currentPage, pageSize]);

  // If viewing a single album
  if (selectedCategory) {
    return (
      <div className="p-4 pb-24 max-w-md mx-auto animate-enter">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E7E5E4] dark:border-[#1F1F1F]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1.5 text-[#57534E] dark:text-[#A1A1AA] hover:text-[#1C1917] dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-serif font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] truncate max-w-[180px]">
                  {selectedCategory.name}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] rounded border border-[#C2410C]/20">
                  {selectedCategory.type}
                </span>
              </div>
              <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                {categoryMedia.length} berkas
              </span>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#14141A] p-0.5 rounded-[6px] border border-[#E8E8EC] dark:border-[#1F1F27]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[4px] transition-colors ${
                viewMode === 'grid' ? 'bg-[#C2410C] text-white shadow-primary-glow' : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[4px] transition-colors ${
                viewMode === 'list' ? 'bg-[#C2410C] text-white shadow-primary-glow' : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          viewMode === 'grid' ? <MediaGridSkeleton count={6} /> : <MediaListSkeleton count={6} />
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
            <Layers className="w-10 h-10 text-[#C2410C] mx-auto mb-2" />
            <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
              Album Kosong
            </h4>
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
              Tambahkan foto atau video ke album ini dari menu Galeri.
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 gap-3">
                {paginatedItems.map((m) => {
                  const globalIdx = categoryMedia.findIndex((item) => item.id === m.id);
                  return (
                    <MobileMediaCard
                      key={m.id}
                      media={m}
                      onClick={() => handleMediaClick(m, globalIdx)}
                      onToggleFavorite={onToggleFavorite}
                      onLock={onLock}
                      onOrganize={onOrganize}
                      onDelete={onDelete}
                      onRename={onRename}
                      onLongPress={onLongPress}
                    />
                  );
                })}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-2.5">
                {paginatedItems.map((m) => {
                  const globalIdx = categoryMedia.findIndex((item) => item.id === m.id);
                  return (
                    <MobileMediaListItem
                      key={m.id}
                      media={m}
                      onClick={() => handleMediaClick(m, globalIdx)}
                      onToggleFavorite={onToggleFavorite}
                      onLock={onLock}
                      onOrganize={onOrganize}
                      onDelete={onDelete}
                      onRename={onRename}
                      onLongPress={onLongPress}
                    />
                  );
                })}
              </div>
            )}

            <MobilePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </div>
    );
  }

  // All Albums Overview
  return (
    <div className="p-4 pb-24 max-w-md mx-auto animate-enter">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-xl text-[#0A0A0A] dark:text-[#FAFAFA]">
              Album & Folder
            </h2>
          </div>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
            Koleksi album dan pengelompokan media Anda.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="btn-primary text-[12px] h-[34px] px-3"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Buat</span>
        </button>
      </div>

      {/* Inline Create Album Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="mb-4 p-3 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] space-y-2 animate-enter">
          <input
            type="text"
            placeholder="Nama album baru..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="input-artisan w-full h-[36px] text-[13px]"
          />
          <div className="flex items-center gap-2">
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value)}
              className="input-artisan h-[36px] text-[12px] px-2 bg-white dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white flex-1"
            >
              <option value="album">Album</option>
              <option value="folder">Folder</option>
              <option value="genre">Genre</option>
            </select>
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="btn-primary h-[36px] px-4 text-[13px]"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="btn-ghost h-[36px] px-2 text-[12px]"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Grid of Albums */}
      {loading ? (
        <AlbumsSkeleton count={4} />
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-6">
          <Folder className="w-10 h-10 text-[#C2410C] mx-auto mb-2" />
          <h4 className="font-serif font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
            Belum ada Album
          </h4>
          <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Tekan tombol <strong>Buat</strong> di atas untuk membuat album pertama.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => loadCategoryMedia(cat)}
              className="card-artisan p-3 cursor-pointer hover:border-[#C2410C] transition-all relative flex flex-col justify-between h-28 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-[6px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20">
                  <Folder className="w-4 h-4" />
                </div>
                <button
                  onClick={(e) => handleDeleteCategory(cat.id, e)}
                  className="p-1 text-[#9C9C9C] hover:text-[#EF4444]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h4 className="font-serif font-semibold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate leading-tight">
                  {cat.name}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
                  <span className="font-mono">{cat.media_count || 0} berkas</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-[#FAFAFA] dark:bg-[#14141A] border border-[#E8E8EC] dark:border-[#1F1F27] rounded">
                    {cat.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
