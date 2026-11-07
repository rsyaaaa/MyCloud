import React, { useEffect, useRef } from 'react';
import {
  Heart, Lock, Unlock, Folder, Edit2, Download, Info, Trash2, X
} from 'lucide-react';
import { api } from '../api';

export default function MediaContextMenu({
  isOpen,
  onClose,
  media,
  position = { x: 0, y: 0 },
  isMobile = false,
  isVault = false,
  vaultToken = null,
  onToggleFavorite,
  onLock,
  onUnlock,
  onOrganize,
  onRename,
  onDelete,
  onShowDetail
}) {
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleScroll = () => onClose();

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !media) return null;

  // Calculate adjusted desktop position so it never overflows screen bounds
  const menuWidth = 220;
  const menuHeight = 310;
  let posX = position.x;
  let posY = position.y;

  if (typeof window !== 'undefined') {
    if (posX + menuWidth > window.innerWidth - 10) {
      posX = window.innerWidth - menuWidth - 10;
    }
    if (posY + menuHeight > window.innerHeight - 10) {
      posY = window.innerHeight - menuHeight - 10;
    }
  }

  const items = [
    {
      id: 'favorite',
      label: media.is_favorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit',
      icon: Heart,
      iconColor: media.is_favorite ? 'text-[#DC2626] fill-[#DC2626]' : 'text-[#DC2626]',
      onClick: () => {
        onToggleFavorite(media.id, !media.is_favorite);
        onClose();
      }
    },
    ...(isVault
      ? [
          {
            id: 'unlock',
            label: 'Keluarkan ke Galeri',
            icon: Unlock,
            iconColor: 'text-[#365314]',
            onClick: () => {
              onUnlock(media.id);
              onClose();
            }
          }
        ]
      : [
          {
            id: 'lock',
            label: 'Pindah ke Brankas',
            icon: Lock,
            iconColor: 'text-[#C2410C]',
            onClick: () => {
              onLock(media.id);
              onClose();
            }
          }
        ]),
    ...(!isVault && onOrganize
      ? [
          {
            id: 'organize',
            label: 'Pindah ke Folder/Album',
            icon: Folder,
            iconColor: 'text-[#D4A373]',
            onClick: () => {
              onOrganize(media);
              onClose();
            }
          }
        ]
      : []),
    {
      id: 'rename',
      label: 'Ubah Nama Berkas',
      icon: Edit2,
      iconColor: 'text-[#57534E] dark:text-[#A8A29E]',
      onClick: () => {
        onRename(media);
        onClose();
      }
    },
    ...(!isVault
      ? [
          {
            id: 'download',
            label: 'Unduh File Asli',
            icon: Download,
            iconColor: 'text-[#57534E] dark:text-[#A8A29E]',
            href: api.getDownloadUrl(media.id),
            isLink: true
          }
        ]
      : []),
    {
      id: 'detail',
      label: 'Detail Metadata',
      icon: Info,
      iconColor: 'text-[#3B82F6]',
      onClick: () => {
        onShowDetail(media);
        onClose();
      }
    },
    {
      id: 'delete',
      label: 'Pindahkan ke Sampah',
      icon: Trash2,
      iconColor: 'text-[#DC2626]',
      isDestructive: true,
      onClick: () => {
        onDelete(media.id);
        onClose();
      }
    }
  ];

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#23201D] border-t-2 border-[#D6D3D1] dark:border-[#3E3834] rounded-t-[16px] p-4 pb-8 shadow-modal animate-in slide-in-from-bottom duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4] dark:border-[#3E3834] mb-2">
            <div className="truncate flex-1 pr-2">
              <h4 className="font-semibold text-[14px] text-[#1C1917] dark:text-[#F5F2EB] truncate">
                {media.display_name}
              </h4>
              <span className="text-[11px] text-[#57534E] dark:text-[#A8A29E]">Opsi Tindakan Media</span>
            </div>
            <button onClick={onClose} className="p-1 text-[#57534E] dark:text-[#A8A29E]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List of actions */}
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              if (item.isLink) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    download
                    onClick={onClose}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[6px] text-[14px] text-[#1C1917] dark:text-[#F5F2EB] hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] transition-colors"
                  >
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                    <span>{item.label}</span>
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-[6px] text-[14px] transition-colors ${
                    item.isDestructive
                      ? 'text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#3D1414]'
                      : 'text-[#1C1917] dark:text-[#F5F2EB] hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                  <span className={item.isDestructive ? 'font-semibold' : ''}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Floating Context Menu
  return (
    <div
      ref={menuRef}
      style={{ top: `${posY}px`, left: `${posX}px` }}
      className="fixed z-50 w-56 bg-white dark:bg-[#23201D] border-2 border-[#D6D3D1] dark:border-[#3E3834] rounded-[8px] shadow-modal py-1.5 text-[13px] animate-enter select-none"
    >
      <div className="px-3 py-1 border-b border-[#E7E5E4] dark:border-[#3E3834] mb-1">
        <p className="font-semibold text-[#1C1917] dark:text-[#F5F2EB] truncate text-[12px]">
          {media.display_name}
        </p>
      </div>

      {items.map((item) => {
        const Icon = item.icon;
        if (item.isLink) {
          return (
            <a
              key={item.id}
              href={item.href}
              download
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-1.5 text-[#1C1917] dark:text-[#F5F2EB] hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26] transition-colors"
            >
              <Icon className={`w-4 h-4 ${item.iconColor}`} />
              <span>{item.label}</span>
            </a>
          );
        }

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
              item.isDestructive
                ? 'text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#3D1414] font-semibold border-t border-[#E7E5E4] dark:border-[#3E3834] mt-1 pt-1.5'
                : 'text-[#1C1917] dark:text-[#F5F2EB] hover:bg-[#FFFBF5] dark:hover:bg-[#2E2A26]'
            }`}
          >
            <Icon className={`w-4 h-4 ${item.iconColor}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
