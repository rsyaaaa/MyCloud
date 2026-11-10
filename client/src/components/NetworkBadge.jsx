import React, { useState, useRef, useEffect } from 'react';
import { Wifi, Globe, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { useNetwork, NETWORK_MODES } from '../context/NetworkContext';
import { useLanguage } from '../context/LanguageContext';

export default function NetworkBadge({ isMobile = false }) {
  const { networkMode, rtt, isChecking, isLocal, isRemote, refreshNetwork } = useNetwork();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const isCheckingState = networkMode === NETWORK_MODES.CHECKING || isChecking;

  // Formatting display
  let dotColor = 'bg-[#10B981]';
  let badgeBorder = 'border-[#10B981]/30 dark:border-[#10B981]/25';
  let badgeBg = 'bg-[#ECFDF5] dark:bg-[#062419]';
  let textColor = 'text-[#047857] dark:text-[#34D399]';
  let label = `${t('networkLocalShort', 'Lokal')}${rtt !== null ? ` • ${rtt}ms` : ''}`;
  let IconComponent = Wifi;

  if (isCheckingState && rtt === null) {
    dotColor = 'bg-[#F59E0B] animate-pulse';
    badgeBorder = 'border-[#F59E0B]/30';
    badgeBg = 'bg-[#FFFBEB] dark:bg-[#201505]';
    textColor = 'text-[#B45309] dark:text-[#FBBF24]';
    label = t('networkChecking', 'Mengecek...');
  } else if (isRemote) {
    dotColor = 'bg-[#3B82F6]';
    badgeBorder = 'border-[#3B82F6]/30 dark:border-[#3B82F6]/25';
    badgeBg = 'bg-[#EFF6FF] dark:bg-[#0B1B36]';
    textColor = 'text-[#1D4ED8] dark:text-[#60A5FA]';
    label = `${t('networkRemoteShort', 'Remote')}${rtt !== null ? ` • ${rtt}ms` : ''}`;
    IconComponent = Globe;
  }

  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[6px] border text-[11px] font-mono transition-all select-none hover:opacity-90 active:scale-95 ${badgeBg} ${badgeBorder} ${textColor}`}
        title={isLocal ? t('networkLocal', 'Lokal (Direct High-Speed)') : t('networkRemote', 'Remote (Tailscale Secure)')}
      >
        <span className="relative flex h-2 w-2">
          {isCheckingState ? (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          ) : (
            <span className={`inline-flex rounded-full h-2 w-2 ${dotColor}`} />
          )}
        </span>
        <IconComponent className="w-3 h-3 stroke-[2.2]" />
        <span className="font-semibold tracking-tight">{label}</span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className={`absolute z-50 mt-2 ${isMobile ? 'left-0 sm:right-0' : 'left-0'} w-72 rounded-[14px] bg-white dark:bg-[#121218] border border-[#E8E8EC] dark:border-[#262633] shadow-xl p-3.5 text-[12px] text-[#0A0A0A] dark:text-[#FAFAFA] animate-enter`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F2] dark:border-[#1E1E28]">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              <span className="font-bold text-[13px]">
                {isLocal ? t('networkLocal', 'Lokal (Direct High-Speed)') : t('networkRemote', 'Remote (Tailscale Secure)')}
              </span>
            </div>
            <button
              onClick={() => refreshNetwork()}
              disabled={isChecking}
              className="p-1 rounded-[6px] text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#C2410C] hover:bg-[#F4F4F6] dark:hover:bg-[#1A1A24] transition-all disabled:opacity-50"
              title={t('networkRetest', 'Tes Ulang Jaringan')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Details */}
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C]">{t('networkLatency', 'Latensi')} (RTT):</span>
              <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">
                {rtt !== null ? `${rtt} ms` : '-'}
              </strong>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#6B6B6B] dark:text-[#9C9C9C]">Host:</span>
              <span className="font-mono text-[10px] text-[#6B6B6B] dark:text-[#A1A1AA] truncate max-w-[170px]" title={currentHost}>
                {currentHost}
              </span>
            </div>

            <div className="p-2 bg-[#F9F9FB] dark:bg-[#181822] rounded-[8px] border border-[#EAEAEF] dark:border-[#222230] text-[11px] leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-[#C2410C] mb-1">
                {isLocal ? <Zap className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>{t('networkMediaStrategy', 'Strategi Media')}</span>
              </div>
              <p className="text-[#6B6B6B] dark:text-[#9C9C9C]">
                {isLocal
                  ? t('networkAggressiveBuffer', 'Buffer Video Agresif & Kecepatan Penuh')
                  : t('networkSaveDataBuffer', 'Hemat Kuota & Buffer Adaptif')}
              </p>
            </div>

            <p className="text-[10px] text-[#8C8C94] leading-normal pt-1">
              {isLocal
                ? t('networkLocalDesc', 'Terhubung langsung melalui jaringan Wi-Fi lokal berkecepatan tinggi tanpa hambatan.')
                : t('networkRemoteDesc', 'Terhubung melalui tunnel aman Tailscale dari luar jaringan rumah.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

