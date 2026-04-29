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

interface A11yContextValue {
  highContrast: boolean;
  largeText: boolean;
  setHighContrast: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
}

const A11yContext = createContext<A11yContextValue | null>(null);

function applyClasses(highContrast: boolean, largeText: boolean) {
  const root = document.documentElement;
  root.classList.toggle('hc', highContrast);
  root.classList.toggle('lg-text', largeText);
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHC] = useState<boolean>(() => {
    try { return getSettings().accessibility?.highContrast === true; } catch { return false; }
  });
  const [largeText, setLT] = useState<boolean>(() => {
    try { return getSettings().accessibility?.largeText === true; } catch { return false; }
  });

  // Apply on mount and on every change.
  useEffect(() => { applyClasses(highContrast, largeText); }, [highContrast, largeText]);

  const persist = useCallback((next: { highContrast?: boolean; largeText?: boolean }) => {
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

  return (
    <A11yContext.Provider value={{ highContrast, largeText, setHighContrast, setLargeText }}>
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
      setHighContrast: () => {},
      setLargeText: () => {},
    };
  }
  return ctx;
}