import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-[#D6D3D1]';
        let bgClass = 'bg-white';
        let icon = <Info className="w-5 h-5 text-[#3B82F6] shrink-0" />;

        if (toast.type === 'success') {
          borderClass = 'border-[#22C55E]';
          bgClass = 'bg-[#F0FDF4]';
          icon = <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-[#DC2626]';
          bgClass = 'bg-[#FEF2F2]';
          icon = <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border-2 ${borderClass} ${bgClass} p-4 rounded-[6px] shadow-modal flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            {icon}
            <div className="flex-1 text-[14px] leading-relaxed text-[#1C1917]">
              {toast.message}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#57534E] hover:text-[#1C1917] p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

