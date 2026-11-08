import React from 'react';
import {
  Home, Images, Folder, Trash2, Settings, HardDrive, X, Terminal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import QuotaBar from './QuotaBar';

export default function Sidebar({ currentTab, setTab, onRequestIncreaseQuota, onHide }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', label: user?.role === 'admin' ? 'Server Dashboard' : t('home', 'Home'), icon: Home },
  ];

  // Untuk admin, halaman gallery dihapus
  if (user?.role !== 'admin') {
    navItems.push({ id: 'gallery', label: t('gallery', 'Galeri'), icon: Images });
  }

  navItems.push(
    { id: 'allfiles', label: t('allFiles', 'All Files'), icon: Folder },
    { id: 'trash', label: t('trash', 'Tempat Sampah'), icon: Trash2 }
  );

  // Menu Terminal khusus Admin
  if (user?.role === 'admin') {
    navItems.push({ id: 'terminal', label: 'Terminal', icon: Terminal });
  }

  return (
    <aside className="w-64 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto bg-white dark:bg-[#000000] border-r border-[#E8E8EC] dark:border-[#1F1F27] flex flex-col justify-between shrink-0 p-4 transition-colors z-30 scrollbar-none select-none">
      <div>
        {/* Navigation Header with X Button */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#9C9C9C]">
            Menu
          </span>
          {onHide && (
            <button
              onClick={onHide}
              className="p-1 rounded-[6px] text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white hover:bg-[#F4F4F5] dark:hover:bg-[#141418] transition-colors"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

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
      </div>

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
