import React, { useState, useCallback, useEffect, type ReactNode } from 'react';
import { translations, type TranslationKey } from './translations';
import {
  I18nContext,
  useI18n as useI18nInternal,
  isValidLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
  type I18nContextType,
} from './i18n-internals';
import {
  readUserPref,
  writeUserPref,
  migrateGuestPrefToUser,
} from './user-prefs';
import { useAuth } from './auth-context';

// Re-exports so existing call sites keep working.
export const useI18n = useI18nInternal;
export type { I18nContextType, Locale };

function readStoredLocale(userId: string | null): Locale {
  const v = readUserPref(LOCALE_STORAGE_KEY, userId);
  return isValidLocale(v) ? v : 'fr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // userId lives in state so the provider re-renders (and re-reads the
  // persisted locale) whenever the active user changes.
  const [userId, setUserIdState] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale(null));

  // Persist on every change. We always mirror back to the guest bucket
  // via `writeUserPref` so first-paint after reload (before auth has
  // resolved) picks the latest choice.
  useEffect(() => {
    writeUserPref(LOCALE_STORAGE_KEY, userId, locale);
  }, [locale, userId]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
  }, []);

  const setUserId = useCallback((next: string | null) => {
    setUserIdState((prev) => {
      if (prev === next) return prev;
      // First sign-in (guest → user) and no per-user value yet?
      // Migrate the current selection forward so the user keeps their
      // language at the moment they create their account.
      if (next) migrateGuestPrefToUser(LOCALE_STORAGE_KEY, next);
      // Hydrate from the new bucket.
      setLocaleState(readStoredLocale(next));
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let text = translations[locale]?.[key] ?? translations['fr']?.[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, setUserId, userId, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Bridges the auth context's user id into the i18n provider so the
 * locale is scoped per-user without I18nProvider depending on
 * AuthProvider directly (which would force a provider-order coupling).
 *
 * Mount this anywhere INSIDE both providers; it renders nothing.
 */
export function AuthLocaleBridge() {
  const { user } = useAuth();
  const { setUserId } = useI18nInternal();
  useEffect(() => {
    setUserId(user?.id ?? null);
  }, [user?.id, setUserId]);
  return null;
}
