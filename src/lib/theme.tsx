import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export type ThemeId = 'carbon-green' | 'tactical-dark' | 'slate-light' | 'desert-tan';

export interface ThemeMeta {
  id: ThemeId;
  labelFR: string;
  labelEN: string;
  isDark: boolean;
  accentColor: string;
  bgColor: string;
}

export const THEMES: ThemeMeta[] = [
  { id: 'carbon-green', labelFR: 'Carbon Green', labelEN: 'Carbon Green', isDark: true, accentColor: '#22C55E', bgColor: '#111111' },
  { id: 'tactical-dark', labelFR: 'Tactical Dark', labelEN: 'Tactical Dark', isDark: true, accentColor: '#F59E0B', bgColor: '#0C0E14' },
  { id: 'slate-light', labelFR: 'Slate Light', labelEN: 'Slate Light', isDark: false, accentColor: '#3B82F6', bgColor: '#F8FAFC' },
  { id: 'desert-tan', labelFR: 'Desert Tan', labelEN: 'Desert Tan', isDark: true, accentColor: '#E07B39', bgColor: '#1C1510' },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  /** Legacy compat — toggles between carbon-green and slate-light */
  toggleTheme: () => void;
  isDark: boolean;
}

const STORAGE_KEY = 'pcp-theme';
const DEFAULT_THEME: ThemeId = 'carbon-green';

function isValidTheme(v: string | null): v is ThemeId {
  return v === 'carbon-green' || v === 'tactical-dark' || v === 'slate-light' || v === 'desert-tan';
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // migrate old dark/light values
    if (saved === 'dark') return 'carbon-green';
    if (saved === 'light') return 'slate-light';
    return isValidTheme(saved) ? saved : DEFAULT_THEME;
  });

  const meta = THEMES.find(t => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(meta.isDark ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);
  const toggleTheme = useCallback(() => {
    setThemeState(t => {
      const m = THEMES.find(x => x.id === t);
      return m?.isDark ? 'slate-light' : 'carbon-green';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: meta.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
