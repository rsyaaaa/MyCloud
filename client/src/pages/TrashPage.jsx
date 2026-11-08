import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, HardDrive, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';
import { TrashListSkeleton } from '../components/SkeletonLoader';

export default function TrashPage({ onRefreshQuota }) {
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
      console.error('Failed to load trash:', e);
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
      setMsg({ type: 'success', text: 'Berkas berhasil dipulihkan ke Galeri Utama!' });
      if (onRefreshQuota) onRefreshQuota();
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Gagal memulihkan berkas.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Hapus permanen berkas ini? File fisik di server akan dimusnahkan dan tidak bisa dikembalikan.')) return;

    setActionLoading(id);
    try {
      await api.deletePermanently(id);
      setTrashItems((prev) => prev.filter((item) => item.id !== id));
      setMsg({ type: 'success', text: 'Berkas dihapus permanen dari server.' });
      if (onRefreshQuota) onRefreshQuota();
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Gagal menghapus berkas.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    if (!window.confirm(`Yakin ingin mengosongkan seluruh isi tempat sampah (${trashItems.length} berkas)? Seluruh file akan dihapus permanen dari HDD server.`)) return;

    setLoading(true);
    try {
      const res = await api.emptyTrash();
      setTrashItems([]);
      setMsg({ type: 'success', text: res.message || 'Tempat sampah berhasil dikosongkan.' });
      if (onRefreshQuota) onRefreshQuota();
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Gagal mengosongkan sampah.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-6 h-6 text-[#EF4444]" />
            <h2 className="font-serif font-bold text-2xl text-[#0A0A0A] dark:text-[#FAFAFA]">
              Tempat Sampah (Trash)
            </h2>
          </div>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Berkas yang dihapus disimpan di sini dan akan dihapus permanen secara otomatis setelah <strong>31 hari</strong>.
          </p>
        </div>

        {trashItems.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={loading}
            className="btn-destructive text-[13px] h-9"
          >
            <Trash2 className="w-4 h-4" />
            <span>Kosongkan Sampah</span>
          </button>
        )}
      </div>

      {msg && (
        <div
          className={`mb-4 p-3 rounded-[6px] text-[13px] flex items-center gap-2 border ${
            msg.type === 'success'
              ? 'bg-[#ECFDF5] dark:bg-[#062817] text-[#065F46] dark:text-[#34D399] border-[#10B981]/40'
              : 'bg-[#FEF2F2] dark:bg-[#200A0A] text-[#EF4444] dark:text-[#FCA5A5] border-[#EF4444]/40'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <TrashListSkeleton count={5} />
      ) : trashItems.length === 0 ? (
        <div className="p-12 text-center card-artisan bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
          <Trash2 className="w-12 h-12 text-[#9C9C9C] mx-auto mb-3 opacity-60" />
          <h3 className="font-serif font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] mb-1">
            Tempat Sampah Bersih
          </h3>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C]">
            Tidak ada foto atau video yang dihapus saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {trashItems.map((item) => (
            <div
              key={item.id}
              className="card-artisan p-3.5 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={api.getThumbnailUrl(item.id)}
                  alt={item.display_name}
                  className="w-14 h-14 object-cover rounded-[8px] bg-[#F4F4F5] dark:bg-[#14141A] shrink-0 border border-[#E8E8EC] dark:border-[#1F1F27]"
                />
                <div className="truncate">
                  <h4 className="font-semibold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                    {item.display_name}
                  </h4>
                  <div className="flex items-center gap-2 text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
                    <span className="font-mono">{formatBytes(item.file_size)}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 rounded text-[11px] font-semibold bg-[#FEF2F2] dark:bg-[#200A0A] border border-[#EF4444]/30 text-[#EF4444] dark:text-[#FCA5A5]">
                      {item.days_left !== undefined ? `${item.days_left} hari tersisa` : 'Segera dihapus'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRestore(item.id)}
                  disabled={actionLoading === item.id}
                  className="btn-secondary h-8 px-3 text-[12px]"
                  title="Pulihkan ke Galeri"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pulihkan</span>
                </button>

                <button
                  onClick={() => handlePermanentDelete(item.id)}
                  disabled={actionLoading === item.id}
                  className="btn-destructive h-8 px-3 text-[12px]"
                  title="Hapus Permanen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hapus Permanen</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

