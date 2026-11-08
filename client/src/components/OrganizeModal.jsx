import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Check, Folder } from 'lucide-react';
import { api } from '../api';

export default function OrganizeModal({ isOpen, onClose, media, onUpdated }) {
  const [categories, setCategories] = useState([]);
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('album');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && media) {
      loadData();
    }
  }, [isOpen, media]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCatsRes, mediaCatsRes] = await Promise.all([
        api.listCategories(),
        api.getMediaCategories(media.id)
      ]);
      setCategories(allCatsRes.categories || []);
      setSelectedCatIds((mediaCatsRes.categories || []).map(c => c.id));
    } catch (e) {
      setError('Gagal memuat kategori.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !media) return null;

  const toggleCategory = (catId) => {
    if (selectedCatIds.includes(catId)) {
      setSelectedCatIds(selectedCatIds.filter(id => id !== catId));
    } else {
      setSelectedCatIds([...selectedCatIds, catId]);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreating(true);
    try {
      const data = await api.createCategory(newCatName.trim(), newCatType);
      const newCat = data.category;
      setCategories([...categories, newCat]);
      setSelectedCatIds([...selectedCatIds, newCat.id]);
      setNewCatName('');
    } catch (err) {
      setError(err.message || 'Gagal membuat kategori.');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.assignCategories(media.id, selectedCatIds);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan kategori.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] max-w-md w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150 text-[#0A0A0A] dark:text-[#FAFAFA]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#C2410C]" />
            <h3 className="text-xl font-serif font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
              Atur ke Album & Folder
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mb-3 truncate">
          Media: <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">{media.display_name}</strong>
        </p>

        {error && (
          <div className="mb-3 p-2 bg-[#FEF2F2] dark:bg-[#200A0A] border border-[#EF4444]/40 rounded-[6px] text-[#EF4444] dark:text-[#FCA5A5] text-[12px]">
            {error}
          </div>
        )}

        {/* Existing Categories Checklist */}
        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[8px] p-2 bg-[#FAFAFA] dark:bg-[#0A0A0E]">
          {categories.length === 0 ? (
            <p className="text-[13px] text-[#9C9C9C] text-center py-4">
              Belum ada album atau folder. Buat yang baru di bawah.
            </p>
          ) : (
            categories.map((cat) => {
              const isChecked = selectedCatIds.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center justify-between p-2 rounded-[6px] cursor-pointer text-[13px] transition-colors ${
                    isChecked
                      ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border border-[#C2410C]/30'
                      : 'hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] text-[#0A0A0A] dark:text-[#FAFAFA] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-[#C2410C] border-[#C2410C] text-white'
                          : 'border-[#E8E8EC] dark:border-[#1F1F27] bg-white dark:bg-[#000000]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-[#6B6B6B] dark:text-[#9C9C9C] bg-white dark:bg-[#14141A] px-1.5 py-0.5 rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
                    {cat.type}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Create new album form */}
        <form onSubmit={handleCreateCategory} className="mt-4 pt-3 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nama album / folder baru..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="input-artisan flex-1 h-[36px] text-[13px] dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
            />
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value)}
              className="input-artisan h-[36px] text-[12px] px-2 bg-white dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
            >
              <option value="album">Album</option>
              <option value="folder">Folder</option>
              <option value="genre">Genre</option>
            </select>
            <button
              type="submit"
              disabled={creating || !newCatName.trim()}
              className="btn-secondary h-[36px] px-3 text-[13px] shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-[14px]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="btn-primary text-[14px]"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}

