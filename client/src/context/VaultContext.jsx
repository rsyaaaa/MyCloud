import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const [vaultToken, setVaultToken] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(180);
  const [activeTab, setActiveTab] = useState('gallery'); // tracks current tab across app

  const countdownIntervalRef = useRef(null);

  const lockVault = () => {
    setVaultToken(null);
    setIsUnlocked(false);
    setRemainingSeconds(180);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const unlockVault = async (pin) => {
    const data = await api.verifyPin(pin);
    setVaultToken(data.vaultToken);
    setIsUnlocked(true);
    setRemainingSeconds(180);

    // If already in vault tab, do not start countdown yet!
    if (activeTab === 'vault') {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    } else {
      startCountdown();
    }
    return data;
  };

  const startCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setRemainingSeconds(180);

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          lockVault();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopAndResetCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRemainingSeconds(180);
  };

  // Called whenever user changes navigation tab
  const notifyTabChange = (newTab) => {
    setActiveTab(newTab);
    if (!isUnlocked) return;

    if (newTab === 'vault') {
      // User is inside Brankas: reset and do NOT count down!
      stopAndResetCountdown();
    } else {
      // User left Brankas: start 180s countdown!
      startCountdown();
    }
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <VaultContext.Provider
      value={{
        vaultToken,
        isUnlocked,
        remainingSeconds,
        activeTab,
        unlockVault,
        lockVault,
        notifyTabChange
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
