import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, ArrowLeft, Trash2, Layers } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';
import { AlbumsSkeleton, MediaGridSkeleton } from '../components/SkeletonLoader';
import { recordRecentItem } from '../utils/recentHistory';
import { triggerMediaEvent, subscribeMediaEvent } from '../utils/mediaEvents';
import { isTxtFile } from '../utils/textFile';
import { useLanguage } from '../context/LanguageContext';

export default function AlbumsPage({
  onOpenViewer,
  onOpenText,
  onToggleFavorite,
  onLock,
  onOrganize,
  onDelete,
  onRename,
  onContextMenu,
  onShowDetail
}) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryMedia, setCategoryMedia] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('album');
  const [loading, setLoading] = useState(true);

  const loadCategories = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.listCategories();
      setCategories(data.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadCategoryMedia = async (cat, silent = false) => {
    setSelectedCategory(cat);
    if (cat) {
      recordRecentItem({ folder_id: cat.id, name: cat.name, is_folder: true });
    }
    if (!silent) setLoading(true);
    try {
      const data = await api.listMedia({ category_id: cat.id });
      setCategoryMedia(data.media || []);
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
      loadCategories();
    } catch (e) {}
  };

  const handleDeleteCategory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(t('deleteAlbumConfirm', 'Hapus album/kategori ini? File foto & video tidak akan terhapus.'))) return;

    try {
      await api.deleteCategory(id);
      triggerMediaEvent({ type: 'folder' });
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
      }
      loadCategories();
    } catch (e) {}
  };

  if (selectedCategory) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-enter">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className="btn-ghost p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#C2410C]" />
                <h2 className="font-serif font-bold text-2xl text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {selectedCategory.name}
                </h2>
                <span className="text-[11px] uppercase tracking-wider font-bold bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] px-2 py-0.5 rounded border border-[#C2410C]/20">
                  {selectedCategory.type}
                </span>
              </div>
              <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
                {categoryMedia.length} {t('albumMediaCount', 'berkas media dalam album ini.')}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <MediaGridSkeleton count={6} />
        ) : categoryMedia.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
            <Layers className="w-12 h-12 text-[#C2410C] mx-auto mb-3" />
            <h4 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('albumEmptyTitle', 'Album Masih Kosong')}
            </h4>
            <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1 max-w-sm mx-auto">
              {t('albumEmptyHint', 'Buka Galeri Utama, pilih menu titik tiga pada file dan klik "Atur ke Album" untuk menambahkan file ke album ini.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categoryMedia.map((m, idx) => (
              <MediaCard
                key={m.id}
                media={m}
                onClick={() => {
                  if (m.media_type === 'document') {
                    recordRecentItem(m);
                    if (isTxtFile(m) && onOpenText) {
                      onOpenText(m);
                    } else {
                      window.open(api.getStreamUrl(m.id), '_blank');
                    }
                  } else {
                    onOpenViewer(categoryMedia, idx);
                  }
                }}
                onToggleFavorite={onToggleFavorite}
                onLock={onLock}
                onOrganize={onOrganize}
                onDelete={onDelete}
                onRename={onRename}
                onContextMenu={onContextMenu}
                onShowDetail={onShowDetail}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-enter">
      {/* Header & Create Form */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-2">
            <Folder className="w-6 h-6 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-2xl text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('albumTitle', 'Album & Folder Kategori')}
            </h2>
          </div>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            {t('albumSubtitle', 'Organisir foto dan video Anda ke dalam koleksi tema atau genre.')}
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={t('newAlbumPlaceholder', 'Nama album baru...')}
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="input-artisan h-[38px] text-[13px] w-48"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value)}
            className="input-artisan h-[38px] text-[13px] px-2 bg-white dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
          >
            <option value="album">{t('albumLabel', 'Album')}</option>
            <option value="folder">{t('folderLabel', 'Folder')}</option>
            <option value="genre">{t('genreLabel', 'Genre')}</option>
          </select>
          <button
            type="submit"
            disabled={!newCatName.trim()}
            className="btn-primary text-[13px] h-[38px] px-3.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t('createBtn', 'Buat')}</span>
          </button>
        </form>
      </div>

      {/* Grid of Albums */}
      {loading ? (
        <AlbumsSkeleton count={4} />
      ) : categories.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-8">
          <Folder className="w-12 h-12 text-[#C2410C] mx-auto mb-3" />
          <h4 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            {t('noAlbums', 'Belum ada Album atau Folder')}
          </h4>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            {t('noAlbumsHint', 'Gunakan form di atas untuk membuat album pertama Anda.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => loadCategoryMedia(cat)}
              className="card-artisan p-4 cursor-pointer hover:border-[#C2410C] transition-all group relative flex flex-col justify-between h-36 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20">
                  <Folder className="w-5 h-5" />
                </div>
                <button
                  onClick={(e) => handleDeleteCategory(cat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#EF4444] transition-all"
                  title={t('deleteAlbum', 'Hapus Album')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-serif font-semibold text-[16px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate group-hover:text-[#C2410C] transition-colors">
                  {cat.name}
                </h4>
                <div className="flex items-center justify-between text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
                  <span className="font-mono">{cat.media_count || 0} {t('filesUnit', 'berkas')}</span>
                  <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 bg-[#FAFAFA] dark:bg-[#14141A] border border-[#E8E8EC] dark:border-[#1F1F27] rounded">
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
