import React, { useCallback, useEffect, useState } from 'react';
import { getSettings, saveSettings } from './storage';
import {
  A11yContext,
  useA11y as useA11yInternal,
  type SidebarFocusBehavior,
  type KeyboardNavMode,
  type A11yContextValue,
} from './a11y-internals';

// Re-exports for backwards compatibility with existing call sites.
export const useA11y = useA11yInternal;
export type { SidebarFocusBehavior, KeyboardNavMode, A11yContextValue };

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

function applyClasses(
  highContrast: boolean,
  largeText: boolean,
  premiumContrast: boolean,
  reduceMotion: boolean,
  strongFocus: boolean,
) {
  const root = document.documentElement;
  root.classList.toggle('hc', highContrast);
  root.classList.toggle('lg-text', largeText);
  root.classList.toggle('pc', premiumContrast);
  // `reduce-motion` and `strong-focus` are theme-agnostic: they only act on
  // semantic tokens (`--ring`, `--primary`) and global `transition` / `animation`
  // properties, so the same rules apply to every theme variant.
  root.classList.toggle('reduce-motion', reduceMotion);
  root.classList.toggle('strong-focus', strongFocus);
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
  const [keyboardNavMode, setKNM] = useState<KeyboardNavMode>(() => {
    try {
      const v = getSettings().accessibility?.keyboardNavMode;
      return v === 'cyclic' ? 'cyclic' : 'normal';
    } catch { return 'normal'; }
  });
  const [reduceMotion, setRM] = useState<boolean>(() => {
    try { return getSettings().accessibility?.reduceMotion === true; } catch { return false; }
  });
  const [strongFocus, setSF] = useState<boolean>(() => {
    try { return getSettings().accessibility?.strongFocus === true; } catch { return false; }
  });

  // Apply on mount and on every change.
  useEffect(() => {
    applyClasses(highContrast, largeText, premiumContrast, reduceMotion, strongFocus);
  }, [highContrast, largeText, premiumContrast, reduceMotion, strongFocus]);

  // Install a global Tab-cycling handler when `keyboardNavMode === 'cyclic'`.
  // Wraps focus from the last focusable element back to the first (and
  // Shift+Tab from first → last) so keyboard users never lose focus into
  // the browser chrome. Listens in capture phase to run before component
  // handlers, but defers to any `Escape` / focus-trap (e.g. More panel) by
  // checking that the active element belongs to the document body — local
  // traps call `e.preventDefault()` themselves and we won't override them.
  useEffect(() => {
    if (keyboardNavMode !== 'cyclic') return;
    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.defaultPrevented) return;
      // Skip if a local focus trap is active (the More panel sets aria-modal).
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const focusables = Array.from(
        document.body.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [keyboardNavMode]);

  const persist = useCallback((next: {
    highContrast?: boolean;
    largeText?: boolean;
    premiumContrast?: boolean;
    sidebarFocusBehavior?: SidebarFocusBehavior;
    keyboardNavMode?: KeyboardNavMode;
    reduceMotion?: boolean;
    strongFocus?: boolean;
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
  const setKeyboardNavMode = useCallback((v: KeyboardNavMode) => {
    setKNM(v);
    persist({ keyboardNavMode: v });
  }, [persist]);
  const setReduceMotion = useCallback((v: boolean) => {
    setRM(v);
    persist({ reduceMotion: v });
  }, [persist]);
  const setStrongFocus = useCallback((v: boolean) => {
    setSF(v);
    persist({ strongFocus: v });
  }, [persist]);

  return (
    <A11yContext.Provider
      value={{
        highContrast,
        largeText,
        premiumContrast,
        sidebarFocusBehavior,
        keyboardNavMode,
        reduceMotion,
        strongFocus,
        setHighContrast,
        setLargeText,
        setPremiumContrast,
        setSidebarFocusBehavior,
        setKeyboardNavMode,
        setReduceMotion,
        setStrongFocus,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}
