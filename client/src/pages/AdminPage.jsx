import React, { useState, useEffect } from 'react';
import {
  HardDrive, Users, CheckCircle, XCircle, Clock, Shield,
  ArrowUpCircle, FileText, Server, RefreshCw, Edit3
} from 'lucide-react';
import { api } from '../api';
import { formatBytes } from '../components/QuotaBar';

export default function AdminPage() {
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
      console.error('Failed to load admin data:', e);
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
      alert(e.message || 'Gagal memproses permohonan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateQuota = async (userId) => {
    const gb = parseFloat(newQuotaGb);
    if (isNaN(gb) || gb <= 0) {
      alert('Masukkan kuota GB yang valid.');
      return;
    }

    try {
      await api.updateUserQuota(userId, gb);
      setEditingUserId(null);
      setNewQuotaGb('');
      await loadData();
    } catch (e) {
      alert(e.message || 'Gagal memperbarui kuota.');
    }
  };

  // Disk percentages
  const diskTotal = stats?.disk?.total || 500 * 1024 * 1024 * 1024;
  const diskUsed = stats?.disk?.used || 0;
  const diskFree = stats?.disk?.available || stats?.disk?.free || 0;
  const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-enter">
      {/* Admin Title */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-2xl text-[#0A0A0A] dark:text-[#FAFAFA]">
              Panel Administrator & Monitoring Server
            </h2>
          </div>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            Monitoring fisik 500 GB Local HDD, pengelolaan pengguna, dan permohonan kuota penyimpanan.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary text-[13px] h-[36px] px-3.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Physical HDD 500GB Monitor Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Drive Widget */}
        <div className="md:col-span-2 card-artisan p-5 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
              <HardDrive className="w-5 h-5 text-[#C2410C]" />
              <span>Ruang HDD Fisik Host (500 GB)</span>
            </div>
            <span className="text-[12px] font-mono font-bold bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] px-2 py-0.5 rounded border border-[#C2410C]/20">
              {diskPercent}% Terpakai
            </span>
          </div>

          <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-3.5 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                diskPercent > 90 ? 'bg-[#EF4444]' : diskPercent > 75 ? 'bg-[#F59E0B]' : 'bg-[#C2410C]'
              }`}
              style={{ width: `${diskPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[12px] pt-1">
            <div className="p-2 bg-[#FAFAFA] dark:bg-[#000000] rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block">Total Fisik</span>
              <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">{formatBytes(diskTotal)}</strong>
            </div>
            <div className="p-2 bg-[#FAFAFA] dark:bg-[#000000] rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block">Terpakai (OS + App)</span>
              <strong className="font-mono text-[#C2410C]">{formatBytes(diskUsed)}</strong>
            </div>
            <div className="p-2 bg-[#FAFAFA] dark:bg-[#000000] rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C] block">Sisa Bebas</span>
              <strong className="font-mono text-[#10B981]">{formatBytes(diskFree)}</strong>
            </div>
          </div>
        </div>

        {/* Total Users Widget */}
        <div className="card-artisan p-5 flex flex-col justify-between bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
          <div className="flex items-center justify-between text-[#6B6B6B] dark:text-[#9C9C9C]">
            <span className="text-[13px] font-semibold">Total Pengguna</span>
            <Users className="w-5 h-5 text-[#C2410C]" />
          </div>
          <div>
            <div className="font-serif font-bold text-3xl text-[#1C1917] dark:text-white mt-2">
              {stats?.users || 0}
            </div>
            <span className="text-[12px] text-[#57534E] dark:text-[#A1A1AA]">Akun terdaftar di NAS</span>
          </div>
        </div>

        {/* Media & Request Widget */}
        <div className="card-artisan p-5 flex flex-col justify-between dark:bg-[#0A0A0A] dark:border-[#1F1F1F]">
          <div className="flex items-center justify-between text-[#57534E] dark:text-[#A1A1AA]">
            <span className="text-[13px] font-semibold">Pengajuan Menunggu</span>
            <ArrowUpCircle className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div>
            <div className="font-serif font-bold text-3xl text-[#1C1917] dark:text-white mt-2">
              {stats?.pending_requests || 0}
            </div>
            <span className="text-[12px] text-[#57534E] dark:text-[#A1A1AA]">Perlu persetujuan admin</span>
          </div>
        </div>
      </div>

      {/* Storage Requests Management Section */}
      <section className="card-artisan p-6 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <ArrowUpCircle className="w-5 h-5 text-[#C2410C]" />
          <h3 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            Daftar Permohonan Tambah Kuota
          </h3>
        </div>

        {requests.length === 0 ? (
          <p className="text-[13px] text-[#9C9C9C] text-center py-6">
            Tidak ada permohonan penambahan kuota saat ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E8E8EC] dark:border-[#1F1F27] text-[#6B6B6B] dark:text-[#9C9C9C]">
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-3">Permintaan</th>
                  <th className="py-2.5 px-3">Alasan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8EC] dark:divide-[#1F1F27]">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                      {r.username}
                      <span className="block text-[11px] font-normal text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">
                        Saat ini: {formatBytes(r.used_storage_bytes)} / {formatBytes(r.storage_quota_bytes)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#C2410C]">
                      +{formatBytes(r.requested_bytes)}
                    </td>
                    <td className="py-3 px-3 text-[#6B6B6B] dark:text-[#9C9C9C] max-w-xs truncate">
                      {r.reason || '-'}
                    </td>
                    <td className="py-3 px-3">
                      {r.status === 'pending' && (
                        <span className="chip-filter bg-[#FEF3C7] dark:bg-[#2E1D05] text-[#92400E] dark:text-[#FBBF24] border-[#F59E0B]/30 text-[11px] h-6 px-2">
                          <Clock className="w-3 h-3" /> Menunggu
                        </span>
                      )}
                      {r.status === 'approved' && (
                        <span className="chip-filter bg-[#ECFDF5] dark:bg-[#062817] text-[#059669] dark:text-[#10B981] border-[#10B981]/30 text-[11px] h-6 px-2">
                          <CheckCircle className="w-3 h-3" /> Disetujui
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span className="chip-filter bg-[#FEF2F2] dark:bg-[#200A0A] text-[#991B1B] dark:text-[#FCA5A5] border-[#EF4444]/30 text-[11px] h-6 px-2">
                          <XCircle className="w-3 h-3" /> Ditolak
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleActionRequest(r.id, 'approved')}
                            disabled={actionLoading}
                            className="btn-primary text-[12px] py-1 px-2.5 h-7"
                          >
                            Setujui (+{formatBytes(r.requested_bytes)})
                          </button>
                          <button
                            onClick={() => handleActionRequest(r.id, 'rejected')}
                            disabled={actionLoading}
                            className="btn-destructive text-[12px] py-1 px-2.5 h-7"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#9C9C9C] italic">Selesai diproses</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Users List & Manual Quota Adjustment */}
      <section className="card-artisan p-6 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <Users className="w-5 h-5 text-[#C2410C]" />
          <h3 className="font-serif font-semibold text-lg text-[#0A0A0A] dark:text-[#FAFAFA]">
            Daftar Seluruh Pengguna NAS
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E8E8EC] dark:border-[#1F1F27] text-[#6B6B6B] dark:text-[#9C9C9C]">
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Total File</th>
                <th className="py-2.5 px-3">Penggunaan Kuota</th>
                <th className="py-2.5 px-3 text-right">Atur Kuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8EC] dark:divide-[#1F1F27]">
              {users.map((u) => {
                const isEditing = editingUserId === u.id;
                const percent = Math.min(100, Math.round((u.used_storage_bytes / u.storage_quota_bytes) * 100)) || 0;

                return (
                  <tr key={u.id} className="hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                      {u.username}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] uppercase tracking-wider font-bold bg-[#F4F4F5] dark:bg-[#14141A] text-[#0A0A0A] dark:text-[#FAFAFA] px-2 py-0.5 rounded border border-[#E8E8EC] dark:border-[#1F1F27]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">
                      {u.total_files || 0} file
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-[#E8E8EC] dark:bg-[#1F1F27] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#C2410C] h-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                          {formatBytes(u.used_storage_bytes)} / {formatBytes(u.storage_quota_bytes)} ({percent}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            placeholder="GB"
                            value={newQuotaGb}
                            onChange={(e) => setNewQuotaGb(e.target.value)}
                            className="input-artisan h-7 w-20 text-[12px] font-mono px-2 dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
                          />
                          <button
                            onClick={() => handleUpdateQuota(u.id)}
                            className="btn-primary text-[11px] h-7 px-2"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white px-1.5"
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
                          className="btn-ghost text-[12px] py-1 px-2.5 h-7"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ubah Kuota</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

