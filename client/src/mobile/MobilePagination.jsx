import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MobilePagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 12,
  onPageChange
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 mb-8 pt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27] flex flex-col items-center gap-3">
      <div className="text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C]">
        Halaman <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] font-mono">{currentPage}</strong> dari{' '}
        <strong className="text-[#0A0A0A] dark:text-[#FAFAFA] font-mono">{totalPages}</strong>{' '}
        <span className="text-[#9C9C9C]">({totalItems} berkas)</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn-secondary h-[34px] px-3 text-[13px] disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Sebelumnya</span>
        </button>

        {/* Page pills for quick tapping */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[140px] py-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="text-[#9C9C9C] text-[11px] px-0.5">…</span>
                )}
                <button
                  onClick={() => {
                    onPageChange(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-8 h-8 rounded-[8px] text-[12px] font-mono font-semibold transition-transform duration-200 active:scale-90 flex items-center justify-center ${
                    p === currentPage
                      ? 'bg-[#C2410C] text-white border border-[#C2410C] shadow-md scale-105'
                      : 'bg-white dark:bg-[#0A0A0E] text-[#6B6B6B] dark:text-[#9C9C9C] border border-[#E8E8EC] dark:border-[#1F1F27] hover:bg-[#FFF7ED] dark:hover:bg-[#2A1208]'
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="btn-secondary h-[34px] px-3 text-[13px] disabled:opacity-40"
        >
          <span>Selanjutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

