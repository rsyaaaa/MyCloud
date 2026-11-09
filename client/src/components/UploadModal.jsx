import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, File, AlertCircle, CheckCircle, Loader2, Folder } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTransfer } from '../context/TransferContext';
import { formatBytes } from './QuotaBar';

export default function UploadModal({
  isOpen,
  onClose,
  user,
  targetFolder = null,
  onUploadSuccess,
  onRequestQuota
}) {
  const { t, tp } = useLanguage();
  const { startUpload } = useTransfer();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressInfo, setProgressInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOverQuota, setIsOverQuota] = useState(false);
  const [folderList, setFolderList] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(targetFolder?.id || '');
      api.listCategories().then(res => {
        setFolderList(res.categories || []);
      }).catch(() => {});
    }
  }, [isOpen, targetFolder]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    validateAndSetFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    validateAndSetFiles(files);
  };

  const validateAndSetFiles = (files) => {
    setErrorMsg('');
    setIsOverQuota(false);

    const totalNewBytes = files.reduce((acc, f) => acc + f.size, 0);
    const availableBytes = (user?.storage_quota_bytes || 0) - (user?.used_storage_bytes || 0);

    if (totalNewBytes > availableBytes) {
      setErrorMsg(tp('quotaExceeded', `Ukuran total file (${formatBytes(totalNewBytes)}) melebihi sisa kuota Anda (${formatBytes(availableBytes)}).`, {
        size: formatBytes(totalNewBytes),
        available: formatBytes(availableBytes)
      }));
      setIsOverQuota(true);
    }

    setSelectedFiles(files);
  };

  const handleRemoveFile = (indexToRemove) => {
    if (uploading) return;
    const updated = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    validateAndSetFiles(updated);
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setProgressInfo(null);
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setErrorMsg('');
    setProgressInfo(null);
    onClose();
  };

  const handleUploadAll = () => {
    if (selectedFiles.length === 0) return;
    const targetFolderObj = folderList.find((f) => f.id === selectedFolderId) || targetFolder || null;
    startUpload(selectedFiles, targetFolderObj);
    setSelectedFiles([]);
    setErrorMsg('');
    setIsOverQuota(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[14px] max-w-lg w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150 text-[#0A0A0A] dark:text-[#FAFAFA]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center border border-[#C2410C]/20">
              <UploadCloud className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('uploadMedia', 'Upload Media (Foto / Video)')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] p-1.5 rounded-[6px] hover:bg-[#F4F4F5] dark:hover:bg-[#1A1A22] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#200A0A] border border-[#EF4444]/40 rounded-[8px] text-[#EF4444] dark:text-[#FCA5A5] text-[13px] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {isOverQuota && (
                <p className="mt-2 text-[12px] font-medium text-[#C2410C]">
                  {t('contactAdminStorage', 'Hubungi Administrator untuk penambahan kuota penyimpanan.')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Destination Folder Selector */}
        {!uploading && (
          <div className="mb-4 flex items-center justify-between gap-3 p-2.5 rounded-[8px] bg-[#F5F5F7] dark:bg-[#14141A] border border-[#E8E8EC] dark:border-[#1F1F27] text-[13px]">
            <div className="flex items-center gap-2 text-[#6B6B6B] dark:text-[#9C9C9C] shrink-0">
              <Folder className="w-4 h-4 text-[#C2410C]" />
              <span className="font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">{t('destinationFolder', 'Simpan ke Folder:')}</span>
            </div>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="bg-transparent font-medium text-[#C2410C] text-right outline-none cursor-pointer text-[13px] max-w-[210px] truncate"
            >
              <option value="" className="bg-white dark:bg-[#0A0A0E] text-[#0A0A0A] dark:text-[#FAFAFA]">
                {t('rootFolderOption', 'Direktori Utama (Tanpa Folder)')}
              </option>
              {folderList.map((f) => (
                <option key={f.id} value={f.id} className="bg-white dark:bg-[#0A0A0E] text-[#0A0A0A] dark:text-[#FAFAFA]">
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Drag & Drop Area */}
        {!uploading && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#E8E8EC] dark:border-[#1F1F27] hover:border-[#C2410C] bg-[#FAFAFA] dark:bg-[#121217] rounded-[12px] p-7 text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 stroke-[2.2]" />
            </div>
            <p className="text-[15px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
              {t('dragDrop', 'Tarik & Lepas File ke Sini')}
            </p>
            <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
              {t('orChoose', 'atau pilih file dari perangkat')}
            </p>
            <p className="text-[11px] text-[#9C9C9C] mt-3">
              {t('uploadSupport', 'Mendukung Foto (JPG, PNG, HEIC), Video (MP4, MKV), Dokumen (PDF, DOCX, TXT, XLS, ZIP)')}
            </p>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && !uploading && (
          <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-1 border-t border-[#E8E8EC] dark:border-[#1F1F27] pt-3">
            <div className="flex items-center justify-between text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mb-1">
              <span>{selectedFiles.length} {t('filesSelected', 'file dipilih')}</span>
              <span className="font-mono font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">
                {t('totalLabel', 'Total')}: {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
              </span>
            </div>
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-[#FAFAFA] dark:bg-[#121217] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[8px] text-[13px]"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <File className="w-4 h-4 text-[#C2410C] shrink-0" />
                  <span className="truncate text-[#0A0A0A] dark:text-[#FAFAFA]">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    className="p-1 text-[#9C9C9C] hover:text-[#EF4444] transition-colors"
                    title={t('removeFileTitle', 'Hapus file ini')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Real-time Dynamic Upload Progress */}
        {uploading && (
          <div className="mt-4 p-4 bg-[#FAFAFA] dark:bg-[#121217] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[10px] space-y-3 animate-enter">
            {/* File name & percent */}
            <div className="flex items-center justify-between text-[13px] font-medium">
              <span className="truncate pr-2 text-[#0A0A0A] dark:text-[#FAFAFA]">
                {selectedFiles.length > 1 ? `[${currentIndex + 1}/${selectedFiles.length}] ` : ''}
                {progressInfo?.fileName || selectedFiles[currentIndex]?.name}
              </span>
              <span className="font-mono font-bold text-[#C2410C] shrink-0 text-[14px]">
                {progressInfo?.isProcessing ? (
                  <span className="text-amber-500 font-sans font-medium text-[12px] flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin inline-block text-amber-500" />
                    {t('processing', 'Memproses...')}
                  </span>
                ) : (
                  `${progressInfo ? progressInfo.percent : 0}%`
                )}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#E8E8EC] dark:border dark:border-[#2A2A35] dark:bg-[#1C1C24] h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  progressInfo?.isProcessing
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-[#C2410C]'
                }`}
                style={{ width: `${Math.max(1, progressInfo ? progressInfo.percent : 1)}%` }}
              />
            </div>

            {/* Metrics: Bytes transferred, speed, ETA */}
            <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono">
              <span>
                {formatBytes(progressInfo?.loaded || 0)} / {formatBytes(progressInfo?.total || selectedFiles[currentIndex]?.size || 0)}
              </span>
              <span>
                {progressInfo?.isProcessing ? (
                  <span className="text-amber-500">{t('extractingMetadata', 'Mengekstrak metadata & thumbnail...')}</span>
                ) : (
                  <>
                    {progressInfo?.speed > 0 && <span>{formatBytes(progressInfo.speed)}/s</span>}
                    {progressInfo?.remainingSec !== null && progressInfo?.remainingSec > 0 && (
                      <span> • ~{progressInfo.remainingSec}s {t('remainingLabel', 'tersisa')}</span>
                    )}
                  </>
                )}
              </span>
            </div>

            {/* Overall progress for multi-file upload */}
            {selectedFiles.length > 1 && progressInfo && (
              <div className="pt-2.5 border-t border-[#E8E8EC] dark:border-[#1F1F27] flex items-center justify-between text-[11px] text-[#9C9C9C]">
                <span>{t('totalAll', 'Total Semua')} ({selectedFiles.length} {t('fileCount', 'file')}):</span>
                <span className="font-mono font-medium text-[#0A0A0A] dark:text-[#FAFAFA]">
                  {formatBytes(progressInfo.totalCompletedBytes)} / {formatBytes(progressInfo.totalAllBytes)} ({Math.round((progressInfo.totalCompletedBytes / progressInfo.totalAllBytes) * 100)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
          {uploading ? (
            <button
              type="button"
              onClick={handleCancelUpload}
              className="btn-destructive text-[14px] px-4 py-2 flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>{t('cancelUpload', 'Batalkan Upload')}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost text-[14px]"
              >
                {t('cancel', 'Batal')}
              </button>
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={selectedFiles.length === 0 || isOverQuota}
                className="btn-primary text-[14px]"
              >
                {t('startUpload', 'Mulai Upload')} ({selectedFiles.length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
