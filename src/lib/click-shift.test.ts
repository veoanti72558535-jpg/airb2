import { describe, it, expect } from 'vitest';
import { calculateClickShift, reverseClickShift } from './click-shift';

describe('calculateClickShift', () => {
  // Ex1: 0.25 MOA × 4 clicks × 100 m → ≈ 29.09 mm
  it('Ex1: 0.25 MOA × 4 clicks at 100 m', () => {
    const r = calculateClickShift({ clickValueNative: 0.25, clickUnit: 'MOA', numberOfClicks: 4, targetDistanceM: 100 });
    expect(r.shiftMm).toBeCloseTo(29.09, 1);
    expect(r.shiftCm).toBeCloseTo(2.909, 2);
    expect(r.referenceDistanceM).toBe(100);
  });

  // Ex2: 0.1 MRAD × 1 click × 100 m → 10.00 mm
  it('Ex2: 0.1 MRAD × 1 click at 100 m', () => {
    const r = calculateClickShift({ clickValueNative: 0.1, clickUnit: 'MRAD', numberOfClicks: 1, targetDistanceM: 100 });
    expect(r.shiftMm).toBeCloseTo(10.00, 2);
  });

  // Ex3: 1 CM_100M × 3 clicks × 250 m → 7.50 mm
  it('Ex3: 1 cm/100m × 3 clicks at 250 m', () => {
    const r = calculateClickShift({ clickValueNative: 1, clickUnit: 'CM_100M', numberOfClicks: 3, targetDistanceM: 250 });
    expect(r.shiftMm).toBeCloseTo(7.50, 2);
  });

  // Ex4: 0.25 INCH_100YD × 4 clicks × 100 m → ≈ 27.78 mm
  it('Ex4: 0.25 INCH_100YD × 4 clicks at 100 m', () => {
    const r = calculateClickShift({ clickValueNative: 0.25, clickUnit: 'INCH_100YD', numberOfClicks: 4, targetDistanceM: 100 });
    expect(r.shiftMm).toBeCloseTo(27.78, 1);
    expect(r.referenceDistanceM).toBe(91.44);
  });

  // Ex5: 0.1 MRAD × 10 clicks × 50 m → 50.00 mm
  it('Ex5: 0.1 MRAD × 10 clicks at 50 m', () => {
    const r = calculateClickShift({ clickValueNative: 0.1, clickUnit: 'MRAD', numberOfClicks: 10, targetDistanceM: 50 });
    expect(r.shiftMm).toBeCloseTo(50.00, 2);
  });

  // Ex6: 0.25 MOA × 1 click × 25 m → ≈ 1.818 mm
  it('Ex6: 0.25 MOA × 1 click at 25 m', () => {
    const r = calculateClickShift({ clickValueNative: 0.25, clickUnit: 'MOA', numberOfClicks: 1, targetDistanceM: 25 });
    expect(r.shiftMm).toBeCloseTo(1.818, 2);
  });

  // Test 7: 1 MRAD × 1 click × 100 m → 100.00 mm
  it('1 MRAD × 1 click at 100 m = 100 mm', () => {
    const r = calculateClickShift({ clickValueNative: 1, clickUnit: 'MRAD', numberOfClicks: 1, targetDistanceM: 100 });
    expect(r.shiftMm).toBe(100);
    expect(r.shiftCm).toBe(10);
  });

  // Test 8: 0.5 CM_100M × 1 click × 100 m → 0.5 mm (0.5 cm/100m = 0.005 MRAD)
  it('0.5 cm/100m × 1 click at 100 m = 0.5 mm', () => {
    const r = calculateClickShift({ clickValueNative: 0.5, clickUnit: 'CM_100M', numberOfClicks: 1, targetDistanceM: 100 });
    expect(r.shiftMm).toBeCloseTo(0.5, 4);
  });

  // Test 10: perClickMm check
  it('0.1 MRAD perClickMm at 75 m = 7.5 mm', () => {
    const r = calculateClickShift({ clickValueNative: 0.1, clickUnit: 'MRAD', numberOfClicks: 1, targetDistanceM: 75 });
    expect(r.perClickMm).toBeCloseTo(7.5, 2);
  });

  it('angular totals: shiftMrad and shiftMoa are consistent', () => {
    const r = calculateClickShift({ clickValueNative: 0.25, clickUnit: 'MOA', numberOfClicks: 4, targetDistanceM: 100 });
    expect(r.shiftMoa).toBeCloseTo(1.0, 4);
    expect(r.shiftMrad).toBeCloseTo(0.290888, 4);
  });
});

describe('reverseClickShift', () => {
  // Test 9: inverse — 29.09 mm at 100 m with 0.25 MOA → 4 clicks
  it('29.09 mm at 100 m with 0.25 MOA → 4 clicks', () => {
    const r = reverseClickShift(29.09, 0.25, 'MOA', 100);
    expect(r.rounded).toBe(4);
    expect(r.exact).toBeCloseTo(4, 1);
  });

  it('10 mm at 100 m with 0.1 MRAD → 1 click', () => {
    const r = reverseClickShift(10, 0.1, 'MRAD', 100);
    expect(r.rounded).toBe(1);
    expect(r.exact).toBe(1);
    expect(r.errorMm).toBe(0);
  });

  it('errorPct: 15 mm at 100 m with 0.1 MRAD → rounded 2 → +5 mm = +33.3%', () => {
    const r = reverseClickShift(15, 0.1, 'MRAD', 100);
    expect(r.rounded).toBe(2);
    expect(r.actualMm).toBe(20);
    expect(r.errorMm).toBeCloseTo(5, 2);
    expect(r.errorPct).toBeCloseTo(33.33, 1);
  });

  it('errorPct: negative when undershoot', () => {
    const r = reverseClickShift(35, 0.1, 'MRAD', 100);
    expect(r.rounded).toBe(4);
    expect(r.actualMm).toBe(40);
    expect(r.errorMm).toBeCloseTo(5, 2);
    expect(r.errorPct).toBeCloseTo(14.29, 1);
  });
});