import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api';
import { formatBytes } from './QuotaBar';

export default function RequestQuotaModal({ isOpen, onClose, user, onRequested }) {
  const [requestedGb, setRequestedGb] = useState('10');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setError('');
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const data = await api.getMyQuotaRequests();
      setHistory(data.requests || []);
    } catch (e) {}
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const gb = parseFloat(requestedGb);
    if (isNaN(gb) || gb <= 0) {
      setError('Masukkan jumlah kapasitas GB yang valid.');
      return;
    }

    setLoading(true);
    try {
      await api.requestQuota(gb, reason);
      setReason('');
      await loadHistory();
      if (onRequested) onRequested();
    } catch (err) {
      setError(err.message || 'Gagal mengirim permohonan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] max-w-lg w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150 text-[#0A0A0A] dark:text-[#FAFAFA]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-[#C2410C]" />
            <h3 className="text-xl font-serif font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
              Ajukan Penambahan Kuota
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C]">
          <p>
            Kuota saat ini: <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] font-mono">{formatBytes(user?.storage_quota_bytes)}</strong> (Terpakai: <span className="font-mono">{formatBytes(user?.used_storage_bytes)}</span>).
          </p>
          <p className="mt-1">
            Permohonan Anda akan ditinjau oleh Administrator server (Local Cloud Hub).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#200A0A] border border-[#EF4444]/40 rounded-[6px] text-[#EF4444] dark:text-[#FCA5A5] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1">
              Tambahan Kapasitas yang Diminta (GB)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="200"
                step="1"
                required
                value={requestedGb}
                onChange={(e) => setRequestedGb(e.target.value)}
                className="input-artisan w-32 font-mono dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
              />
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C] text-[14px] font-semibold">GB</span>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] mb-1">
              Alasan Penambahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Mengunggah video dokumentasi keluarga dan backup foto liburan."
              className="w-full bg-white dark:bg-[#000000] border border-[#E8E8EC] dark:border-[#1F1F27] text-[#0A0A0A] dark:text-[#FAFAFA] placeholder-[#9C9C9C] rounded-[6px] p-3 text-[14px] focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-[14px]"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-[14px]"
            >
              {loading ? 'Mengirim...' : 'Kirim Permohonan'}
            </button>
          </div>
        </form>

        {history.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
            <h4 className="text-[13px] font-bold text-[#6B6B6B] dark:text-[#9C9C9C] uppercase tracking-wider mb-2">
              Riwayat Pengajuan Anda
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {history.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-2.5 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] text-[12px]"
                >
                  <div>
                    <span className="font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] font-mono">
                      +{formatBytes(req.requested_bytes)}
                    </span>
                    {req.reason && (
                      <span className="text-[#6B6B6B] dark:text-[#9C9C9C] ml-2 italic">
                        "{req.reason}"
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {req.status === 'pending' && (
                      <span className="chip-filter bg-[#FEF3C7] dark:bg-[#2E1D05] text-[#92400E] dark:text-[#FBBF24] border-[#F59E0B]/30 text-[11px] h-6 px-2">
                        <Clock className="w-3 h-3" /> Menunggu Admin
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="chip-filter bg-[#ECFDF5] dark:bg-[#062817] text-[#059669] dark:text-[#10B981] border-[#10B981]/30 text-[11px] h-6 px-2">
                        <CheckCircle className="w-3 h-3" /> Disetujui
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="chip-filter bg-[#FEF2F2] dark:bg-[#200A0A] text-[#991B1B] dark:text-[#FCA5A5] border-[#EF4444]/30 text-[11px] h-6 px-2">
                        <XCircle className="w-3 h-3" /> Ditolak
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

