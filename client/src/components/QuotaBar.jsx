import React from 'react';
import { HardDrive, ArrowUpCircle } from 'lucide-react';

export function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function QuotaBar({ usedBytes = 0, quotaBytes = 1, onRequestIncrease, compact = false }) {
  const percentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) || 0;

  let progressColor = 'bg-[#C2410C]'; // primary terracotta
  if (percentage >= 90) {
    progressColor = 'bg-[#DC2626]'; // error
  } else if (percentage >= 75) {
    progressColor = 'bg-[#F59E0B]'; // warning
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-[13px]">
        <div className="w-24 bg-[#E7E5E4] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[#57534E] font-medium font-mono">
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#FFFBF5] border border-[#D6D3D1] rounded-[8px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-[#1C1917] font-semibold text-[14px]">
          <HardDrive className="w-4 h-4 text-[#C2410C]" />
          <span>Kapasitas Penyimpanan</span>
        </div>
        <span className="text-[12px] font-bold text-[#C2410C] bg-[#FDF6EC] px-2 py-0.5 rounded-[4px] border border-[#D4A373]">
          {percentage}%
        </span>
      </div>

      <div className="w-full bg-[#E7E5E4] h-2.5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${progressColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[12px] text-[#57534E] mb-3">
        <span>Terpakai: <strong className="text-[#1C1917] font-mono">{formatBytes(usedBytes)}</strong></span>
        <span>Batas: <strong className="text-[#1C1917] font-mono">{formatBytes(quotaBytes)}</strong></span>
      </div>

      {onRequestIncrease && (
        <button
          onClick={onRequestIncrease}
          className="w-full btn-secondary text-[13px] py-1.5 h-[34px] justify-center"
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>Request Storage Increase</span>
        </button>
      )}
    </div>
  );
}

