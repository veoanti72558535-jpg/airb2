/**
 * Non-component bits of the a11y module.
 *
 * Why split? `react-refresh` only preserves state when a module exports
 * components ONLY. Mixing the `A11yProvider` component with its context
 * + `useA11y` hook + types broke Fast Refresh and surfaced as the
 *   "Cannot read properties of null (reading 'useState')"
 * crash inside `A11yProvider`. Keeping the hook/context here makes
 * `a11y.tsx` purely components-only.
 */
import { createContext, useContext } from 'react';

export type SidebarFocusBehavior = 'first' | 'active';
export type KeyboardNavMode = 'normal' | 'cyclic';

export interface A11yContextValue {
  highContrast: boolean;
  largeText: boolean;
  premiumContrast: boolean;
  sidebarFocusBehavior: SidebarFocusBehavior;
  keyboardNavMode: KeyboardNavMode;
  reduceMotion: boolean;
  strongFocus: boolean;
  setHighContrast: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
  setPremiumContrast: (v: boolean) => void;
  setSidebarFocusBehavior: (v: SidebarFocusBehavior) => void;
  setKeyboardNavMode: (v: KeyboardNavMode) => void;
  setReduceMotion: (v: boolean) => void;
  setStrongFocus: (v: boolean) => void;
}

export const A11yContext = createContext<A11yContextValue | null>(null);

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) {
    // Safe fallback — lets unit-tested components mount without the provider.
    return {
      highContrast: false,
      largeText: false,
      premiumContrast: false,
      sidebarFocusBehavior: 'first',
      keyboardNavMode: 'normal',
      reduceMotion: false,
      strongFocus: false,
      setHighContrast: () => {},
      setLargeText: () => {},
      setPremiumContrast: () => {},
      setSidebarFocusBehavior: () => {},
      setKeyboardNavMode: () => {},
      setReduceMotion: () => {},
      setStrongFocus: () => {},
    };
  }
  return ctx;
}
