import { describe, it, expect, beforeEach } from 'vitest';
import {
  hexToHslTokens,
  sanitiseCustomisation,
  readCustomisation,
  writeCustomisation,
  THEME_CUSTOM_STORAGE_KEY,
  THEMES,
  THEME_FAMILIES,
  getFamilyVariant,
  isValidTheme,
} from './theme-constants';

describe('hexToHslTokens', () => {
  it('converts standard hex to "H S% L%" Tailwind tokens', () => {
    // Pure red → H=0, S=100, L=50
    expect(hexToHslTokens('#ff0000')).toBe('0 100% 50%');
    // Pure white → H=0, S=0, L=100
    expect(hexToHslTokens('#ffffff')).toBe('0 0% 100%');
  });

  it('accepts shorthand #RGB', () => {
    expect(hexToHslTokens('#0f0')).toBe('120 100% 50%');
  });

  it('returns null on garbage', () => {
    expect(hexToHslTokens('not-a-hex')).toBeNull();
    expect(hexToHslTokens('#zzz')).toBeNull();
    expect(hexToHslTokens('')).toBeNull();
  });
});

describe('sanitiseCustomisation', () => {
  it('drops invalid keys silently', () => {
    const out = sanitiseCustomisation({
      // @ts-expect-error testing runtime guard
      density: 'tiny',
      // @ts-expect-error testing runtime guard
      contrast: 'mega',
      fontScale: 99,
      accentHex: '#xyz',
    });
    expect(out.density).toBeUndefined();
    expect(out.contrast).toBeUndefined();
    expect(out.accentHex).toBeUndefined();
    // Out-of-range font scale clamps to bounds, never dropped.
    expect(out.fontScale).toBeGreaterThan(0);
    expect(out.fontScale).toBeLessThanOrEqual(1.25);
  });

  it('preserves valid customisation', () => {
    const out = sanitiseCustomisation({
      accentHex: '#22C55E',
      density: 'compact',
      fontScale: 1.05,
      contrast: 'high',
      radius: 'soft',
    });
    expect(out).toEqual({
      accentHex: '#22C55E',
      density: 'compact',
      fontScale: 1.05,
      contrast: 'high',
      radius: 'soft',
    });
  });
});

describe('read/writeCustomisation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips through localStorage', () => {
    writeCustomisation({ density: 'comfortable', accentHex: '#3B82F6' });
    const read = readCustomisation();
    expect(read.density).toBe('comfortable');
    expect(read.accentHex).toBe('#3B82F6');
  });

  it('returns {} when storage is empty', () => {
    expect(readCustomisation()).toEqual({});
  });

  it('returns {} on corrupted storage', () => {
    localStorage.setItem(THEME_CUSTOM_STORAGE_KEY, '{not json');
    expect(readCustomisation()).toEqual({});
  });
});

describe('Theme families', () => {
  it('exposes the six premium families', () => {
    expect(THEME_FAMILIES).toEqual([
      'carbon-green',
      'tactical-dark',
      'slate',
      'desert-tan',
      'midnight-blue',
      'mono-slate',
    ]);
  });

  it('every family has both a dark and a light variant', () => {
    for (const family of THEME_FAMILIES) {
      const variants = THEMES.filter((t) => t.family === family);
      const modes = variants.map((v) => v.mode).sort();
      expect(modes).toEqual(['dark', 'light']);
    }
  });

  it('getFamilyVariant swaps to the requested mode within the family', () => {
    expect(getFamilyVariant('midnight-blue', 'light')).toBe('midnight-blue-light');
    expect(getFamilyVariant('midnight-blue-light', 'dark')).toBe('midnight-blue');
    expect(getFamilyVariant('mono-slate', 'light')).toBe('mono-slate-light');
    expect(getFamilyVariant('slate-light', 'dark')).toBe('slate-dark');
    // Already in the right mode → no change.
    expect(getFamilyVariant('carbon-green', 'dark')).toBe('carbon-green');
  });

  it('isValidTheme accepts all 12 ids and rejects unknown values', () => {
    for (const t of THEMES) expect(isValidTheme(t.id)).toBe(true);
    expect(isValidTheme('not-a-theme')).toBe(false);
    expect(isValidTheme(null)).toBe(false);
  });

  it('sanitises and round-trips fontFamily', () => {
    expect(sanitiseCustomisation({ fontFamily: 'serif' }).fontFamily).toBe('serif');
    expect(sanitiseCustomisation({ fontFamily: 'display' }).fontFamily).toBe('display');
    // @ts-expect-error testing runtime guard
    expect(sanitiseCustomisation({ fontFamily: 'comic-sans' }).fontFamily).toBeUndefined();
  });
});