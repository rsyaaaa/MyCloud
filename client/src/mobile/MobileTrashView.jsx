import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { TrashListSkeleton } from '../components/SkeletonLoader';

export default function MobileTrashView({ onBack, onRefreshQuota }) {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState(null);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const data = await api.listTrash();
      setTrashItems(data.trash || []);
    } catch (e) {
      console.error('Failed to load trash on mobile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id) => {
    setActionLoading(id);
    try {
      await api.restoreFromTrash(id);
      setTrashItems((prev) => prev.filter((item) => item.id !== id));
      setMsg({ type: 'success', text: 'Berkas dipulihkan!' });
      if (onRefreshQuota) onRefreshQuota();
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Gagal memulihkan.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Hapus permanen berkas ini dari server?')) return;

    setActionLoading(id);
    try {
      await api.deletePermanently(id);
      setTrashItems((prev) => prev.filter((item) => item.id !== id));
      setMsg({ type: 'success', text: 'Dihapus permanen.' });
      if (onRefreshQuota) onRefreshQuota();
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Gagal menghapus.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    if (!window.confirm(`Kosongkan semua sampah (${trashItems.length} berkas)? Tidak bisa dikembalikan.`)) return;

    setLoading(true);
    try {
      await api.emptyTrash();
      setTrashItems([]);
      setMsg({ type: 'success', text: 'Sampah berhasil dikosongkan.' });
      if (onRefreshQuota) onRefreshQuota();
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Gagal mengosongkan.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 p-3 animate-enter">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E7E5E4] dark:border-[#3E3834]">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 rounded text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Trash2 className="w-5 h-5 text-[#DC2626]" />
          <h2 className="font-serif font-bold text-lg text-[#1C1917] dark:text-[#F5F2EB]">
            Tempat Sampah
          </h2>
        </div>

        {trashItems.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={loading}
            className="btn-destructive text-[11px] h-7 px-2"
          >
            Kosongkan
          </button>
        )}
      </div>

      <div className="mb-3 p-2.5 bg-[#FFFBF5] dark:bg-[#23201D] border border-[#D4A373] dark:border-[#3E3834] rounded-[6px] text-[11px] text-[#57534E] dark:text-[#A8A29E]">
        Dihapus otomatis permanen setelah <strong>31 hari</strong> sejak dipindahkan ke sini.
      </div>

      {msg && (
        <div
          className={`mb-3 p-2 rounded text-[12px] flex items-center gap-1.5 border ${
            msg.type === 'success'
              ? 'bg-[#F0FDF4] dark:bg-[#143D14] text-[#166534] dark:text-[#86EFAC] border-[#22C55E]'
              : 'bg-[#FEF2F2] dark:bg-[#3D1414] text-[#DC2626] dark:text-[#FCA5A5] border-[#DC2626]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{msg.text}</span>
        </div>
      )}

      {loading ? (
        <TrashListSkeleton count={4} />
      ) : trashItems.length === 0 ? (
        <div className="p-8 text-center card-artisan bg-white dark:bg-[#23201D] border border-dashed border-[#D6D3D1] dark:border-[#3E3834]">
          <Trash2 className="w-10 h-10 text-[#A8A29E] mx-auto mb-2 opacity-50" />
          <p className="text-[13px] font-semibold text-[#1C1917] dark:text-[#F5F2EB]">
            Tempat Sampah Bersih
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {trashItems.map((item) => (
            <div
              key={item.id}
              className="card-artisan p-2.5 bg-white dark:bg-[#23201D] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={api.getThumbnailUrl(item.id)}
                  alt={item.display_name}
                  className="w-12 h-12 object-cover rounded-[4px] bg-[#FAF1E6] shrink-0"
                />
                <div className="truncate flex-1">
                  <h4 className="font-semibold text-[13px] text-[#1C1917] dark:text-[#F5F2EB] truncate">
                    {item.display_name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                    <span className="font-mono">{formatBytes(item.file_size)}</span>
                    <span>•</span>
                    <span className="text-[#DC2626] font-medium">
                      {item.days_left !== undefined ? `${item.days_left} hari` : '0 hari'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleRestore(item.id)}
                  disabled={actionLoading === item.id}
                  className="btn-secondary h-7 px-2 text-[11px]"
                  title="Pulihkan"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handlePermanentDelete(item.id)}
                  disabled={actionLoading === item.id}
                  className="btn-destructive h-7 px-2 text-[11px]"
                  title="Hapus"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
