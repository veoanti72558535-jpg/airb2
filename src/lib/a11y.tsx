import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSettings, saveSettings } from './storage';

/**
 * A11y preferences (high-contrast + large text), persisted via the standard
 * settings store. We expose a tiny context so any panel — not just Settings
 * — can toggle the modes without prop-drilling.
 *
 * Implementation: applies/removes `hc` and `lg-text` classes on the
 * <html> element. CSS overrides in src/index.css do the visual work for
 * every theme. This intentionally lives outside ThemeProvider so a user
 * can keep their preferred theme AND add a contrast boost.
 */

/**
 * Where focus lands after the desktop sidebar expands. Persisted alongside
 * the rest of the a11y preferences. See `accessibility.sidebarFocusBehavior`
 * in `src/lib/types.ts` for the rationale of each value.
 */
export type SidebarFocusBehavior = 'first' | 'active';

interface A11yContextValue {
  highContrast: boolean;
  largeText: boolean;
  premiumContrast: boolean;
  sidebarFocusBehavior: SidebarFocusBehavior;
  setHighContrast: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
  setPremiumContrast: (v: boolean) => void;
  setSidebarFocusBehavior: (v: SidebarFocusBehavior) => void;
}

const A11yContext = createContext<A11yContextValue | null>(null);

function applyClasses(highContrast: boolean, largeText: boolean, premiumContrast: boolean) {
  const root = document.documentElement;
  root.classList.toggle('hc', highContrast);
  root.classList.toggle('lg-text', largeText);
  root.classList.toggle('pc', premiumContrast);
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHC] = useState<boolean>(() => {
    try { return getSettings().accessibility?.highContrast === true; } catch { return false; }
  });
  const [largeText, setLT] = useState<boolean>(() => {
    try { return getSettings().accessibility?.largeText === true; } catch { return false; }
  });
  const [premiumContrast, setPC] = useState<boolean>(() => {
    try { return getSettings().accessibility?.premiumContrast === true; } catch { return false; }
  });
  const [sidebarFocusBehavior, setSFB] = useState<SidebarFocusBehavior>(() => {
    try {
      const v = getSettings().accessibility?.sidebarFocusBehavior;
      return v === 'active' ? 'active' : 'first';
    } catch { return 'first'; }
  });

  // Apply on mount and on every change.
  useEffect(() => {
    applyClasses(highContrast, largeText, premiumContrast);
  }, [highContrast, largeText, premiumContrast]);

  const persist = useCallback((next: {
    highContrast?: boolean;
    largeText?: boolean;
    premiumContrast?: boolean;
    sidebarFocusBehavior?: SidebarFocusBehavior;
  }) => {
    try {
      const s = getSettings();
      saveSettings({
        ...s,
        accessibility: { ...(s.accessibility ?? {}), ...next },
      });
    } catch { /* storage may be unavailable in tests */ }
  }, []);

  const setHighContrast = useCallback((v: boolean) => {
    setHC(v);
    persist({ highContrast: v });
  }, [persist]);
  const setLargeText = useCallback((v: boolean) => {
    setLT(v);
    persist({ largeText: v });
  }, [persist]);
  const setPremiumContrast = useCallback((v: boolean) => {
    setPC(v);
    persist({ premiumContrast: v });
  }, [persist]);
  const setSidebarFocusBehavior = useCallback((v: SidebarFocusBehavior) => {
    setSFB(v);
    persist({ sidebarFocusBehavior: v });
  }, [persist]);

  return (
    <A11yContext.Provider
      value={{
        highContrast,
        largeText,
        premiumContrast,
        sidebarFocusBehavior,
        setHighContrast,
        setLargeText,
        setPremiumContrast,
        setSidebarFocusBehavior,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) {
    // Safe fallback — lets unit-tested components mount without the provider.
    return {
      highContrast: false,
      largeText: false,
      premiumContrast: false,
      sidebarFocusBehavior: 'first',
      setHighContrast: () => {},
      setLargeText: () => {},
      setPremiumContrast: () => {},
      setSidebarFocusBehavior: () => {},
    };
  }
  return ctx;
}