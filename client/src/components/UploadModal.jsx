import React, { useState, useRef } from 'react';
import { X, UploadCloud, File, AlertCircle, CheckCircle, ArrowUpCircle } from 'lucide-react';
import { api } from '../api';
import { formatBytes } from './QuotaBar';

export default function UploadModal({ isOpen, onClose, user, onUploadSuccess, onRequestQuota }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOverQuota, setIsOverQuota] = useState(false);
  const fileInputRef = useRef(null);

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
      setErrorMsg(`Ukuran total file (${formatBytes(totalNewBytes)}) melebihi sisa kuota Anda (${formatBytes(availableBytes)}).`);
      setIsOverQuota(true);
    }

    setSelectedFiles(files);
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setErrorMsg('');

    for (let i = 0; i < selectedFiles.length; i++) {
      setCurrentIndex(i);
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        await api.uploadMedia(formData);
      } catch (err) {
        if (err.status === 413) {
          setErrorMsg(err.message || 'Penyimpanan penuh (413 Payload Too Large).');
          setIsOverQuota(true);
        } else {
          setErrorMsg(`Gagal mengunggah "${file.name}": ${err.message}`);
        }
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    if (onUploadSuccess) onUploadSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] max-w-lg w-full p-6 shadow-modal animate-in fade-in zoom-in-95 duration-150 text-[#0A0A0A] dark:text-[#FAFAFA]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E8EC] dark:border-[#1F1F27]">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#C2410C]" />
            <h3 className="text-xl font-serif font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
              Upload Media (Foto / Video)
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#200A0A] border border-[#EF4444]/40 rounded-[6px] text-[#EF4444] dark:text-[#FCA5A5] text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {isOverQuota && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onRequestQuota) onRequestQuota();
                  }}
                  className="mt-2 text-[12px] font-semibold text-[#C2410C] underline hover:text-[#EA580C] flex items-center gap-1"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" /> Ajukan Penambahan Kuota Sekarang
                </button>
              )}
            </div>
          </div>
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#E8E8EC] dark:border-[#1F1F27] hover:border-[#C2410C] bg-[#FAFAFA] dark:bg-[#0A0A0E] rounded-[12px] p-8 text-center cursor-pointer transition-colors"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
            className="hidden"
          />
          <UploadCloud className="w-12 h-12 text-[#C2410C] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
            Tarik & Lepas File ke Sini
          </p>
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
            atau <span className="text-[#C2410C] font-semibold underline">pilih file dari perangkat</span>
          </p>
          <p className="text-[11px] text-[#9C9C9C] mt-3">
            Mendukung Foto (JPG, PNG, HEIC), Video (MP4, MKV), Dokumen (PDF, DOCX, TXT, XLS, ZIP)
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-1 border-t border-[#E8E8EC] dark:border-[#1F1F27] pt-3">
            <div className="flex items-center justify-between text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mb-1">
              <span>{selectedFiles.length} file dipilih</span>
              <span className="font-mono">
                Total: {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
              </span>
            </div>
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] text-[13px]"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <File className="w-4 h-4 text-[#6B6B6B] dark:text-[#9C9C9C] shrink-0" />
                  <span className="truncate text-[#0A0A0A] dark:text-[#FAFAFA]">{file.name}</span>
                </div>
                <span className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] font-mono shrink-0">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] mb-1">
              <span>Mengunggah file {currentIndex + 1} dari {selectedFiles.length}...</span>
              <span className="font-mono">{Math.round(((currentIndex) / selectedFiles.length) * 100)}%</span>
            </div>
            <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#C2410C] h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / selectedFiles.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="btn-ghost text-[14px]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUploadAll}
            disabled={uploading || selectedFiles.length === 0 || isOverQuota}
            className="btn-primary text-[14px]"
          >
            {uploading ? 'Mengupload...' : `Mulai Upload (${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

