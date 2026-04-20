import { describe, it, expect } from 'vitest';
import { isAirgunBrand, AIRGUN_BRANDS } from './airgun-brands';

describe('airgun-brands whitelist', () => {
  it('accepts canonical airgun brands', () => {
    for (const b of ['JSB', 'H&N', 'FX', 'Air Arms', 'NSA', 'Patriot']) {
      expect(isAirgunBrand(b)).toBe(true);
    }
  });

  it('is case- and whitespace-insensitive', () => {
    expect(isAirgunBrand('jsb')).toBe(true);
    expect(isAirgunBrand('  H&N  ')).toBe(true);
    expect(isAirgunBrand('AIR ARMS')).toBe(true);
  });

  it('rejects powder/firearm brands', () => {
    for (const b of [
      'Hornady',
      'Nosler',
      'Barnes',
      'Speer',
      'Sierra',
      'Berger',
      'Lapua',
      'Lehigh',
      'Peregrine',
      'Woodleigh',
      'Cutting Edge',
      'Swift',
      'Styria Arms',
      'NOE Bullet Moulds',
      'Frontier',
      'PPU',
      'Federal',
      'Remington',
    ]) {
      expect(isAirgunBrand(b)).toBe(false);
    }
  });

  it('rejects empty / nullish input', () => {
    expect(isAirgunBrand('')).toBe(false);
    expect(isAirgunBrand(undefined)).toBe(false);
    expect(isAirgunBrand(null)).toBe(false);
  });

  it('does NOT match substrings (e.g. "JSB Custom" is NOT JSB)', () => {
    // Sécurité explicite : pas de substring matching, sinon une marque
    // powder qui contiendrait "JSB" en suffixe serait conservée à tort.
    expect(isAirgunBrand('JSB Custom Knockoff')).toBe(false);
  });

  it('whitelist is non-empty and stable', () => {
    expect(AIRGUN_BRANDS.length).toBeGreaterThanOrEqual(15);
  });
});