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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/20 backdrop-blur-[2px]">
      <div className="bg-white border-2 border-[#D6D3D1] rounded-[8px] max-w-lg w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E7E5E4]">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-[#C2410C]" />
            <h3 className="text-xl font-serif font-semibold text-[#1C1917]">
              Ajukan Penambahan Kuota
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#57534E] hover:text-[#1C1917] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-[#FFFBF5] border border-[#D6D3D1] rounded-[4px] text-[13px] text-[#57534E]">
          <p>
            Kuota saat ini: <strong className="text-[#1C1917] font-mono">{formatBytes(user?.storage_quota_bytes)}</strong> (Terpakai: <span className="font-mono">{formatBytes(user?.used_storage_bytes)}</span>).
          </p>
          <p className="mt-1">
            Permohonan Anda akan ditinjau oleh Administrator server (Local Cloud Hub).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#DC2626] rounded-[4px] text-[#DC2626] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1C1917] mb-1">
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
                className="input-artisan w-32 font-mono"
              />
              <span className="text-[#57534E] text-[14px] font-semibold">GB</span>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1C1917] mb-1">
              Alasan Penambahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Mengunggah video dokumentasi keluarga dan backup foto liburan."
              className="w-full bg-white border-[1.5px] border-[#D6D3D1] text-[#1C1917] placeholder-[#A8A29E] rounded-[4px] p-3 text-[14px] focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 focus:outline-none transition-all"
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
          <div className="mt-6 pt-4 border-t border-[#E7E5E4]">
            <h4 className="text-[13px] font-bold text-[#57534E] uppercase tracking-wider mb-2">
              Riwayat Pengajuan Anda
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {history.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-2.5 bg-[#FFFBF5] border border-[#E7E5E4] rounded-[4px] text-[12px]"
                >
                  <div>
                    <span className="font-semibold text-[#1C1917] font-mono">
                      +{formatBytes(req.requested_bytes)}
                    </span>
                    {req.reason && (
                      <span className="text-[#57534E] ml-2 italic">
                        "{req.reason}"
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {req.status === 'pending' && (
                      <span className="chip-filter bg-[#FEF3C7] text-[#92400E] border-[#F59E0B] text-[11px] h-6 px-2">
                        <Clock className="w-3 h-3" /> Menunggu Admin
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="chip-filter bg-[#DCFCE7] text-[#166534] border-[#22C55E] text-[11px] h-6 px-2">
                        <CheckCircle className="w-3 h-3" /> Disetujui
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="chip-filter bg-[#FEE2E2] text-[#991B1B] border-[#DC2626] text-[11px] h-6 px-2">
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

