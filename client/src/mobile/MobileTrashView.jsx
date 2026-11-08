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
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E7E5E4] dark:border-[#1F1F1F]">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 rounded text-[#57534E] dark:text-[#A1A1AA] hover:text-[#1C1917] dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Trash2 className="w-5 h-5 text-[#EF4444]" />
          <h2 className="font-serif font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            Sampah
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

      <div className="mb-3 p-2.5 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[8px] text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">
        Dihapus otomatis permanen setelah <strong>31 hari</strong> sejak dipindahkan ke sini.
      </div>

      {msg && (
        <div
          className={`mb-3 p-2 rounded text-[12px] flex items-center gap-1.5 border ${
            msg.type === 'success'
              ? 'bg-[#ECFDF5] dark:bg-[#062817] text-[#065F46] dark:text-[#34D399] border-[#10B981]/40'
              : 'bg-[#FEF2F2] dark:bg-[#200A0A] text-[#EF4444] dark:text-[#FCA5A5] border-[#EF4444]/40'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{msg.text}</span>
        </div>
      )}

      {loading ? (
        <TrashListSkeleton count={4} />
      ) : trashItems.length === 0 ? (
        <div className="p-8 text-center card-artisan bg-white dark:bg-[#0A0A0E] border border-dashed border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
          <Trash2 className="w-10 h-10 text-[#9C9C9C] mx-auto mb-2 opacity-50" />
          <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
            Tempat Sampah Bersih
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {trashItems.map((item) => (
            <div
              key={item.id}
              className="card-artisan p-2.5 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={api.getThumbnailUrl(item.id)}
                  alt={item.display_name}
                  className="w-12 h-12 object-cover rounded-[6px] bg-[#F4F4F5] dark:bg-[#14141A] shrink-0 border border-[#E8E8EC] dark:border-[#1F1F27]"
                />
                <div className="truncate flex-1">
                  <h4 className="font-semibold text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                    {item.display_name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
                    <span className="font-mono">{formatBytes(item.file_size)}</span>
                    <span>•</span>
                    <span className="text-[#EF4444] font-medium">
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

