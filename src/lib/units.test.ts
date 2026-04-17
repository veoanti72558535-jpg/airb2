/**
 * Tests for the unit-preferences layer (`units.ts`).
 *
 * The `toDisplay` / `fromDisplay` round-trip is the central guarantee that
 * lets the calculator store everything in reference units while showing user-
 * preferred units in the UI without any drift between save and reload.
 */

import { describe, it, expect } from 'vitest';
import {
  unitCategories,
  getDefaultUnitPrefs,
  getUnitSymbol,
  toDisplay,
  fromDisplay,
} from './units';

describe('unit catalogue invariants', () => {
  it('every category has a unique key', () => {
    const keys = unitCategories.map(c => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every category has a non-empty options list', () => {
    for (const c of unitCategories) expect(c.options.length).toBeGreaterThan(0);
  });

  it('reference unit appears in the options of every category', () => {
    for (const c of unitCategories) {
      expect(c.options.some(o => o.value === c.reference)).toBe(true);
    }
  });

  it('default metric and imperial both refer to existing options', () => {
    for (const c of unitCategories) {
      expect(c.options.some(o => o.value === c.defaultMetric)).toBe(true);
      expect(c.options.some(o => o.value === c.defaultImperial)).toBe(true);
    }
  });
});

describe('getDefaultUnitPrefs', () => {
  it('returns one entry per category for metric system', () => {
    const prefs = getDefaultUnitPrefs('metric');
    for (const c of unitCategories) expect(prefs[c.key]).toBe(c.defaultMetric);
  });

  it('returns imperial defaults when asked', () => {
    const prefs = getDefaultUnitPrefs('imperial');
    for (const c of unitCategories) expect(prefs[c.key]).toBe(c.defaultImperial);
  });
});

describe('getUnitSymbol', () => {
  it('returns the symbol for a known category/unit', () => {
    expect(getUnitSymbol('velocity', 'mps')).toBe('m/s');
    expect(getUnitSymbol('energy', 'joules')).toBe('J');
    expect(getUnitSymbol('weight', 'grains')).toBe('gr');
  });

  it('falls back to the unit value for unknown categories or units', () => {
    expect(getUnitSymbol('not-a-cat', 'mps')).toBe('mps');
    expect(getUnitSymbol('velocity', 'not-a-unit')).toBe('not-a-unit');
  });
});

describe('toDisplay / fromDisplay round-trip', () => {
  // Pick one representative unit per category that differs from the reference
  // so we exercise the converter rather than the identity branch.
  const cases: Array<[string, string, number]> = [
    ['velocity', 'fps', 280],
    ['energy', 'ftlbs', 45],
    ['distance', 'yards', 100],
    ['length', 'inches', 25.4],
    ['weight', 'grams', 18 * 0.06479891], // 18 gr expressed in grams as reference
    ['pressure', 'psi', 1.5],
    ['temperature', 'fahrenheit', 22],
    ['correction', 'mrad', 0.5],
    ['power', 'hp', 100],
    ['force', 'lbf', 50],
    ['area', 'ft2', 4],
    ['volume', 'gal_us', 5],
  ];

  it.each(cases)('%s round-trip via %s preserves the value', (cat, unit, value) => {
    const prefs = { [cat]: unit };
    const display = toDisplay(cat, value, prefs);
    const back = fromDisplay(cat, display, prefs);
    expect(Math.abs(back - value)).toBeLessThan(1e-6);
  });

  it('returns the value unchanged when display unit equals reference', () => {
    const prefs = { velocity: 'mps' };
    expect(toDisplay('velocity', 123.45, prefs)).toBe(123.45);
    expect(fromDisplay('velocity', 123.45, prefs)).toBe(123.45);
  });

  it('returns the value unchanged when category has no preference set', () => {
    expect(toDisplay('velocity', 280, {})).toBe(280);
  });

  it('returns the value unchanged for unknown categories (no crash)', () => {
    expect(toDisplay('unknown-cat', 99, { 'unknown-cat': 'foo' })).toBe(99);
    expect(fromDisplay('unknown-cat', 99, { 'unknown-cat': 'foo' })).toBe(99);
  });
});
