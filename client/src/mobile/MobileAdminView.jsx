import React, { useState, useEffect } from 'react';
import {
  Server, HardDrive, Users, ArrowUpCircle, CheckCircle, XCircle,
  Clock, RefreshCw, Edit3
} from 'lucide-react';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';

export default function MobileAdminView() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newQuotaGb, setNewQuotaGb] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, reqsRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminQuotaRequests(),
        api.getAdminUsers()
      ]);
      setStats(statsRes);
      setRequests(reqsRes.requests || []);
      setUsers(usersRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleActionRequest = async (id, action) => {
    setActionLoading(true);
    try {
      await api.actionAdminQuotaRequest(id, action);
      await loadData();
    } catch (e) {
      alert(e.message || 'Gagal memproses aksi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateQuota = async (userId) => {
    const gb = parseFloat(newQuotaGb);
    if (isNaN(gb) || gb <= 0) return;

    try {
      await api.updateUserQuota(userId, gb);
      setEditingUserId(null);
      setNewQuotaGb('');
      await loadData();
    } catch (e) {
      alert(e.message || 'Gagal mengubah kuota.');
    }
  };

  const diskTotal = stats?.disk?.total || 500 * 1024 * 1024 * 1024;
  const diskUsed = stats?.disk?.used || 0;
  const diskFree = stats?.disk?.available || stats?.disk?.free || 0;
  const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-6 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-xl text-[#0A0A0A] dark:text-[#FAFAFA]">
              Admin Panel
            </h2>
          </div>
          <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">Monitoring HDD 500 GB Host & Kuota</span>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary h-8 px-2.5 text-[12px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 500GB HDD Status Card */}
      <div className="card-artisan p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-semibold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA]">
            <HardDrive className="w-4 h-4 text-[#C2410C]" />
            <span>HDD Fisik Host (500 GB)</span>
          </div>
          <span className="text-[11px] font-mono font-bold bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] px-1.5 py-0.2 rounded border border-[#C2410C]/20">
            {diskPercent}% Terpakai
          </span>
        </div>

        <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-3 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full transition-all duration-500 ${
              diskPercent > 90 ? 'bg-[#EF4444]' : diskPercent > 75 ? 'bg-[#F59E0B]' : 'bg-[#C2410C]'
            }`}
            style={{ width: `${diskPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 bg-[#FAFAFA] dark:bg-[#000000] rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
            <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block">Terpakai (OS+Data)</span>
            <strong className="font-mono text-[#C2410C] text-[12px]">{formatBytes(diskUsed)}</strong>
          </div>
          <div className="p-2 bg-[#FAFAFA] dark:bg-[#000000] rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
            <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block">Sisa Bebas</span>
            <strong className="font-mono text-[#10B981] text-[12px]">{formatBytes(diskFree)}</strong>
          </div>
        </div>
      </div>

      {/* Pending Quota Requests */}
      <div className="card-artisan p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <ArrowUpCircle className="w-4 h-4 text-[#C2410C]" />
          <h3 className="font-serif font-semibold text-[15px] text-[#0A0A0A] dark:text-[#FAFAFA]">
            Pengajuan Kuota ({requests.filter(r => r.status === 'pending').length} Baru)
          </h3>
        </div>

        {requests.length === 0 ? (
          <p className="text-[12px] text-[#9C9C9C] text-center py-4">
            Tidak ada permohonan kuota saat ini.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-[#FAFAFA] dark:bg-[#000000] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] text-[12px] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">{r.username}</span>
                  <span className="font-mono font-bold text-[#C2410C]">
                    +{formatBytes(r.requested_bytes)}
                  </span>
                </div>

                {r.reason && (
                  <p className="text-[#6B6B6B] dark:text-[#9C9C9C] italic bg-white dark:bg-[#14141A] p-2 rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
                    "{r.reason}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {r.status === 'pending' && (
                      <span className="chip-filter bg-[#FEF3C7] dark:bg-[#2E1D05] text-[#92400E] dark:text-[#FBBF24] border-[#F59E0B]/30 text-[10px] h-5 px-1.5">
                        <Clock className="w-2.5 h-2.5" /> Menunggu
                      </span>
                    )}
                    {r.status === 'approved' && (
                      <span className="chip-filter bg-[#ECFDF5] dark:bg-[#062817] text-[#059669] dark:text-[#10B981] border-[#10B981]/30 text-[10px] h-5 px-1.5">
                        <CheckCircle className="w-2.5 h-2.5" /> Disetujui
                      </span>
                    )}
                    {r.status === 'rejected' && (
                      <span className="chip-filter bg-[#FEF2F2] dark:bg-[#200A0A] text-[#991B1B] dark:text-[#FCA5A5] border-[#EF4444]/30 text-[10px] h-5 px-1.5">
                        <XCircle className="w-2.5 h-2.5" /> Ditolak
                      </span>
                    )}
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleActionRequest(r.id, 'approved')}
                        disabled={actionLoading}
                        className="btn-primary text-[11px] py-1 px-2.5 h-6"
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => handleActionRequest(r.id, 'rejected')}
                        disabled={actionLoading}
                        className="btn-destructive text-[11px] py-1 px-2 h-6"
                      >
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="card-artisan p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <Users className="w-4 h-4 text-[#C2410C]" />
          <h3 className="font-serif font-semibold text-[15px] text-[#0A0A0A] dark:text-[#FAFAFA]">
            Daftar Pengguna ({users.length})
          </h3>
        </div>

        <div className="space-y-2.5">
          {users.map((u) => {
            const isEditing = editingUserId === u.id;
            const percent = Math.min(100, Math.round((u.used_storage_bytes / u.storage_quota_bytes) * 100)) || 0;

            return (
              <div
                key={u.id}
                className="p-3 bg-white dark:bg-[#000000] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] text-[12px] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">{u.username}</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1 bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] rounded border border-[#C2410C]/20">
                      {u.role}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">{u.total_files || 0} file</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#E8E8EC] dark:bg-[#1F1F27] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#C2410C] h-full" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] shrink-0">
                    {formatBytes(u.used_storage_bytes)} / {formatBytes(u.storage_quota_bytes)}
                  </span>
                </div>

                <div className="flex justify-end pt-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="GB"
                        value={newQuotaGb}
                        onChange={(e) => setNewQuotaGb(e.target.value)}
                        className="input-artisan h-6 w-16 text-[11px] px-1.5 font-mono dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
                      />
                      <button
                        onClick={() => handleUpdateQuota(u.id)}
                        className="btn-primary text-[10px] h-6 px-2"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white px-1"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingUserId(u.id);
                        setNewQuotaGb(Math.round(u.storage_quota_bytes / (1024 * 1024 * 1024)));
                      }}
                      className="text-[#C2410C] hover:underline flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Edit3 className="w-3 h-3" /> Ubah Kuota
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

