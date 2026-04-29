import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THEME_FLAGS,
  THEME_FLAGS_KEY,
  filterThemesByFlags,
  parseThemeFlags,
} from './theme-flags';
import { THEMES, DEFAULT_THEME, type ThemeId } from '@/lib/theme-constants';

describe('theme-flags / parseThemeFlags', () => {
  it('returns defaults for null/undefined/non-object input', () => {
    expect(parseThemeFlags(null)).toEqual(DEFAULT_THEME_FLAGS);
    expect(parseThemeFlags(undefined)).toEqual(DEFAULT_THEME_FLAGS);
    expect(parseThemeFlags('garbage')).toEqual(DEFAULT_THEME_FLAGS);
    expect(parseThemeFlags(42)).toEqual(DEFAULT_THEME_FLAGS);
  });

  it('drops invalid theme ids from allowedVariants and defaultTheme', () => {
    const out = parseThemeFlags({
      defaultTheme: 'not-a-theme',
      allowedVariants: ['carbon-green', 'definitely-fake', 42, null, 'slate-dark'],
    });
    expect(out.defaultTheme).toBe(DEFAULT_THEME);
    expect(out.allowedVariants).toEqual(['carbon-green', 'slate-dark']);
  });

  it('treats missing booleans as enabled (safer default for end users)', () => {
    const out = parseThemeFlags({});
    expect(out.simpleModeEnabled).toBe(true);
    expect(out.advancedModeEnabled).toBe(true);
    expect(out.studioRouteEnabled).toBe(true);
    expect(out.darkLightToggleEnabled).toBe(true);
  });

  it('honours explicit false values', () => {
    const out = parseThemeFlags({
      simpleModeEnabled: false,
      advancedModeEnabled: false,
      studioRouteEnabled: false,
      darkLightToggleEnabled: false,
    });
    expect(out.simpleModeEnabled).toBe(false);
    expect(out.advancedModeEnabled).toBe(false);
    expect(out.studioRouteEnabled).toBe(false);
    expect(out.darkLightToggleEnabled).toBe(false);
  });

  it('preserves all valid theme ids when admin allows every variant', () => {
    const allIds = THEMES.map((t) => t.id);
    const out = parseThemeFlags({ allowedVariants: allIds });
    expect(out.allowedVariants).toHaveLength(THEMES.length);
  });

  it('uses the canonical app_settings key', () => {
    expect(THEME_FLAGS_KEY).toBe('theme.flags');
  });
});

describe('theme-flags / filterThemesByFlags', () => {
  it('returns ALL themes when allowedVariants is empty (no restriction)', () => {
    const out = filterThemesByFlags(THEMES, DEFAULT_THEME_FLAGS);
    expect(out).toHaveLength(THEMES.length);
  });

  it('restricts to the allowed list when set', () => {
    const allowed: ThemeId[] = ['slate-dark', 'mono-slate'];
    const flags = { ...DEFAULT_THEME_FLAGS, allowedVariants: allowed, defaultTheme: 'slate-dark' as ThemeId };
    const out = filterThemesByFlags(THEMES, flags);
    expect(out.map((t) => t.id).sort()).toEqual(['mono-slate', 'slate-dark']);
  });

  it('always keeps the defaultTheme even if not explicitly listed', () => {
    // Admin may forget to tick the default — UI must never lock the user
    // into an unreachable theme.
    const flags = {
      ...DEFAULT_THEME_FLAGS,
      allowedVariants: ['mono-slate' as ThemeId],
      defaultTheme: 'carbon-green' as ThemeId,
    };
    const out = filterThemesByFlags(THEMES, flags);
    const ids = out.map((t) => t.id);
    expect(ids).toContain('carbon-green');
    expect(ids).toContain('mono-slate');
    expect(out).toHaveLength(2);
  });
});
