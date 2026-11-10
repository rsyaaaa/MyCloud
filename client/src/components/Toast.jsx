import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-[#E8E8EC] dark:border-[#1F1F27]';
        let bgClass = 'bg-white dark:bg-[#0A0A0E]';
        let icon = <Info className="w-5 h-5 text-[#C2410C] shrink-0" />;

        if (toast.type === 'success') {
          borderClass = 'border-[#10B981]/40 dark:border-[#10B981]/30';
          bgClass = 'bg-[#ECFDF5] dark:bg-[#062817]';
          icon = <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-[#EF4444]/40 dark:border-[#EF4444]/30';
          bgClass = 'bg-[#FEF2F2] dark:bg-[#200A0A]';
          icon = <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border ${borderClass} ${bgClass} p-3.5 rounded-[16px] shadow-2xl flex items-start gap-3 transition-all animate-modal-pop`}
          >
            {icon}
            <div className="flex-1 text-[13px] font-medium leading-relaxed text-[#0A0A0A] dark:text-[#FAFAFA]">
              {toast.message}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-[#FAFAFA] p-1 rounded-full active:scale-90 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

