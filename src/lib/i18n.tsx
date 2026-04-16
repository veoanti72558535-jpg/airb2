import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, TranslationKey } from './translations';

type Locale = 'fr' | 'en';

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('pcp-locale');
    return (saved === 'en' || saved === 'fr') ? saved : 'fr';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('pcp-locale', l);
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>): string => {
    let text = translations[locale]?.[key] ?? translations['fr']?.[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
