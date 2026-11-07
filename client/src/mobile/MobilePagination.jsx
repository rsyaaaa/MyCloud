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
    <div className="mt-6 mb-8 pt-4 border-t border-[#E7E5E4] flex flex-col items-center gap-3">
      <div className="text-[12px] text-[#57534E]">
        Halaman <strong className="text-[#1C1917] font-mono">{currentPage}</strong> dari{' '}
        <strong className="text-[#1C1917] font-mono">{totalPages}</strong>{' '}
        <span className="text-[#A8A29E]">({totalItems} berkas)</span>
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
                  <span className="text-[#A8A29E] text-[11px] px-0.5">…</span>
                )}
                <button
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-[4px] text-[12px] font-mono font-semibold transition-colors flex items-center justify-center ${
                    p === currentPage
                      ? 'bg-[#C2410C] text-white border border-[#C2410C]'
                      : 'bg-white text-[#57534E] border border-[#D6D3D1] hover:bg-[#FDF6EC]'
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

