import React from 'react';
import {
  Image, Video, Folder, Shield, ShieldAlert, ShieldCheck,
  Settings, HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import QuotaBar from './QuotaBar';

export default function Sidebar({ currentTab, setTab, onRequestIncreaseQuota }) {
  const { user } = useAuth();
  const { isUnlocked, remainingSeconds } = useVault();

  const navItems = [
    { id: 'gallery', label: 'Galeri Utama', icon: Image },
    { id: 'videos', label: 'Video Hub', icon: Video },
    { id: 'albums', label: 'Album & Folder', icon: Folder },
    {
      id: 'vault',
      label: 'Brankas Terkunci',
      icon: isUnlocked ? ShieldCheck : Shield,
      badge: isUnlocked ? `${remainingSeconds}s` : null,
      badgeColor: isUnlocked ? 'bg-[#DCFCE7] text-[#166534] border-[#22C55E]' : null
    },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Dashboard', icon: Settings });
  }

  return (
    <aside className="w-64 bg-[#FFFBF5] border-r-2 border-[#D6D3D1] flex flex-col justify-between shrink-0 min-h-[calc(100vh-64px)] p-4">
      {/* Navigation Links */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[4px] text-[14px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#FDF6EC] text-[#C2410C] font-semibold border border-[#D4A373]'
                  : 'text-[#57534E] hover:bg-white hover:text-[#1C1917]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C2410C]' : 'text-[#57534E]'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-[3px] border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quota bar at bottom */}
      <div className="pt-4 border-t border-[#E7E5E4]">
        <QuotaBar
          usedBytes={user?.used_storage_bytes || 0}
          quotaBytes={user?.storage_quota_bytes || 1}
          onRequestIncrease={onRequestIncreaseQuota}
        />
      </div>
    </aside>
  );
}

