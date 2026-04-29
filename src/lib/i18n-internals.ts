/**
 * Non-component bits of the i18n module.
 *
 * Why split? `react-refresh` only preserves provider state when a module
 * exports components ONLY. We learned this the hard way with the theme
 * + a11y providers — keeping the hook/context here makes `i18n.tsx`
 * purely components-only and avoids the
 *   "Cannot read properties of null (reading 'useState')"
 * crash on hot reloads.
 */
import { createContext, useContext } from 'react';
import type { TranslationKey } from './translations';

export type Locale = 'fr' | 'en';

export interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /**
   * Bind the provider to a user identity so the chosen locale survives
   * sign-out and is restored on next sign-in. Pass `null` for the guest
   * bucket. Safe to call repeatedly with the same id (no-op).
   */
  setUserId: (userId: string | null) => void;
  userId: string | null;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export const LOCALE_STORAGE_KEY = 'pcp-locale';

export function isValidLocale(v: string | null | undefined): v is Locale {
  return v === 'fr' || v === 'en';
}
