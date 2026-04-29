import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import {
  THEMES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  isValidTheme,
  readCustomisationFor,
  writeCustomisationFor,
  sanitiseCustomisation,
  hexToHslTokens,
  themeStorageKeyFor,
  customStorageKeyFor,
  getFamilyVariant,
  type ThemeId,
  type ThemeCustomisation,
} from './theme-constants';
import { ThemeContext, useTheme as useThemeInternal, type ThemeContextType } from './theme-internals';

// Re-exports — keep existing call sites working unchanged.
export { THEMES, type ThemeId, type ThemeMeta } from './theme-constants';
export const useTheme = useThemeInternal;
export type { ThemeContextType };

// ─────────────────────────────────────────────────────────────────────────
// Smooth dark/light transition helper
// ─────────────────────────────────────────────────────────────────────────
// We add `theme-transitions-on` to <html> for a short window around each
// theme swap. Index.css then animates background/colour/border/etc. on
// every element. We strip the class after the animation finishes so the
// rest of the app doesn't pay the per-paint transition cost.
const TRANSITION_CLASS = 'theme-transitions-on';
const TRANSITION_MS = 260;
let transitionTimer: number | null = null;

function pulseThemeTransition(): void {
  if (typeof window === 'undefined') return;
  // Honour user preference: no pulse if reduced motion is requested.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  root.classList.add(TRANSITION_CLASS);
  if (transitionTimer !== null) window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    root.classList.remove(TRANSITION_CLASS);
    transitionTimer = null;
  }, TRANSITION_MS);
}

/**
 * Read the stored theme for a given user, with legacy migration from the
 * old "dark"/"light" sentinel values. Falls back to the anonymous bucket
 * when the per-user key is missing — important for first-sign-in so the
 * user keeps the theme they were already using.
 */
function readStoredTheme(userId: string | null): ThemeId {
  const userKey = themeStorageKeyFor(userId);
  let saved = localStorage.getItem(userKey);
  if (!saved && userId) {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  }
  if (saved === 'dark') return 'carbon-green';
  if (saved === 'light') return 'slate-light';
  return isValidTheme(saved) ? saved : DEFAULT_THEME;
}

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

  // Font family override. We swap the --font-heading / --font-body CSS
  // variables (defined in index.css) so every typed surface picks it up.
  // 'sans' clears the override and lets index.css fall back to its
  // defaults (DM Sans / Inter).
  const fontFamily = c.fontFamily ?? 'sans';
  root.setAttribute('data-font-family', fontFamily);
  if (fontFamily === 'display') {
    root.style.setProperty('--font-heading', "'Space Grotesk', 'DM Sans', system-ui, sans-serif");
    root.style.setProperty('--font-body', "'DM Sans', 'Inter', system-ui, sans-serif");
  } else if (fontFamily === 'serif') {
    root.style.setProperty('--font-heading', "'Fraunces', 'Playfair Display', Georgia, serif");
    root.style.setProperty('--font-body', "'DM Sans', 'Inter', system-ui, sans-serif");
  } else {
    root.style.removeProperty('--font-heading');
    root.style.removeProperty('--font-body');
  }

  // Mark customisation dirty for downstream consumers (e.g. canvas
  // renderers) that may want to re-paint on changes.
  root.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `userId` lives in state so the provider re-renders (and re-reads
  // persisted prefs) whenever the active user changes.
  const [userId, setUserIdState] = useState<string | null>(null);

  const [theme, setThemeState] = useState<ThemeId>(() => readStoredTheme(null));
  const [custom, setCustom] = useState<ThemeCustomisation>(() => readCustomisationFor(null));

  // Track the previous isDark so we only pulse the transition layer when
  // the dark/light branch actually flips, not on every accent tweak.
  const prevIsDarkRef = useRef<boolean | null>(null);

  const meta = useMemo(
    () => THEMES.find((t) => t.id === theme) ?? THEMES[0],
    [theme],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (prevIsDarkRef.current !== null && prevIsDarkRef.current !== meta.isDark) {
      pulseThemeTransition();
    }
    prevIsDarkRef.current = meta.isDark;

    root.classList.remove('dark', 'light');
    root.classList.add(meta.isDark ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    // Persist under the per-user key (or anonymous bucket).
    try {
      localStorage.setItem(themeStorageKeyFor(userId), theme);
      // Mirror to the anonymous bucket so the next page load — before
      // auth has resolved — picks up the latest choice instead of the
      // stale default theme.
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage disabled — visuals still apply via DOM, persistence is
         best-effort. */
    }
    // Re-apply customisation after a theme switch so overrides survive.
    applyCustomisation(custom, meta.isDark);
  }, [theme, meta.isDark, custom, userId]);

  const setTheme = useCallback((id: ThemeId) => setThemeState(id), []);
  const toggleTheme = useCallback(() => {
    // Swap to the same family's opposite mode (e.g. midnight-blue ↔
    // midnight-blue-light). Falls back to slate-light/carbon-green if
    // the active id has no sibling, which can't happen with the current
    // theme list but keeps the toggle defensive.
    setThemeState((t) => {
      const m = THEMES.find((x) => x.id === t);
      if (!m) return 'carbon-green';
      return getFamilyVariant(m.id, m.mode === 'dark' ? 'light' : 'dark');
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
      writeCustomisationFor(userId, clean);
      // Mirror to anonymous bucket so first-paint after reload uses it.
      writeCustomisationFor(null, clean);
      return clean;
    });
  }, [userId]);

  const resetCustom = useCallback(() => {
    setCustom({});
    writeCustomisationFor(userId, {});
    writeCustomisationFor(null, {});
  }, [userId]);

  const setUserId = useCallback((next: string | null) => {
    setUserIdState((prev) => {
      if (prev === next) return prev;

      // First-time sign-in (anonymous → user) and no per-user prefs yet?
      // Migrate the current selection forward so the user doesn't lose
      // their setup at the moment they create their account.
      if (next) {
        const userThemeKey = themeStorageKeyFor(next);
        const userCustomKey = customStorageKeyFor(next);
        if (!localStorage.getItem(userThemeKey)) {
          try {
            localStorage.setItem(userThemeKey, theme);
          } catch { /* ignore */ }
        }
        if (!localStorage.getItem(userCustomKey)) {
          writeCustomisationFor(next, custom);
        }
      }

      // Hydrate state from the new user's storage bucket.
      const nextTheme = readStoredTheme(next);
      const nextCustom = readCustomisationFor(next);
      setThemeState(nextTheme);
      setCustom(nextCustom);
      return next;
    });
  }, [theme, custom]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    isDark: meta.isDark,
    custom,
    updateCustom,
    resetCustom,
    setUserId,
    userId,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Bridges the auth context's user id into the theme provider so theme +
 * customisation are scoped per-user without ThemeProvider depending on
 * AuthProvider directly (which would force a provider-order coupling).
 *
 * Mount this anywhere INSIDE both providers; it renders nothing.
 */
export function AuthThemeBridge({ userId }: { userId: string | null }) {
  const { setUserId } = useThemeInternal();
  useEffect(() => {
    setUserId(userId);
  }, [userId, setUserId]);
  return null;
}
