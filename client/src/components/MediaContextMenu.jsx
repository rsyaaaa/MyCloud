import React, { useEffect, useRef } from 'react';
import {
  Heart, Lock, Unlock, Folder, Edit2, Download, Info, Trash2, X
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();

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
      label: media.is_favorite ? t('removeFavorite', 'Hapus dari Favorit') : t('addFavorite', 'Tambah ke Favorit'),
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
            label: t('removeFromVault', 'Keluarkan ke Galeri'),
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
            label: t('moveToVault', 'Pindah ke Brankas'),
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
            label: t('moveToFolderAlbum', 'Pindah ke Folder/Album'),
            icon: Folder,
            iconColor: 'text-[#C2410C]',
            onClick: () => {
              onOrganize(media);
              onClose();
            }
          }
        ]
      : []),
    {
      id: 'rename',
      label: t('renameFile', 'Ubah Nama Berkas'),
      icon: Edit2,
      iconColor: 'text-[#6B6B6B] dark:text-[#9C9C9C]',
      onClick: () => {
        onRename(media);
        onClose();
      }
    },
    ...(!isVault
      ? [
          {
            id: 'download',
            label: t('downloadOriginal', 'Unduh File Asli'),
            icon: Download,
            iconColor: 'text-[#6B6B6B] dark:text-[#9C9C9C]',
            href: api.getDownloadUrl(media.id),
            isLink: true
          }
        ]
      : []),
    {
      id: 'detail',
      label: t('metadataDetail', 'Detail Metadata'),
      icon: Info,
      iconColor: 'text-[#C2410C]',
      onClick: () => {
        onShowDetail(media);
        onClose();
      }
    },
    {
      id: 'delete',
      label: t('moveToTrash', 'Pindahkan ke Sampah'),
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
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#0A0A0E] border-t border-[#E8E8EC] dark:border-[#1F1F27] rounded-t-[16px] p-4 pb-8 shadow-modal animate-in slide-in-from-bottom duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27] mb-2">
            <div className="truncate flex-1 pr-2">
              <h4 className="font-semibold text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                {media.display_name}
              </h4>
              <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C]">{t('mediaActions', 'Opsi Tindakan Media')}</span>
            </div>
            <button onClick={onClose} className="p-1 text-[#6B6B6B] dark:text-[#9C9C9C]">
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
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[6px] text-[14px] text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] transition-colors"
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
                      ? 'text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#2A0808]'
                      : 'text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A]'
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
      className="fixed z-50 w-56 bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[8px] shadow-lg py-1.5 text-[13px] animate-enter select-none"
    >
      <div className="px-3 py-1 border-b border-[#E8E8EC] dark:border-[#1F1F27] mb-1">
        <p className="font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate text-[12px]">
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
              className="flex items-center gap-2.5 px-3 py-1.5 text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A] transition-colors"
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
                ? 'text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#2A0808] font-semibold border-t border-[#E8E8EC] dark:border-[#1F1F27] mt-1 pt-1.5'
                : 'text-[#0A0A0A] dark:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#14141A]'
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
