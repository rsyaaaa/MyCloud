import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle, X,
  RotateCcw, Trash2, File, Image as ImageIcon, Video, FileText,
  Archive, Loader2, Sparkles, Folder
} from 'lucide-react';
import { useTransfer } from '../context/TransferContext';
import { useLanguage } from '../context/LanguageContext';
import { formatBytes } from './QuotaBar';

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function getFileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return <ImageIcon className="w-5 h-5 text-[#C2410C]" />;
  }
  if (['mp4', 'mkv', 'mov', 'webm', 'avi'].includes(ext)) {
    return <Video className="w-5 h-5 text-amber-500" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return <FileText className="w-5 h-5 text-[#EA580C]" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-5 h-5 text-amber-600" />;
  }
  return <File className="w-5 h-5 text-gray-400" />;
}

export default function TransferListView({ onBack, onOpenUpload, hideHeader = false }) {
  const { lang, t } = useLanguage();
  const {
    uploads,
    downloads,
    activeUploads,
    activeDownloads,
    completedUploads,
    completedDownloads,
    failedUploads,
    failedDownloads,
    startUpload,
    cancelUpload,
    retryUpload,
    removeUpload,
    clearCompletedUploads,
    cancelDownload,
    retryDownload,
    removeDownload,
    clearCompletedDownloads,
    clearTransferFailureIndicator,
    pendingFailurePopup,
    dismissFailurePopup
  } = useTransfer();

  // Main Tabs: 'upload' | 'download'
  const [activeTab, setActiveTab] = useState('upload');
  // Sub-Tabs / Pills: 'completed' | 'ongoing'
  const [subTab, setSubTab] = useState('ongoing');

  const fileInputRef = useRef(null);

  // When Transfer List is opened, clear the failure indicator from the floating button
  useEffect(() => {
    clearTransferFailureIndicator();
  }, []);

  const ongoingUploadList = uploads.filter((u) => u.status !== 'completed');
  const ongoingDownloadList = downloads.filter((d) => d.status !== 'completed');

  const completedCount = activeTab === 'upload' ? completedUploads.length : completedDownloads.length;
  const ongoingCount = activeTab === 'upload' ? ongoingUploadList.length : ongoingDownloadList.length;

  const currentList =
    activeTab === 'upload'
      ? subTab === 'completed'
        ? completedUploads
        : ongoingUploadList
      : subTab === 'completed'
      ? completedDownloads
      : ongoingDownloadList;

  const handleSelectFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      startUpload(files);
      setSubTab('ongoing');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0B0B0E] text-[#0A0A0A] dark:text-[#F4F4F5] flex flex-col animate-enter select-none pb-32">
      {/* Hidden File Input for direct uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleSelectFiles}
      />

      {/* 1. TOP NAVBAR (For Desktop / standalone view, hidden on mobile where MobileApp navbar is used) */}
      {!hideHeader && (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0E0E12]/95 backdrop-blur-md border-b border-[#E8E8EC] dark:border-[#1E1E26] px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F4F4F6] dark:hover:bg-[#1A1A24] active:scale-95 text-[#0A0A0A] dark:text-[#FAFAFA] transition-colors -ml-1"
              title={lang === 'en' ? 'Back' : 'Kembali'}
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.4]" />
            </button>

            <h2 className="font-display font-bold text-base text-[#0A0A0A] dark:text-[#FAFAFA] tracking-tight">
              Transfer List
            </h2>
          </div>

          {/* Clear Completed History Button */}
          {subTab === 'completed' && currentList.length > 0 && (
            <button
              onClick={() => {
                if (activeTab === 'upload') clearCompletedUploads();
                else clearCompletedDownloads();
              }}
              className="text-[12px] text-[#C2410C] font-semibold flex items-center gap-1 active:scale-95"
              title="Bersihkan riwayat selesai"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          )}
        </header>
      )}

      {/* 2. MAIN TABS: Upload | Download (Orange Terracotta Theme) */}
      <div className="flex border-b border-[#E8E8EC] dark:border-[#1E1E26] bg-white dark:bg-[#0E0E12] px-4">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-3 text-[14px] font-semibold text-center relative transition-colors ${
            activeTab === 'upload'
              ? 'text-[#C2410C]'
              : 'text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <ArrowUp className={`w-4 h-4 stroke-[2.2] ${activeTab === 'upload' ? 'text-[#C2410C]' : 'text-[#8E8E9E]'}`} />
            <span>Upload</span>
          </div>
          {activeTab === 'upload' && (
            <div className="absolute bottom-0 inset-x-8 h-0.5 bg-[#C2410C] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('download')}
          className={`flex-1 py-3 text-[14px] font-semibold text-center relative transition-colors ${
            activeTab === 'download'
              ? 'text-[#C2410C]'
              : 'text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA]'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <ArrowDown className={`w-4 h-4 stroke-[2.2] ${activeTab === 'download' ? 'text-[#C2410C]' : 'text-[#8E8E9E]'}`} />
            <span>Download</span>
          </div>
          {activeTab === 'download' && (
            <div className="absolute bottom-0 inset-x-8 h-0.5 bg-[#C2410C] rounded-full" />
          )}
        </button>
      </div>

      {/* 3. SUB-TABS PILLS: Completed (count) | Ongoing (count) (Orange Terracotta Pill Theme) */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('completed')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 border ${
              subTab === 'completed'
                ? 'bg-[#FFF7ED] dark:bg-[#2A140A] text-[#C2410C] border-[#C2410C]/40 shadow-xs'
                : 'bg-[#F4F4F6] dark:bg-[#14141B] text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] border-transparent'
            }`}
          >
            Completed {completedCount}
          </button>

          <button
            onClick={() => setSubTab('ongoing')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 border ${
              subTab === 'ongoing'
                ? 'bg-[#FFF7ED] dark:bg-[#2A140A] text-[#C2410C] border-[#C2410C]/40 shadow-xs'
                : 'bg-[#F4F4F6] dark:bg-[#14141B] text-[#8E8E9E] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] border-transparent'
            }`}
          >
            Ongoing {ongoingCount}
          </button>
        </div>

        {/* Clear Completed History Button for Mobile */}
        {subTab === 'completed' && currentList.length > 0 && (
          <button
            onClick={() => {
              if (activeTab === 'upload') clearCompletedUploads();
              else clearCompletedDownloads();
            }}
            className="text-[11.5px] text-[#C2410C] font-semibold flex items-center gap-1 active:scale-95"
            title="Bersihkan riwayat selesai"
          >
            <Trash2 className="w-3 h-3" />
            <span>Bersihkan</span>
          </button>
        )}
      </div>

      {/* 4. CONTENT LIST / EMPTY STATE */}
      <div className="flex-1 px-4 py-2">
        {currentList.length === 0 ? (
          /* Empty State Illustration (Matching Screenshot doodle cloud in Orange MyCloud Theme) */
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            {/* Cute Cloud Character Doodle SVG in MyCloud Orange */}
            <div className="w-36 h-36 relative mb-4 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
                {/* Background swirling lines in orange */}
                <path
                  d="M 25 105 C 15 95, 30 75, 45 85"
                  fill="none"
                  stroke="#C2410C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="opacity-75"
                />
                <path
                  d="M 125 105 C 145 95, 140 70, 120 78"
                  fill="none"
                  stroke="#C2410C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="opacity-75"
                />

                {/* Cloud Body */}
                <path
                  d="M 45 110 
                     L 115 110 
                     A 22 22 0 0 0 135 90 
                     A 20 20 0 0 0 120 62 
                     A 28 28 0 0 0 75 52 
                     A 22 22 0 0 0 35 75 
                     A 22 22 0 0 0 45 110 Z"
                  fill="#FFFFFF"
                  stroke="#1E1E26"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />

                {/* Cloud cute face */}
                <circle cx="65" cy="78" r="2.8" fill="#1E1E26" />
                <circle cx="85" cy="78" r="2.8" fill="#1E1E26" />
                <path
                  d="M 72 84 Q 75 87 78 84"
                  fill="none"
                  stroke="#1E1E26"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Cute Waving Arm with orange accent */}
                <path
                  d="M 108 85 C 115 75, 122 80, 120 92 C 115 95, 108 92, 108 85 Z"
                  fill="#EA580C"
                />

                {/* Bottom belly orange pouch */}
                <rect x="52" y="93" width="35" height="15" rx="5" fill="#C2410C" />
              </svg>
            </div>

            <p className="text-[13px] text-[#8E8E9E] font-medium mb-3">
              {activeTab === 'upload' ? 'No Upload Records' : 'No Download Records'}
            </p>

            {/* Direct Upload button in empty state in Orange */}
            {activeTab === 'upload' && (
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="text-[13.5px] font-semibold text-[#C2410C] hover:text-[#EA580C] active:scale-95 transition-transform"
              >
                Upload
              </button>
            )}
          </div>
        ) : (
          /* Transfer Items List */
          <div className="space-y-2.5">
            {currentList.map((item) => {
              const isUpload = item.type === 'upload';
              const isFailed = item.status === 'failed';
              const isCompleted = item.status === 'completed';
              const isOngoing = item.status === 'uploading' || item.status === 'downloading' || item.status === 'queued';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-[16px] bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] shadow-xs flex flex-col gap-2 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* File Icon + Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-[12px] bg-[#F4F4F6] dark:bg-[#1E1E28] flex items-center justify-center shrink-0">
                        {getFileIcon(item.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[#8E8E9E] font-mono mt-0.5">
                          {formatBytes(item.size || item.totalBytes)}
                          {item.categoryName ? ` • di folder "${item.categoryName}"` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCompleted && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                          <button
                            onClick={() => (isUpload ? removeUpload(item.id) : removeDownload(item.id))}
                            className="p-1 rounded-full text-[#8E8E9E] hover:text-[#EF4444] active:scale-90 transition-colors"
                            title="Hapus riwayat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {isOngoing && (
                        <button
                          onClick={() => (isUpload ? cancelUpload(item.id) : cancelDownload(item.id))}
                          className="w-7 h-7 rounded-full bg-[#F4F4F6] dark:bg-[#1E1E28] text-[#8E8E9E] hover:text-[#EF4444] flex items-center justify-center active:scale-90 transition-colors"
                          title="Batalkan transfer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {isFailed && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => (isUpload ? retryUpload(item.id) : retryDownload(item.id))}
                            className="p-1.5 rounded-full bg-[#FFF7ED] dark:bg-[#2A140A] text-[#C2410C] hover:bg-[#FFEDD5] active:scale-90 transition-colors"
                            title="Ulangi transfer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => (isUpload ? removeUpload(item.id) : removeDownload(item.id))}
                            className="p-1.5 rounded-full text-[#8E8E9E] hover:text-[#EF4444] active:scale-90 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Status (for ongoing / failed) */}
                  {isOngoing && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-[#E8E8EC] dark:bg-[#22222E] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isUpload ? 'bg-[#C2410C]' : 'bg-[#10B981]'
                          }`}
                          style={{ width: `${Math.max(5, item.progress)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8E8E9E]">
                        <span>
                          {item.status === 'queued'
                            ? 'Menunggu antrean...'
                            : `${formatBytes(item.loadedBytes)} / ${formatBytes(item.totalBytes)} (${item.progress}%)`}
                        </span>
                        {item.speed > 0 && <span>{formatSpeed(item.speed)}</span>}
                      </div>
                    </div>
                  )}

                  {/* Failed Error Message */}
                  {isFailed && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-[#E8E8EC] dark:bg-[#22222E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#EF4444] transition-all"
                          style={{ width: `${Math.max(10, item.failedAtProgress || 20)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#EF4444] flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.error || 'Transfer gagal'}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. FAILURE MODAL POPUP DIALOG */}
      {pendingFailurePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-sm rounded-[22px] bg-white dark:bg-[#14141B] border border-[#E8E8EC] dark:border-[#22222E] p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] dark:bg-[#2A0E0E] text-[#EF4444] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-semibold text-base text-[#0A0A0A] dark:text-[#FAFAFA]">
                {pendingFailurePopup.title || 'Transfer Gagal'}
              </h3>
              <p className="text-[12.5px] text-[#6B6B6B] dark:text-[#A1A1AA] leading-relaxed">
                Berkas <strong>{pendingFailurePopup.fileName}</strong> gagal diproses.
              </p>
              <div className="p-2.5 rounded-[10px] bg-[#FEF2F2] dark:bg-[#2A0E0E] border border-[#EF4444]/20 text-[11.5px] text-[#EF4444] text-left">
                <strong>Alasan:</strong> {pendingFailurePopup.reason}
              </div>
            </div>

            <button
              onClick={dismissFailurePopup}
              className="w-full py-2.5 rounded-[12px] bg-[#C2410C] hover:bg-[#EA580C] text-white font-semibold text-[13px] active:scale-95 transition-all shadow-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
