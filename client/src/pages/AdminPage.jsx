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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Admin Title */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E4]">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-[#C2410C]" />
            <h2 className="font-serif font-bold text-2xl text-[#1C1917]">
              Panel Administrator & Monitoring Server
            </h2>
          </div>
          <p className="text-[13px] text-[#57534E] mt-1">
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
        <div className="md:col-span-2 card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-serif font-semibold text-lg text-[#1C1917]">
              <HardDrive className="w-5 h-5 text-[#C2410C]" />
              <span>Ruang HDD Fisik Host (500 GB)</span>
            </div>
            <span className="text-[12px] font-mono font-bold bg-[#FDF6EC] text-[#C2410C] px-2 py-0.5 rounded border border-[#D4A373]">
              {diskPercent}% Terpakai
            </span>
          </div>

          <div className="w-full bg-[#E7E5E4] h-3.5 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                diskPercent > 90 ? 'bg-[#DC2626]' : diskPercent > 75 ? 'bg-[#F59E0B]' : 'bg-[#C2410C]'
              }`}
              style={{ width: `${diskPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[12px] pt-1">
            <div className="p-2 bg-white rounded border border-[#E7E5E4]">
              <span className="text-[#57534E] block">Total Fisik</span>
              <strong className="font-mono text-[#1C1917]">{formatBytes(diskTotal)}</strong>
            </div>
            <div className="p-2 bg-white rounded border border-[#E7E5E4]">
              <span className="text-[#57534E] block">Terpakai (OS + App)</span>
              <strong className="font-mono text-[#C2410C]">{formatBytes(diskUsed)}</strong>
            </div>
            <div className="p-2 bg-white rounded border border-[#E7E5E4]">
              <span className="text-[#57534E] block">Sisa Bebas</span>
              <strong className="font-mono text-[#22C55E]">{formatBytes(diskFree)}</strong>
            </div>
          </div>
        </div>

        {/* Total Users Widget */}
        <div className="card-artisan p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#57534E]">
            <span className="text-[13px] font-semibold">Total Pengguna</span>
            <Users className="w-5 h-5 text-[#365314]" />
          </div>
          <div>
            <div className="font-serif font-bold text-3xl text-[#1C1917] mt-2">
              {stats?.users || 0}
            </div>
            <span className="text-[12px] text-[#57534E]">Akun terdaftar di NAS</span>
          </div>
        </div>

        {/* Media & Request Widget */}
        <div className="card-artisan p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#57534E]">
            <span className="text-[13px] font-semibold">Pengajuan Menunggu</span>
            <ArrowUpCircle className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div>
            <div className="font-serif font-bold text-3xl text-[#1C1917] mt-2">
              {stats?.pending_requests || 0}
            </div>
            <span className="text-[12px] text-[#57534E]">Perlu persetujuan admin</span>
          </div>
        </div>
      </div>

      {/* Storage Requests Management Section */}
      <section className="card-artisan p-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E7E5E4]">
          <ArrowUpCircle className="w-5 h-5 text-[#C2410C]" />
          <h3 className="font-serif font-semibold text-lg text-[#1C1917]">
            Daftar Permohonan Tambah Kuota
          </h3>
        </div>

        {requests.length === 0 ? (
          <p className="text-[13px] text-[#A8A29E] text-center py-6">
            Tidak ada permohonan penambahan kuota saat ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E7E5E4] text-[#57534E]">
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-3">Permintaan</th>
                  <th className="py-2.5 px-3">Alasan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FFFBF5]">
                    <td className="py-3 px-3 font-semibold text-[#1C1917]">
                      {r.username}
                      <span className="block text-[11px] font-normal text-[#57534E] font-mono">
                        Saat ini: {formatBytes(r.used_storage_bytes)} / {formatBytes(r.storage_quota_bytes)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#C2410C]">
                      +{formatBytes(r.requested_bytes)}
                    </td>
                    <td className="py-3 px-3 text-[#57534E] max-w-xs truncate">
                      {r.reason || '-'}
                    </td>
                    <td className="py-3 px-3">
                      {r.status === 'pending' && (
                        <span className="chip-filter bg-[#FEF3C7] text-[#92400E] border-[#F59E0B] text-[11px] h-6 px-2">
                          <Clock className="w-3 h-3" /> Menunggu
                        </span>
                      )}
                      {r.status === 'approved' && (
                        <span className="chip-filter bg-[#DCFCE7] text-[#166534] border-[#22C55E] text-[11px] h-6 px-2">
                          <CheckCircle className="w-3 h-3" /> Disetujui
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span className="chip-filter bg-[#FEE2E2] text-[#991B1B] border-[#DC2626] text-[11px] h-6 px-2">
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
                        <span className="text-[12px] text-[#A8A29E] italic">Selesai diproses</span>
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
      <section className="card-artisan p-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E7E5E4]">
          <Users className="w-5 h-5 text-[#365314]" />
          <h3 className="font-serif font-semibold text-lg text-[#1C1917]">
            Daftar Seluruh Pengguna NAS
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E7E5E4] text-[#57534E]">
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Total File</th>
                <th className="py-2.5 px-3">Penggunaan Kuota</th>
                <th className="py-2.5 px-3 text-right">Atur Kuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {users.map((u) => {
                const isEditing = editingUserId === u.id;
                const percent = Math.min(100, Math.round((u.used_storage_bytes / u.storage_quota_bytes) * 100)) || 0;

                return (
                  <tr key={u.id} className="hover:bg-[#FFFBF5]">
                    <td className="py-3 px-3 font-semibold text-[#1C1917]">
                      {u.username}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] uppercase tracking-wider font-bold bg-[#FFFBF5] text-[#1C1917] px-2 py-0.5 rounded border border-[#D6D3D1]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {u.total_files || 0} file
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-[#E7E5E4] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#C2410C] h-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[12px] text-[#57534E]">
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
                            className="input-artisan h-7 w-20 text-[12px] font-mono px-2"
                          />
                          <button
                            onClick={() => handleUpdateQuota(u.id)}
                            className="btn-primary text-[11px] h-7 px-2"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="text-[11px] text-[#57534E] hover:text-[#1C1917] px-1.5"
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

