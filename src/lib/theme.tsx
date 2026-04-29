import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  isValidTheme,
  readCustomisation,
  writeCustomisation,
  sanitiseCustomisation,
  hexToHslTokens,
  type ThemeId,
  type ThemeCustomisation,
} from './theme-constants';
import { ThemeContext, useTheme as useThemeInternal, type ThemeContextType } from './theme-internals';

// Re-exports — keep existing call sites working unchanged.
export { THEMES, type ThemeId, type ThemeMeta } from './theme-constants';
export const useTheme = useThemeInternal;
export type { ThemeContextType };

/**
 * Apply customisation knobs to `:root` as CSS custom properties + data
 * attributes. We touch a small, well-known set of variables so individual
 * components can opt in (e.g. `padding: var(--density-pad-3)`) without
 * the whole UI snapping around.
 */
function applyCustomisation(c: ThemeCustomisation, isDark: boolean): void {
  const root = document.documentElement;

  // Accent override → swap Tailwind's --primary HSL tokens.
  if (c.accentHex) {
    const tokens = hexToHslTokens(c.accentHex);
    if (tokens) {
      root.style.setProperty('--primary', tokens);
      // The "ring" colour usually mirrors --primary in shadcn themes.
      root.style.setProperty('--ring', tokens);
    }
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--ring');
  }

  // Density → spacing scale used by surface-elevated/cards.
  const density = c.density ?? 'cosy';
  root.setAttribute('data-density', density);
  const densityScale = density === 'compact' ? 0.85 : density === 'comfortable' ? 1.15 : 1;
  root.style.setProperty('--density-scale', String(densityScale));

  // Font scale → root font-size multiplier.
  const fontScale = typeof c.fontScale === 'number' ? c.fontScale : 1;
  root.style.setProperty('--font-scale', String(fontScale));
  root.style.fontSize = `${fontScale * 100}%`;

  // Contrast → boost foreground/background separation. Implemented as a
  // data attribute that components/index.css can hook into; we also raise
  // border opacity here as a baseline.
  const contrast = c.contrast ?? 'normal';
  root.setAttribute('data-contrast', contrast);
  if (contrast === 'high') {
    root.style.setProperty('--border-opacity-boost', '1.6');
  } else {
    root.style.removeProperty('--border-opacity-boost');
  }

  // Border radius scale.
  const radius = c.radius ?? 'normal';
  root.setAttribute('data-radius', radius);
  const radiusValue = radius === 'sharp' ? '0.25rem' : radius === 'soft' ? '0.875rem' : '0.5rem';
  root.style.setProperty('--radius', radiusValue);

  // Mark customisation dirty for downstream consumers (e.g. canvas
  // renderers) that may want to re-paint on changes.
  root.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    // migrate old dark/light values
    if (saved === 'dark') return 'carbon-green';
    if (saved === 'light') return 'slate-light';
    return isValidTheme(saved) ? saved : DEFAULT_THEME;
  });

  const [custom, setCustom] = useState<ThemeCustomisation>(() => readCustomisation());

  const meta = useMemo(
    () => THEMES.find((t) => t.id === theme) ?? THEMES[0],
    [theme],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(meta.isDark ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    // Re-apply customisation after a theme switch so overrides survive.
    applyCustomisation(custom, meta.isDark);
  }, [theme, meta.isDark, custom]);

  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);
  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const m = THEMES.find((x) => x.id === t);
      return m?.isDark ? 'slate-light' : 'carbon-green';
    });
  }, []);

  const updateCustom = useCallback((patch: ThemeCustomisation) => {
    setCustom((prev) => {
      const merged: ThemeCustomisation = { ...prev };
      // Explicit `null` clears the override; `undefined` leaves it alone.
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete (merged as Record<string, unknown>)[k];
        else (merged as Record<string, unknown>)[k] = v;
      }
      const clean = sanitiseCustomisation(merged);
      writeCustomisation(clean);
      return clean;
    });
  }, []);

  const resetCustom = useCallback(() => {
    setCustom({});
    writeCustomisation({});
  }, []);

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    isDark: meta.isDark,
    custom,
    updateCustom,
    resetCustom,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
