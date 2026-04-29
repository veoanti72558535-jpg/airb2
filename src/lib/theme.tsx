import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  isValidTheme,
  type ThemeId,
} from './theme-constants';

// Re-export so existing call sites (`import { THEMES, ThemeId } from '@/lib/theme'`)
// keep working without churn. Types & constants are now sourced from the
// sibling module; this file stays "components-only" for Fast Refresh.
export { THEMES, type ThemeId, type ThemeMeta } from './theme-constants';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  /** Legacy compat — toggles between carbon-green and slate-light */
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
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
    localStorage.setItem(THEME_STORAGE_KEY, theme);
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
