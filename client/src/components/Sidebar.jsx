import React from 'react';
import {
  Image, Video, Folder, Trash2, Settings, HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import QuotaBar from './QuotaBar';

export default function Sidebar({ currentTab, setTab, onRequestIncreaseQuota }) {
  const { user } = useAuth();

  const navItems = [
    { id: 'gallery', label: 'Galeri Utama', icon: Image },
    { id: 'videos', label: 'Video Hub', icon: Video },
    { id: 'albums', label: 'Album & Folder', icon: Folder },
    { id: 'trash', label: 'Tempat Sampah', icon: Trash2 },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Dashboard', icon: Settings });
  }

  return (
    <aside className="w-64 bg-[#FFFBF5] dark:bg-[#1E1B19] border-r-2 border-[#D6D3D1] dark:border-[#3E3834] flex flex-col justify-between shrink-0 min-h-[calc(100vh-64px)] p-4 transition-colors">
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
                  ? 'bg-[#FDF6EC] dark:bg-[#2E2A26] text-[#C2410C] font-semibold border border-[#D4A373]'
                  : 'text-[#57534E] dark:text-[#A8A29E] hover:bg-white dark:hover:bg-[#23201D] hover:text-[#1C1917] dark:hover:text-[#F5F2EB]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C2410C]' : 'text-[#57534E] dark:text-[#A8A29E]'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Quota bar at bottom */}
      <div className="pt-4 border-t border-[#E7E5E4] dark:border-[#3E3834]">
        <QuotaBar
          usedBytes={user?.used_storage_bytes || 0}
          quotaBytes={user?.storage_quota_bytes || 1}
          onRequestIncrease={onRequestIncreaseQuota}
        />
      </div>
    </aside>
  );
}
