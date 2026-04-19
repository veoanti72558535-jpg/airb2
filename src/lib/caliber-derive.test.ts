import { describe, it, expect } from 'vitest';
import {
  deriveCaliberFromDiameterIn,
  deriveCaliberFromDiameterMm,
  deriveCaliber,
  CALIBER_DERIVE_DEFAULT_TOLERANCE_IN,
} from './caliber-derive';

describe('deriveCaliberFromDiameterIn', () => {
  it('matches exact standard calibers', () => {
    expect(deriveCaliberFromDiameterIn(0.177)).toBe('.17');
    expect(deriveCaliberFromDiameterIn(0.20)).toBe('.20');
    expect(deriveCaliberFromDiameterIn(0.204)).toBe('.204');
    expect(deriveCaliberFromDiameterIn(0.22)).toBe('.22');
    expect(deriveCaliberFromDiameterIn(0.224)).toBe('.224');
    expect(deriveCaliberFromDiameterIn(0.25)).toBe('.25');
    expect(deriveCaliberFromDiameterIn(0.30)).toBe('.30');
    expect(deriveCaliberFromDiameterIn(0.308)).toBe('.308');
    expect(deriveCaliberFromDiameterIn(0.357)).toBe('.357');
    expect(deriveCaliberFromDiameterIn(0.45)).toBe('.45');
  });

  it('tolerates small offsets within ±0.005"', () => {
    expect(deriveCaliberFromDiameterIn(0.218)).toBe('.22');
    expect(deriveCaliberFromDiameterIn(0.222)).toBe('.22');
    expect(deriveCaliberFromDiameterIn(0.227)).toBe('.224');
  });

  it('returns null when no candidate is within tolerance', () => {
    expect(deriveCaliberFromDiameterIn(0.50)).toBeNull();
    expect(deriveCaliberFromDiameterIn(0.10)).toBeNull();
  });

  it('returns null for null/undefined/non-finite/non-positive inputs', () => {
    expect(deriveCaliberFromDiameterIn(null)).toBeNull();
    expect(deriveCaliberFromDiameterIn(undefined)).toBeNull();
    expect(deriveCaliberFromDiameterIn(0)).toBeNull();
    expect(deriveCaliberFromDiameterIn(-1)).toBeNull();
    expect(deriveCaliberFromDiameterIn(Number.NaN)).toBeNull();
    expect(deriveCaliberFromDiameterIn(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('picks the closest candidate when several are within tolerance', () => {
    // 0.222 → .22 (Δ=0.002) preferred over .224 (Δ=0.002): tie broken by table order.
    expect(deriveCaliberFromDiameterIn(0.222)).toBe('.22');
    // 0.223 is closer to .22 (Δ=0.003) than to .224 (Δ=0.001) → .224
    expect(deriveCaliberFromDiameterIn(0.223)).toBe('.224');
  });

  it('exposes the default tolerance for downstream callers', () => {
    expect(CALIBER_DERIVE_DEFAULT_TOLERANCE_IN).toBe(0.005);
  });
});

describe('deriveCaliberFromDiameterMm', () => {
  it('converts mm to inches and matches', () => {
    expect(deriveCaliberFromDiameterMm(5.5)).toBe('.22'); // 5.5 / 25.4 ≈ 0.2165
    expect(deriveCaliberFromDiameterMm(4.5)).toBe('.17'); // 4.5 / 25.4 ≈ 0.1772
    expect(deriveCaliberFromDiameterMm(6.35)).toBe('.25'); // 6.35 / 25.4 = 0.25
    expect(deriveCaliberFromDiameterMm(7.62)).toBe('.30'); // 7.62 / 25.4 = 0.30
  });

  it('returns null for invalid inputs', () => {
    expect(deriveCaliberFromDiameterMm(null)).toBeNull();
    expect(deriveCaliberFromDiameterMm(undefined)).toBeNull();
    expect(deriveCaliberFromDiameterMm(0)).toBeNull();
  });
});

describe('deriveCaliber (unified)', () => {
  it('prefers diameterIn over diameterMm when both are present', () => {
    // diameterIn=.224 is canonical; diameterMm=5.7 (~.224) — same answer either way
    expect(deriveCaliber({ diameterIn: 0.224, diameterMm: 5.7 })).toBe('.224');
  });

  it('falls back to diameterMm when diameterIn is missing', () => {
    expect(deriveCaliber({ diameterMm: 5.5 })).toBe('.22');
  });

  it('returns null when both inputs are missing or invalid', () => {
    expect(deriveCaliber({})).toBeNull();
    expect(deriveCaliber({ diameterIn: null, diameterMm: null })).toBeNull();
    expect(deriveCaliber({ diameterIn: 99 })).toBeNull();
  });
});
