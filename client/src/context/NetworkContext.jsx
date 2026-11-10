import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NetworkContext = createContext(null);

export const NETWORK_MODES = {
  LOCAL_LAN_DIRECT: 'LOCAL_LAN_DIRECT',
  REMOTE_TAILSCALE: 'REMOTE_TAILSCALE',
  CHECKING: 'CHECKING'
};

// RTT Threshold: Under 20ms is direct local Wi-Fi / gigabit LAN
const LOCAL_RTT_THRESHOLD_MS = 20;

export function NetworkProvider({ children }) {
  const [networkMode, setNetworkMode] = useState(NETWORK_MODES.CHECKING);
  const [rtt, setRtt] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const checkCountRef = useRef(0);

  const measureNetwork = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setIsChecking(true);
    const start = performance.now();

    try {
      const response = await fetch(`/api/network/ping?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const duration = Math.round(performance.now() - start);
      setRtt(duration);
      setIsOnline(true);
      setLastChecked(Date.now());
      checkCountRef.current += 1;

      // Determine network mode based on RTT latency & hostname
      const host = window.location.hostname;
      const isLocalIp = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.');

      if (duration < LOCAL_RTT_THRESHOLD_MS || (isLocalIp && duration < 35)) {
        setNetworkMode(NETWORK_MODES.LOCAL_LAN_DIRECT);
      } else {
        setNetworkMode(NETWORK_MODES.REMOTE_TAILSCALE);
      }
    } catch (err) {
      console.warn('[Network Diagnostic] Ping failed:', err);
      // If ping failed completely, check if offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
      }
      setNetworkMode(NETWORK_MODES.REMOTE_TAILSCALE);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial measurement & periodic background check (every 30s)
  useEffect(() => {
    measureNetwork();

    const interval = setInterval(() => {
      // Only poll when page is active/visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        measureNetwork();
      }
    }, 30000);

    const handleOnline = () => {
      setIsOnline(true);
      measureNetwork();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        measureNetwork();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [measureNetwork]);

  const isLocal = networkMode === NETWORK_MODES.LOCAL_LAN_DIRECT;
  const isRemote = networkMode === NETWORK_MODES.REMOTE_TAILSCALE;
  const videoPreload = isLocal ? 'auto' : 'metadata';

  return (
    <NetworkContext.Provider
      value={{
        networkMode,
        rtt,
        isChecking,
        lastChecked,
        isOnline,
        isLocal,
        isRemote,
        videoPreload,
        refreshNetwork: measureNetwork
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

// PRD alias for custom hook
export const useNetworkEnvironment = useNetwork;

