import React from 'react';
import { HardDrive } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function QuotaBar({ usedBytes = 0, quotaBytes = 1, compact = false, title = null }) {
  const { t } = useLanguage();
  const percentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) || 0;

  let progressColor = 'bg-[#C2410C]'; // primary orange
  if (percentage >= 90) {
    progressColor = 'bg-[#EF4444]'; // error
  } else if (percentage >= 75) {
    progressColor = 'bg-[#F59E0B]'; // warning
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-[13px]">
        <div className="w-24 bg-[#E8E8EC] dark:bg-[#1F1F27] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[#6B6B6B] dark:text-[#9C9C9C] font-medium font-mono">
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#FAFAFA] dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[#0A0A0A] dark:text-[#FAFAFA] font-semibold text-[14px]">
          <HardDrive className="w-4 h-4 text-[#C2410C]" />
          <span>{title || t('storageCapacity', 'Kapasitas Penyimpanan')}</span>
        </div>
        <span className="text-[12px] font-bold text-[#C2410C] bg-[#FFF7ED] dark:bg-[#2A1208] px-2 py-0.5 rounded-[4px] border border-[#C2410C]/20">
          {percentage}%
        </span>
      </div>

      <div className="w-full bg-[#E8E8EC] dark:bg-[#1F1F27] h-2.5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${progressColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
        <span>{t('used', 'Terpakai')}: <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] font-mono">{formatBytes(usedBytes)}</strong></span>
        <span>{t('limit', 'Batas')}: <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] font-mono">{formatBytes(quotaBytes)}</strong></span>
      </div>
    </div>
  );
}

