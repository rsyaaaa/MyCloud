import React from 'react';
import { X, Calendar, HardDrive, FileText, Film, Image as ImageIcon, Clock, Maximize2 } from 'lucide-react';
import { formatBytes } from './QuotaBar';

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

export default function MediaDetailModal({ isOpen, onClose, media }) {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-5 shadow-modal text-[#0A0A0A] dark:text-[#FAFAFA] animate-enter"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27] mb-4">
          <div className="flex items-center gap-2">
            {media.media_type === 'video' ? (
              <Film className="w-5 h-5 text-[#C2410C]" />
            ) : (
              <ImageIcon className="w-5 h-5 text-[#C2410C]" />
            )}
            <h3 className="font-serif font-bold text-lg">Detail Berkas Media</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#6B6B6B] hover:text-[#0A0A0A] dark:text-[#9C9C9C] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-[13px]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
              Nama Tampilan
            </span>
            <p className="font-semibold break-all">{media.display_name}</p>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
              Nama File Asli
            </span>
            <p className="font-mono text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] break-all">{media.original_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
                Ukuran Berkas
              </span>
              <p className="font-mono font-semibold">{formatBytes(media.file_size)}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
                Format MIME
              </span>
              <p className="font-mono">{media.mime_type}</p>
            </div>
          </div>

          {(media.width && media.height) ? (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
                  Dimensi Resolusi
                </span>
                <p className="font-mono">{media.width} × {media.height} px</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
                  Orientasi
                </span>
                <p className="capitalize">
                  {media.is_portrait ? 'Portrait (9:16)' : 'Landscape (16:9)'}
                </p>
              </div>
            </div>
          ) : null}

          {media.media_type === 'video' && (
            <div className="pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
                Durasi Video
              </span>
              <p className="font-mono">{formatSeconds(media.duration_seconds)}</p>
            </div>
          )}

          <div className="pt-2 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block mb-0.5">
              Waktu Unggah / Diambil
            </span>
            <p className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
              {new Date(media.captured_at || media.created_at).toLocaleString('id-ID', {
                dateStyle: 'full',
                timeStyle: 'medium'
              })}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#E8E8EC] dark:border-[#1F1F27] flex justify-end">
          <button onClick={onClose} className="btn-primary h-9 text-[13px] px-4">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
