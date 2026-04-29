import { describe, it, expect, beforeEach } from 'vitest';
import {
  hexToHslTokens,
  sanitiseCustomisation,
  readCustomisation,
  writeCustomisation,
  THEME_CUSTOM_STORAGE_KEY,
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