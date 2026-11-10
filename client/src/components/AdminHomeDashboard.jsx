import React, { useState, useEffect, useRef } from 'react';
import {
  Server, HardDrive, Wifi, Activity, Cpu, Users, ArrowUp, ArrowDown, ArrowUpDown,
  RefreshCw, CheckCircle, XCircle, Clock, Shield, Edit3, Check, X,
  Database, Globe, Play, Pause, AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { formatBytes } from './QuotaBar';
import { useLanguage } from '../context/LanguageContext';

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds, lang = 'id') {
  if (!seconds || seconds <= 0) return `0 ${lang === 'en' ? 'm' : 'mnt'}`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(lang === 'en' ? `${hours}h` : `${hours}j`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}

export default function AdminHomeDashboard() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newQuotaGb, setNewQuotaGb] = useState('');
  const pollIntervalRef = useRef(null);

  const fetchStatsOnly = async () => {
    try {
      const statsRes = await api.getAdminStats();
      setStats(statsRes);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Real-time poll failed:', err.message);
    }
  };

  const loadAllData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers()
      ]);
      setStats(statsRes);
      setUsers(usersRes.users || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Real-time live polling (every 2.5 seconds)
  useEffect(() => {
    if (!isLivePolling) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      fetchStatsOnly();
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isLivePolling]);

  const handleUpdateQuota = async (userId) => {
    const gb = parseFloat(newQuotaGb);
    if (isNaN(gb) || gb <= 0) {
      alert(t('invalidQuotaGb', 'Masukkan angka kuota GB yang valid.'));
      return;
    }

    try {
      await api.updateUserQuota(userId, gb);
      setEditingUserId(null);
      setNewQuotaGb('');
      await loadAllData();
    } catch (e) {
      alert(e.message || t('quotaUpdateFailed', 'Gagal memperbarui kuota.'));
    }
  };

  // Disk calculations
  const diskTotal = stats?.disk?.total || 500 * 1024 * 1024 * 1024;
  const diskUsed = stats?.disk?.used || 0;
  const diskFree = stats?.disk?.available || stats?.disk?.free || 0;
  const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

  // Realtime stats
  const network = stats?.network || { rx_speed_bytes: 0, tx_speed_bytes: 0, total_rx_bytes: 0, total_tx_bytes: 0, active_interface: 'eth0' };
  const diskIo = stats?.disk_io || { read_speed_bytes: 0, write_speed_bytes: 0, total_read_bytes: 0, total_write_bytes: 0, device: 'sda' };
  const system = stats?.system || { status: 'ONLINE', uptime_seconds: 0, cpu_percent: 0, cpu_cores: 4, load_avg: [0, 0, 0], memory: { total: 0, free: 0, used: 0, percent: 0 } };
  const activeTransfers = stats?.active_transfers || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-7 animate-enter">
      {/* Top Header & Server Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20 shadow-sm">
              <Server className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
                Server Monitoring & Admin Hub
              </h2>
              <p className="text-[12px] sm:text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                {t('adminDashSubtitle', 'Monitoring beban real-time, kapasitas total HDD host, dan pengelolaan kuota pengguna.')}
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Indicator & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Server Online Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ECFDF5] dark:bg-[#062817] text-[#059669] dark:text-[#34D399] rounded-[8px] border border-[#10B981]/25 text-[12px] font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
            </span>
            <span>SERVER ONLINE</span>
            <span className="text-[11px] font-mono text-[#059669]/80 dark:text-[#34D399]/80">
              • {formatUptime(system.uptime_seconds, lang)}
            </span>
          </div>

          {/* Toggle Live Polling */}
          <button
            onClick={() => setIsLivePolling(!isLivePolling)}
            className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium border flex items-center gap-1.5 transition-all ${
              isLivePolling
                ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border-[#C2410C]/30 shadow-sm'
                : 'bg-white dark:bg-[#0A0A0E] text-[#6B6B6B] dark:text-[#9C9C9C] border-[#E8E8EC] dark:border-[#1F1F27]'
            }`}
            title={isLivePolling ? t('pauseMonitoring', 'Jeda monitoring real-time') : t('enableMonitoring', 'Aktifkan monitoring real-time')}
          >
            {isLivePolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isLivePolling ? 'Live 2s' : t('pausedLabel', 'Paused')}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 rounded-[8px] border border-[#E8E8EC] dark:border-[#1F1F27] bg-white dark:bg-[#0A0A0E] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white transition-colors"
            title={t('refreshData', 'Muat ulang seluruh data')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Real-time Live Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Network Load (Real-Time) */}
        <div className="card-artisan p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] flex flex-col justify-between select-none">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] dark:bg-[#081B33] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center">
                  <Activity className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] block leading-tight">
                    Network Load
                  </span>
                  <span className="text-[10px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
                    {network.active_interface}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#EFF6FF] dark:bg-[#081B33] text-[#2563EB] dark:text-[#60A5FA] px-1.5 py-0.5 rounded border border-[#2563EB]/20">
                LIVE
              </span>
            </div>

            {/* Speeds */}
            <div className="space-y-1 my-2 font-mono">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#10B981] flex items-center gap-1 font-semibold">
                  <ArrowDown className="w-3.5 h-3.5" /> RX:
                </span>
                <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {formatSpeed(network.rx_speed_bytes)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#3B82F6] flex items-center gap-1 font-semibold">
                  <ArrowUp className="w-3.5 h-3.5" /> TX:
                </span>
                <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {formatSpeed(network.tx_speed_bytes)}
                </strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27] text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono flex items-center justify-between">
            <span>Total RX: {formatBytes(network.total_rx_bytes)}</span>
            <span>TX: {formatBytes(network.total_tx_bytes)}</span>
          </div>
        </div>

        {/* Card 2: HDD I/O Load (Real-Time) */}
        <div className="card-artisan p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] flex flex-col justify-between select-none">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center">
                  <HardDrive className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] block leading-tight">
                    HDD I/O Load
                  </span>
                  <span className="text-[10px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
                    dev/{diskIo.device}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] px-1.5 py-0.5 rounded border border-[#C2410C]/20">
                LIVE
              </span>
            </div>

            {/* Speeds */}
            <div className="space-y-1 my-2 font-mono">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#10B981] flex items-center gap-1 font-semibold">
                  Read:
                </span>
                <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {formatSpeed(diskIo.read_speed_bytes)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#C2410C] flex items-center gap-1 font-semibold">
                  Write:
                </span>
                <strong className="text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {formatSpeed(diskIo.write_speed_bytes)}
                </strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27] text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono flex items-center justify-between">
            <span>R: {formatBytes(diskIo.total_read_bytes)}</span>
            <span>W: {formatBytes(diskIo.total_write_bytes)}</span>
          </div>
        </div>

        {/* Card 3: CPU Load (Real-Time) */}
        <div className="card-artisan p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] flex flex-col justify-between select-none">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[8px] bg-[#F5F3FF] dark:bg-[#1D1438] text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center">
                  <Cpu className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] block leading-tight">
                    CPU Load
                  </span>
                  <span className="text-[10px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
                    {system.cpu_cores} Cores
                  </span>
                </div>
              </div>
              <span className={`text-[12px] font-mono font-bold px-2 py-0.5 rounded border ${
                system.cpu_percent > 85
                  ? 'bg-[#FEF2F2] dark:bg-[#200A0A] text-[#EF4444] border-[#EF4444]/30'
                  : system.cpu_percent > 65
                  ? 'bg-[#FEF3C7] dark:bg-[#2A1E05] text-[#D97706] border-[#F59E0B]/30'
                  : 'bg-[#ECFDF5] dark:bg-[#062817] text-[#059669] border-[#10B981]/30'
              }`}>
                {system.cpu_percent}%
              </span>
            </div>

            {/* Gauge bar */}
            <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-2 rounded-full overflow-hidden my-2.5">
              <div
                className={`h-full transition-all duration-300 ${
                  system.cpu_percent > 85 ? 'bg-[#EF4444]' : system.cpu_percent > 65 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                }`}
                style={{ width: `${Math.max(2, system.cpu_percent)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27] text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono flex items-center justify-between">
            <span>Load: {system.load_avg?.map(n => n.toFixed(2)).join(' ')}</span>
            <span>{t('hostOk', 'Host OK')}</span>
          </div>
        </div>

        {/* Card 4: RAM / Memory Load (Real-Time) */}
        <div className="card-artisan p-4 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] flex flex-col justify-between select-none">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[8px] bg-[#ECFDF5] dark:bg-[#062817] text-[#059669] dark:text-[#34D399] flex items-center justify-center">
                  <Database className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] block leading-tight">
                    RAM Memory
                  </span>
                  <span className="text-[10px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
                    System
                  </span>
                </div>
              </div>
              <span className="text-[12px] font-mono font-bold px-2 py-0.5 rounded bg-[#ECFDF5] dark:bg-[#062817] text-[#059669] dark:text-[#34D399] border border-[#10B981]/25">
                {system.memory?.percent || 0}%
              </span>
            </div>

            {/* Gauge bar */}
            <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-2 rounded-full overflow-hidden my-2.5">
              <div
                className="h-full bg-[#059669] dark:bg-[#10B981] transition-all duration-300"
                style={{ width: `${Math.max(2, system.memory?.percent || 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27] text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono flex items-center justify-between">
            <span>{formatBytes(system.memory?.used || 0)} / {formatBytes(system.memory?.total || 1)}</span>
            <span>{formatBytes(system.memory?.free || 0)} {t('freeLabel', 'Bebas')}</span>
          </div>
        </div>
      </div>

      {/* Prominent Physical HDD 500GB Storage Status Card */}
      <div className="card-artisan p-5 sm:p-6 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/25">
              <HardDrive className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
                {t('storageTotalTitle', 'Total Kapasitas Penyimpanan HDD Server Host')}
              </h3>
              <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-0.5">
                {t('storageVolumeNote', 'Volume penyimpanan fisik 500 GB untuk direktori data MyCloud')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-mono font-bold bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] px-3 py-1 rounded-[6px] border border-[#C2410C]/25">
              {diskPercent}{t('percentUsed', '% Terpakai')}
            </span>
          </div>
        </div>

        {/* Large Progress Bar */}
        <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-3.5 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all duration-500 ${
              diskPercent > 90 ? 'bg-[#EF4444]' : diskPercent > 75 ? 'bg-[#F59E0B]' : 'bg-[#C2410C]'
            }`}
            style={{ width: `${Math.max(1, diskPercent)}%` }}
          />
        </div>

        {/* 4 Summary Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-[#FAFAFA] dark:bg-[#121218] rounded-[10px] border border-[#E8E8EC] dark:border-[#1F1F27]">
            <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] block uppercase font-mono font-semibold">
              {t('totalPhysicalHdd', 'Total Fisik HDD')}
            </span>
            <strong className="text-[16px] sm:text-lg font-mono text-[#0A0A0A] dark:text-[#FAFAFA] block mt-0.5">
              {formatBytes(diskTotal)}
            </strong>
          </div>

          <div className="p-3 bg-[#FAFAFA] dark:bg-[#121218] rounded-[10px] border border-[#E8E8EC] dark:border-[#1F1F27]">
            <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] block uppercase font-mono font-semibold">
              {t('usedOsApp', 'Terpakai (OS + App)')}
            </span>
            <strong className="text-[16px] sm:text-lg font-mono text-[#C2410C] block mt-0.5">
              {formatBytes(diskUsed)}
            </strong>
          </div>

          <div className="p-3 bg-[#FAFAFA] dark:bg-[#121218] rounded-[10px] border border-[#E8E8EC] dark:border-[#1F1F27]">
            <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] block uppercase font-mono font-semibold">
              {t('freeSpace', 'Sisa Ruang Bebas')}
            </span>
            <strong className="text-[16px] sm:text-lg font-mono text-[#10B981] block mt-0.5">
              {formatBytes(diskFree)}
            </strong>
          </div>

          <div className="p-3 bg-[#FAFAFA] dark:bg-[#121218] rounded-[10px] border border-[#E8E8EC] dark:border-[#1F1F27]">
            <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] block uppercase font-mono font-semibold">
              {t('totalMediaData', 'Total Data Media')}
            </span>
            <strong className="text-[16px] sm:text-lg font-mono text-[#0A0A0A] dark:text-[#FAFAFA] block mt-0.5">
              {formatBytes(stats?.total_media_bytes || 0)}
            </strong>
            <span className="text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C] block">
              {stats?.media_count || 0} {t('filesStoredCount', 'berkas tersimpan')}
            </span>
          </div>
        </div>
      </div>

      {/* Registered Users & Disk Capacity Overview Table */}
      <section className="card-artisan p-5 sm:p-6 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center">
              <Users className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
                {t('usersListTitle', 'Daftar Pengguna & Kapasitas Disk')} ({users.length} {t('usersRegistered', 'User Terdaftar')})
              </h3>
              <p className="text-[11px] sm:text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                {t('privacyNote', 'Admin memantau kuota dan penggunaan penyimpanan. Privasi file pengguna sepenuhnya terlindungi.')}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#E8E8EC] dark:border-[#1F1F27] text-[#6B6B6B] dark:text-[#9C9C9C]">
                <th className="py-2.5 px-3">{t('userColumn', 'Pengguna')}</th>
                <th className="py-2.5 px-3">{t('accessType', 'Tipe Akses')}</th>
                <th className="py-2.5 px-3">{t('registered', 'Terdaftar')}</th>
                <th className="py-2.5 px-3">{t('totalFiles', 'Total File')}</th>
                <th className="py-2.5 px-3 min-w-[200px]">{t('diskUsedQuota', 'Kapasitas Disk Terpakai / Kuota')}</th>
                <th className="py-2.5 px-3 text-right">{t('setQuota', 'Atur Kuota')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8EC] dark:divide-[#1F1F27]">
              {users.map((u) => {
                const isEditing = editingUserId === u.id;
                const percent = Math.min(100, Math.round((u.used_storage_bytes / (u.storage_quota_bytes || 1)) * 100)) || 0;

                return (
                  <tr key={u.id} className="hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] transition-colors">
                    {/* Username */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] font-bold text-[12px] flex items-center justify-center border border-[#C2410C]/20 shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] block">
                            {u.username}
                          </strong>
                          {u.username === 'public' && (
                            <span className="text-[10px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                              Shared Public User
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                        u.role === 'admin'
                          ? 'bg-[#FEF2F2] dark:bg-[#200A0A] text-[#EF4444] border-[#EF4444]/30'
                          : u.role === 'public'
                          ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border-[#C2410C]/30'
                          : 'bg-[#F4F4F5] dark:bg-[#1A1A22] text-[#6B6B6B] dark:text-[#A1A1AA] border-[#E8E8EC] dark:border-[#272733]'
                      }`}>
                        {u.role === 'admin' ? 'ADMIN' : u.role === 'public' ? 'PUBLIC' : 'USER'}
                      </span>
                    </td>

                    {/* Registered Date */}
                    <td className="py-3 px-3 text-[#6B6B6B] dark:text-[#9C9C9C] font-mono text-[11px]">
                      {u.created_at ? u.created_at.slice(0, 10) : '-'}
                    </td>

                    {/* Total Files */}
                    <td className="py-3 px-3 font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">
                      {u.total_files || 0} {t('filesUnit', 'berkas')}
                    </td>

                    {/* Disk Usage & Quota Bar */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[#C2410C] font-semibold">
                            {formatBytes(u.used_storage_bytes)}
                          </span>
                          <span className="text-[#6B6B6B] dark:text-[#9C9C9C]">
                            {formatBytes(u.storage_quota_bytes)} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              percent > 90 ? 'bg-[#EF4444]' : percent > 75 ? 'bg-[#F59E0B]' : 'bg-[#C2410C]'
                            }`}
                            style={{ width: `${Math.max(1, percent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Edit Quota Action */}
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            placeholder="GB"
                            autoFocus
                            value={newQuotaGb}
                            onChange={(e) => setNewQuotaGb(e.target.value)}
                            className="input-artisan h-7 w-20 text-[12px] font-mono px-2 dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
                          />
                          <button
                            onClick={() => handleUpdateQuota(u.id)}
                            className="btn-primary text-[11px] h-7 px-2"
                            title={t('saveNewQuota', 'Simpan Kuota Baru')}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white px-1"
                            title={t('cancel', 'Batal')}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setNewQuotaGb(Math.round(u.storage_quota_bytes / (1024 * 1024 * 1024)));
                          }}
                          className="btn-ghost text-[12px] py-1 px-2.5 h-7 inline-flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{t('changeQuota', 'Ubah Kuota')}</span>
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

      {/* Active User Transfers Card (Live Upload / Download Monitoring) */}
      <section className="card-artisan p-5 sm:p-6 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] dark:bg-[#081B33] text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center">
              <ArrowUpDown className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#0A0A0A] dark:text-[#FAFAFA] leading-tight">
                {t('activeTransfersTitle', 'Aktivitas Transfer Data Pengguna')} ({activeTransfers.length} {t('activeNow', 'Aktif')})
              </h3>
              <p className="text-[11px] sm:text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                {t('activeTransfersSubtitle', 'Memantau pengguna yang sedang melakukan proses unggah (upload) atau unduh (download) data secara real-time.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded bg-[#F4F4F5] dark:bg-[#121217] text-[#6B6B6B] dark:text-[#9C9C9C] border border-[#E8E8EC] dark:border-[#1F1F27]">
              <span className={`w-2 h-2 rounded-full ${activeTransfers.length > 0 ? 'bg-[#10B981] animate-ping' : 'bg-[#9C9C9C]'}`} />
              <span>{activeTransfers.length > 0 ? 'TRANSFER BERLANGSUNG' : 'STANDBY'}</span>
            </span>
          </div>
        </div>

        {activeTransfers.length === 0 ? (
          <div className="py-8 text-center text-[#6B6B6B] dark:text-[#9C9C9C] space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#F4F4F5] dark:bg-[#121217] text-[#9C9C9C] flex items-center justify-center mx-auto">
              <ArrowUpDown className="w-6 h-6 stroke-[1.8] opacity-60" />
            </div>
            <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('noActiveTransfers', 'Tidak ada proses transfer data yang sedang berjalan')}
            </p>
            <p className="text-[11px] max-w-sm mx-auto text-[#9C9C9C]">
              {t('noActiveTransfersNote', 'Saat pengguna melakukan upload atau download berkas, progres dan total ukuran akan terpantau secara real-time di sini.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E8E8EC] dark:border-[#1F1F27] text-[#6B6B6B] dark:text-[#9C9C9C]">
                  <th className="py-2.5 px-3">{t('userColumn', 'Pengguna')}</th>
                  <th className="py-2.5 px-3">{t('transferType', 'Aktivitas')}</th>
                  <th className="py-2.5 px-3">{t('totalSize', 'Total Ukuran')}</th>
                  <th className="py-2.5 px-3 min-w-[220px]">{t('transferProgress', 'Progres Selesai')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8EC] dark:divide-[#1F1F27]">
                {activeTransfers.map((item) => {
                  const isUpload = item.type === 'upload';
                  const percent = Math.min(100, Math.max(0, item.progress || 0));

                  return (
                    <tr key={item.id} className="hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] transition-colors">
                      {/* User */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full font-bold text-[12px] flex items-center justify-center border shrink-0 ${
                            isUpload
                              ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border-[#C2410C]/20'
                              : 'bg-[#EFF6FF] dark:bg-[#081B33] text-[#2563EB] border-[#2563EB]/20'
                          }`}>
                            {(item.username || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] block">
                              {item.username}
                            </strong>
                            <span className="text-[10px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
                              ID: {item.id.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type: Upload or Download */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          isUpload
                            ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border-[#C2410C]/30'
                            : 'bg-[#EFF6FF] dark:bg-[#081B33] text-[#2563EB] border-[#2563EB]/30'
                        }`}>
                          {isUpload ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                          {isUpload ? 'UPLOAD DATA' : 'DOWNLOAD DATA'}
                        </span>
                      </td>

                      {/* Total Size */}
                      <td className="py-3 px-3 font-mono">
                        <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] text-[13px] block">
                          {formatBytes(item.totalBytes)}
                        </strong>
                        <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">
                          {formatBytes(item.transferredBytes)} terkirim
                        </span>
                      </td>

                      {/* Progress Bar & Percentage */}
                      <td className="py-3 px-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[#6B6B6B] dark:text-[#9C9C9C]">
                              {percent === 100 ? 'Menyelesaikan...' : 'Mentransfer data...'}
                            </span>
                            <span className={`font-bold ${isUpload ? 'text-[#C2410C]' : 'text-[#2563EB]'}`}>
                              {percent}%
                            </span>
                          </div>
                          <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                isUpload
                                  ? 'bg-gradient-to-r from-[#C2410C] to-[#EA580C]'
                                  : 'bg-gradient-to-r from-[#2563EB] to-[#60A5FA]'
                              }`}
                              style={{ width: `${Math.max(2, percent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Host Specs Footer Banner */}
      <div className="p-4 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] flex flex-wrap items-center justify-between text-[11px] sm:text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] gap-3">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#10B981]" />
          <span>Host: <strong>{system.hostname || 'autofocus-server'}</strong> ({system.platform || 'Linux'})</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>LAN IP: 192.168.18.78:8080</span>
          <span>•</span>
          <span>Runtime: Node.js {system.node_version}</span>
        </div>
      </div>
    </div>
  );
}

