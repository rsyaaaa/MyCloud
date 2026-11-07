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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/20 backdrop-blur-[2px]">
      <div className="bg-white border-2 border-[#D6D3D1] rounded-[8px] max-w-md w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E5E4]">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-[#C2410C]" />
            <h3 className="text-xl font-serif font-semibold text-[#1C1917]">
              Atur ke Album & Folder
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#57534E] hover:text-[#1C1917] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[13px] text-[#57534E] mb-3 truncate">
          Media: <strong className="text-[#1C1917]">{media.display_name}</strong>
        </p>

        {error && (
          <div className="mb-3 p-2 bg-[#FEF2F2] border border-[#DC2626] rounded text-[#DC2626] text-[12px]">
            {error}
          </div>
        )}

        {/* Existing Categories Checklist */}
        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-[#E7E5E4] rounded-[4px] p-2 bg-[#FFFBF5]">
          {categories.length === 0 ? (
            <p className="text-[13px] text-[#A8A29E] text-center py-4">
              Belum ada album atau folder. Buat yang baru di bawah.
            </p>
          ) : (
            categories.map((cat) => {
              const isChecked = selectedCatIds.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center justify-between p-2 rounded-[4px] cursor-pointer text-[13px] transition-colors ${
                    isChecked
                      ? 'bg-[#FDF6EC] text-[#C2410C] border border-[#D4A373]'
                      : 'hover:bg-white text-[#1C1917] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-[#C2410C] border-[#C2410C] text-white'
                          : 'border-[#D6D3D1] bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-[#57534E] bg-white px-1.5 py-0.5 rounded border border-[#E7E5E4]">
                    {cat.type}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Create new album form */}
        <form onSubmit={handleCreateCategory} className="mt-4 pt-3 border-t border-[#E7E5E4]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nama album / folder baru..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="input-artisan flex-1 h-[36px] text-[13px]"
            />
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value)}
              className="input-artisan h-[36px] text-[12px] px-2 bg-white"
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

        <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-[#E7E5E4]">
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

