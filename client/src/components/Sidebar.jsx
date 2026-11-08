import React from 'react';
import {
  Home, Images, Folder, Trash2, Settings, HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import QuotaBar from './QuotaBar';

export default function Sidebar({ currentTab, setTab, onRequestIncreaseQuota }) {
  const { user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'gallery', label: 'Galeri', icon: Images },
    { id: 'allfiles', label: 'All Files', icon: Folder },
    { id: 'trash', label: 'Tempat Sampah', icon: Trash2 },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin Dashboard', icon: Settings });
  }

  return (
    <aside className="w-64 bg-white dark:bg-[#000000] border-r border-[#E8E8EC] dark:border-[#1F1F27] flex flex-col justify-between shrink-0 min-h-[calc(100vh-56px)] p-4 transition-colors">
      {/* Navigation Links */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[6px] text-[14px] font-medium transition-all ${
                isActive
                  ? 'bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] dark:text-[#FB923C] font-semibold border border-[#C2410C]/20 shadow-sm'
                  : 'text-[#6B6B6B] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#121218] hover:text-[#0A0A0A] dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C2410C] dark:text-[#FB923C]' : 'text-[#6B6B6B] dark:text-[#A1A1AA]'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Quota bar at bottom */}
      <div className="pt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
        <QuotaBar
          usedBytes={user?.used_storage_bytes || 0}
          quotaBytes={user?.storage_quota_bytes || 1}
          onRequestIncrease={onRequestIncreaseQuota}
        />
      </div>
    </aside>
  );
}
