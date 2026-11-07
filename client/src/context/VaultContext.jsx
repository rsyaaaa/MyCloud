import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const [vaultToken, setVaultToken] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const lockVault = () => {
    setVaultToken(null);
    setIsUnlocked(false);
    setRemainingSeconds(0);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const unlockVault = async (pin) => {
    const data = await api.verifyPin(pin);
    setVaultToken(data.vaultToken);
    setIsUnlocked(true);
    setRemainingSeconds(data.expiresInSeconds || 180);
    resetAutoLockTimer();
    return data;
  };

  const resetAutoLockTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setRemainingSeconds(180); // 3 minutes

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3 minutes auto-lock
    idleTimerRef.current = setTimeout(() => {
      lockVault();
    }, 180 * 1000);
  };

  // Auto-lock when window loses focus (window blur) or tab hides
  useEffect(() => {
    const handleBlur = () => {
      if (isUnlocked) {
        lockVault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isUnlocked) {
        lockVault();
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isUnlocked]);

  return (
    <VaultContext.Provider
      value={{
        vaultToken,
        isUnlocked,
        remainingSeconds,
        unlockVault,
        lockVault,
        resetAutoLockTimer
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}

