/**
 * Non-component bits of the theme module.
 *
 * Why split? `react-refresh` only preserves component state when a module
 * exports components ONLY. Mixing the `ThemeProvider` component with the
 * `useTheme` hook + the `ThemeContext` instance previously broke Fast
 * Refresh and surfaced as the recurring
 *   "Cannot read properties of null (reading 'useState')"
 * crash. Keeping the hook/context here makes `theme.tsx` purely
 * components-only.
 */
import { createContext, useContext } from 'react';
import type { ThemeId, ThemeCustomisation } from './theme-constants';

export interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  /** Legacy compat — toggles between carbon-green and slate-light */
  toggleTheme: () => void;
  isDark: boolean;
  /** Current customisation overrides (empty object when defaults apply). */
  custom: ThemeCustomisation;
  /** Patch the customisation overrides; pass `null` for a key to clear it. */
  updateCustom: (patch: ThemeCustomisation) => void;
  /** Reset every override back to the base theme. */
  resetCustom: () => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}