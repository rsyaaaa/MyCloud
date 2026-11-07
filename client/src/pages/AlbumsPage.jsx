import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, ArrowLeft, Trash2, Image, Layers } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { api } from '../api';

export default function AlbumsPage({ onOpenViewer, onToggleFavorite, onLock, onOrganize, onDelete, onRename }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryMedia, setCategoryMedia] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('album');
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.listCategories();
      setCategories(data.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryMedia = async (cat) => {
    setSelectedCategory(cat);
    setLoading(true);
    try {
      const data = await api.listMedia({ category_id: cat.id });
      setCategoryMedia(data.media || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await api.createCategory(newCatName.trim(), newCatType);
      setNewCatName('');
      loadCategories();
    } catch (e) {}
  };

  const handleDeleteCategory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Hapus album/kategori ini? File foto & video tidak akan terhapus.')) return;

    try {
      await api.deleteCategory(id);
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
      }
      loadCategories();
    } catch (e) {}
  };

  if (selectedCategory) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E7E5E4]">
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
                <h2 className="font-serif font-bold text-2xl text-[#1C1917]">
                  {selectedCategory.name}
                </h2>
                <span className="text-[11px] uppercase tracking-wider font-bold bg-[#FAF1E6] text-[#C2410C] px-2 py-0.5 rounded border border-[#D4A373]">
                  {selectedCategory.type}
                </span>
              </div>
              <p className="text-[13px] text-[#57534E] mt-0.5">
                {categoryMedia.length} berkas media dalam album ini.
              </p>
            </div>
          </div>
        </div>

        {categoryMedia.length === 0 ? (
          <div className="text-center py-20 bg-white border-2 border-dashed border-[#D6D3D1] rounded-[8px] p-8">
            <Layers className="w-12 h-12 text-[#D4A373] mx-auto mb-3" />
            <h4 className="font-serif font-semibold text-lg text-[#1C1917]">
              Album Masih Kosong
            </h4>
            <p className="text-[13px] text-[#57534E] mt-1 max-w-sm mx-auto">
              Buka Galeri Utama, pilih menu titik tiga pada file dan klik "Atur ke Album" untuk menambahkan file ke album ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categoryMedia.map((m, idx) => (
              <MediaCard
                key={m.id}
                media={m}
                onClick={() => onOpenViewer(categoryMedia, idx)}
                onToggleFavorite={onToggleFavorite}
                onLock={onLock}
                onOrganize={onOrganize}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header & Create Form */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E7E5E4]">
        <div>
          <div className="flex items-center gap-2">
            <Folder className="w-6 h-6 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-2xl text-[#1C1917]">
              Album & Folder Kategori
            </h2>
          </div>
          <p className="text-[13px] text-[#57534E] mt-1">
            Organisir foto dan video Anda ke dalam koleksi tema atau genre.
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Nama album baru..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="input-artisan h-[38px] text-[13px] w-48"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value)}
            className="input-artisan h-[38px] text-[13px] px-2 bg-white"
          >
            <option value="album">Album</option>
            <option value="folder">Folder</option>
            <option value="genre">Genre</option>
          </select>
          <button
            type="submit"
            disabled={!newCatName.trim()}
            className="btn-primary text-[13px] h-[38px] px-3.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Buat</span>
          </button>
        </form>
      </div>

      {/* Grid of Albums */}
      {categories.length === 0 ? (
        <div className="text-center py-20 bg-white border-2 border-dashed border-[#D6D3D1] rounded-[8px] p-8">
          <Folder className="w-12 h-12 text-[#D4A373] mx-auto mb-3" />
          <h4 className="font-serif font-semibold text-lg text-[#1C1917]">
            Belum ada Album atau Folder
          </h4>
          <p className="text-[13px] text-[#57534E] mt-1">
            Gunakan form di atas untuk membuat album pertama Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => loadCategoryMedia(cat)}
              className="card-artisan p-4 cursor-pointer hover:border-[#C2410C] transition-all group relative flex flex-col justify-between h-36"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-[6px] bg-[#FAF1E6] text-[#C2410C] flex items-center justify-center border border-[#D4A373]">
                  <Folder className="w-5 h-5" />
                </div>
                <button
                  onClick={(e) => handleDeleteCategory(cat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#57534E] hover:text-[#DC2626] transition-all"
                  title="Hapus Album"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-serif font-semibold text-[16px] text-[#1C1917] truncate group-hover:text-[#C2410C] transition-colors">
                  {cat.name}
                </h4>
                <div className="flex items-center justify-between text-[12px] text-[#57534E] mt-1">
                  <span className="font-mono">{cat.media_count || 0} berkas</span>
                  <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.2 bg-[#FFFBF5] border border-[#E7E5E4] rounded">
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

