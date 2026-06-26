'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface VaultContextType {
  masterKey: CryptoKey | null;
  setSessionKey: (key: CryptoKey) => void;
  clearSessionKey: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // 1. AUTO-LOCK TIMER SYSTEM (5 Minutes Inactivity Limit)
  const RESET_TIMEOUT_MS = 5 * 60 * 1000; 

  const clearSessionKey = () => {
    setMasterKey(null); // Explicitly wipes the CryptoKey reference from state RAM
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    router.push('/'); // Bounce back to secure login screen
  };

  const setSessionKey = (key: CryptoKey) => {
    setMasterKey(key);
    resetLockTimer();
  };

  const resetLockTimer = () => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      console.log('Security Core: Auto-lock triggered due to inactivity.');
      clearSessionKey();
    }, RESET_TIMEOUT_MS);
  };

  // 2. TAB BLUR AUTO-LOCK & ACTIVITY DETECTORS
  useEffect(() => {
    const handleActivity = () => {
      if (masterKey) resetLockTimer();
    };

    const handleVisibilityChange = () => {
      // Phase 7 Option: If user changes browser tabs, immediately wipe and lock
      if (document.visibilityState === 'hidden') {
        console.log('Security Core: Tab focus lost. Scrubbing active runtime keys.');
        clearSessionKey();
      }
    };

    // Listen for mouse moves, keypresses, or clicks to refresh the timer
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [masterKey]);

  return (
    <VaultContext.Provider value={{ masterKey, setSessionKey, clearSessionKey }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be executed within a secure VaultProvider mesh');
  return context;
}