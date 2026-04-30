import { describe, it, expect } from 'vitest';
import { formatNumber, clampDecimals } from './number-format';

describe('clampDecimals', () => {
  it('clamps to [0, 6] and rounds', () => {
    expect(clampDecimals(-1)).toBe(0);
    expect(clampDecimals(0)).toBe(0);
    expect(clampDecimals(3)).toBe(3);
    expect(clampDecimals(2.6)).toBe(3);
    expect(clampDecimals(99)).toBe(6);
  });
  it('passes through undefined / non-finite', () => {
    expect(clampDecimals(undefined)).toBeUndefined();
    expect(clampDecimals(NaN)).toBeUndefined();
    expect(clampDecimals(Infinity)).toBeUndefined();
  });
});

describe('formatNumber', () => {
  it('returns em-dash for NaN / Infinity', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });

  it('auto heuristic: ≥100 → 0 dec, otherwise 2 dec', () => {
    expect(formatNumber(123.456, {}, 'en')).toBe('123');
    expect(formatNumber(12.345, {}, 'en')).toBe('12.35');
    expect(formatNumber(0.0412, {}, 'en')).toBe('0.04');
  });

  it('respects fixed decimals', () => {
    expect(formatNumber(12.3456, { decimals: 4 }, 'en')).toBe('12.3456');
    expect(formatNumber(12.3456, { decimals: 0 }, 'en')).toBe('12');
  });

  it('groups thousands with the locale separator', () => {
    expect(formatNumber(1234567, { decimals: 0 }, 'en')).toBe('1,234,567');
    // fr-FR uses NBSP (U+202F or U+00A0); accept either.
    const fr = formatNumber(1234567, { decimals: 0 }, 'fr');
    expect(fr.replace(/[\u00A0\u202F]/g, ' ')).toBe('1 234 567');
  });

  it('disables grouping when groupThousands=false', () => {
    expect(formatNumber(1234567, { decimals: 0, groupThousands: false }, 'en'))
      .toBe('1234567');
  });

  it('switches to scientific for very small / very large magnitudes', () => {
    expect(formatNumber(0.00012, { scientific: true }, 'en')).toBe('1.20e-4');
    expect(formatNumber(2_500_000, { scientific: true }, 'en')).toBe('2.50e+6');
    // Inside the [1e-3, 1e6) band → stays decimal.
    expect(formatNumber(123.4, { scientific: true }, 'en')).toBe('123');
  });

  it('respects the determinism contract — pure, deterministic output', () => {
    // Same inputs → same string, every time.
    const a = formatNumber(42.4242, { decimals: 3 }, 'en');
    const b = formatNumber(42.4242, { decimals: 3 }, 'en');
    expect(a).toBe(b);
  });
});
