import React from 'react';
import { ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { useTransfer } from '../context/TransferContext';

export default function MobileFloatingTransferButton({
  show = true,
  onClickUpload,
  onClickTransferList
}) {
  const {
    isUploading,
    isDownloading,
    hasFailure,
    overallProgress
  } = useTransfer();

  const isTransferring = isUploading || isDownloading;
  const isSpecialState = isTransferring || hasFailure;

  const handleClick = () => {
    if (onClickUpload) {
      onClickUpload();
    }
  };

  // SVG circular progress calculation
  const radius = 26;
  const circumference = 2 * Math.PI * radius; // ~163.36
  const displayProgress = Math.max(5, Math.min(100, overallProgress || 0));
  const strokeOffset = circumference - (circumference * displayProgress) / 100;

  let ringColor = '#C2410C'; // Default orange for upload
  let bgGradient = 'bg-gradient-to-tr from-[#C2410C] to-[#EA580C]';
  let shadowGlow = 'shadow-[0_8px_25px_rgba(194,65,12,0.45)]';

  if (hasFailure) {
    ringColor = '#EF4444'; // Red for failure
    bgGradient = 'bg-gradient-to-tr from-[#DC2626] to-[#EF4444]';
    shadowGlow = 'shadow-[0_8px_25px_rgba(239,68,68,0.5)]';
  } else if (isDownloading) {
    ringColor = '#10B981'; // Green for download
    bgGradient = 'bg-gradient-to-tr from-[#059669] to-[#34D399]';
    shadowGlow = 'shadow-[0_8px_25px_rgba(16,185,129,0.5)]';
  } else if (isUploading) {
    ringColor = '#EA580C'; // Terracotta orange for upload
    bgGradient = 'bg-gradient-to-tr from-[#C2410C] to-[#EA580C]';
    shadowGlow = 'shadow-[0_8px_25px_rgba(194,65,12,0.5)]';
  }

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-[84px] right-4 z-40 w-14 h-14 rounded-full text-white ${bgGradient} ${shadowGlow} flex items-center justify-center active:scale-90 transition-all duration-300 ease-out select-none ${
        show || isSpecialState
          ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
          : 'translate-y-16 opacity-0 scale-75 pointer-events-none'
      }`}
      title={
        hasFailure
          ? 'Upload Media (Transfer sebelumnya gagal)'
          : isUploading
          ? `Mengunggah (${displayProgress}%) - Ketuk untuk tambah antrean upload`
          : isDownloading
          ? `Mengunduh (${displayProgress}%) - Ketuk untuk upload media`
          : 'Upload Media'
      }
    >
      {/* SVG Circular Progress Ring (Visible when transferring or failed) */}
      {isSpecialState && (
        <svg
          viewBox="0 0 58 58"
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
        >
          {/* Background track */}
          <circle
            cx="29"
            cy="29"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="3.5"
          />
          {/* Progress circle */}
          <circle
            cx="29"
            cy="29"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>
      )}

      {/* Button Center Icon */}
      {hasFailure ? (
        <AlertCircle className="w-6 h-6 stroke-[2.4] text-white animate-bounce" />
      ) : isDownloading ? (
        <ArrowDown className="w-6 h-6 stroke-[2.5] text-white animate-pulse" />
      ) : (
        <ArrowUp className="w-6 h-6 stroke-[2.5] text-white" />
      )}
    </button>
  );
}

