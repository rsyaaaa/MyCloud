import React, { useState } from 'react';
import { Cloud, Upload, Search, User, LogOut, Shield, HardDrive, Wifi } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from './QuotaBar';

export default function Navbar({ onOpenUpload, searchQuery, setSearchQuery, onOpenQuotaModal }) {
  const { user, logout } = useAuth();
  const [userDropdown, setUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FFFBF5] border-b-2 border-[#D6D3D1] px-6 h-16 flex items-center justify-between">
      {/* Brand & Local IP Pill */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[6px] bg-[#C2410C] text-white flex items-center justify-center border border-[#9A3412]">
            <Cloud className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl text-[#1C1917] tracking-tight leading-none">
              MyCloud
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4A373]">
              Local Media Hub
            </span>
          </div>
        </div>

        {/* Local Network Info Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#D6D3D1] rounded-[4px] text-[11px] font-mono text-[#57534E]">
          <Wifi className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>192.168.18.78:8080</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari foto, video, atau momen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-artisan w-full pl-9 h-[38px] text-[13px]"
          />
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="btn-primary text-[14px] h-[38px] px-4"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Unggah Media</span>
        </button>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-[4px] border border-[#D6D3D1] bg-white hover:bg-[#FDF6EC] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#D4A373] text-[#1C1917] font-semibold text-[13px] flex items-center justify-center font-serif">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-[13px] font-semibold text-[#1C1917] hidden sm:inline">
              {user?.username}
            </span>
          </button>

          {userDropdown && (
            <div
              onClick={() => setUserDropdown(false)}
              className="absolute right-0 mt-2 w-64 bg-white border-2 border-[#D6D3D1] rounded-[8px] shadow-modal py-2 z-50 text-[13px] animate-in fade-in duration-100"
            >
              <div className="px-4 py-2 border-b border-[#E7E5E4]">
                <p className="font-semibold text-[#1C1917]">{user?.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold bg-[#FAF1E6] text-[#C2410C] px-1.5 py-0.5 rounded border border-[#D4A373]">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="px-4 py-2 text-[12px] text-[#57534E]">
                <p>
                  Penyimpanan:{' '}
                  <strong className="text-[#1C1917] font-mono">
                    {formatBytes(user?.used_storage_bytes)}
                  </strong>{' '}
                  / {formatBytes(user?.storage_quota_bytes)}
                </p>
                <button
                  onClick={onOpenQuotaModal}
                  className="mt-2 text-[#C2410C] font-semibold hover:underline block"
                >
                  Ajukan Tambah Kuota →
                </button>
              </div>

              <div className="border-t border-[#E7E5E4] my-1" />

              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

