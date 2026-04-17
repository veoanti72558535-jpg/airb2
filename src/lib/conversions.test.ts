/**
 * Conversion regression tests.
 *
 * The factor maps in `conversions.ts` are the single source of truth used by
 * the entire app (UnitField, ResultsCard, exports). A typo here would silently
 * shift every displayed number, so we anchor each category to:
 *  1. Identity (X → X is exact).
 *  2. A known reference value (e.g. 1 inch = 25.4 mm).
 *  3. Round-trip stability (X → Y → X recovers the original within ε).
 */

import { describe, it, expect } from 'vitest';
import {
  convertVelocity, convertDistance, convertWeight, convertEnergy,
  convertPressure, convertTemperature, convertAngle, convertPower,
  convertForce, convertArea, convertVolume,
  calcMuzzleEnergy,
} from './conversions';

const close = (got: number, want: number, eps = 1e-6) =>
  expect(Math.abs(got - want)).toBeLessThan(eps);

describe('convertVelocity — references', () => {
  it('1 m/s ≈ 3.28084 fps', () => close(convertVelocity(1, 'mps', 'fps'), 3.28084, 1e-4));
  it('1 m/s = 3.6 km/h exactly', () => close(convertVelocity(1, 'mps', 'kmh'), 3.6));
  it('round-trips m/s ↔ fps ↔ km/h', () => {
    const v = 280;
    const out = convertVelocity(convertVelocity(convertVelocity(v, 'mps', 'fps'), 'fps', 'kmh'), 'kmh', 'mps');
    close(out, v, 1e-9);
  });
});

describe('convertDistance — references', () => {
  it('1 inch = 0.0254 m', () => close(convertDistance(1, 'inches', 'meters'), 0.0254));
  it('1 yard = 0.9144 m', () => close(convertDistance(1, 'yards', 'meters'), 0.9144));
  it('100 m → yards ≈ 109.361', () => close(convertDistance(100, 'meters', 'yards'), 109.361, 1e-3));
});

describe('convertWeight — references', () => {
  it('1 grain = 0.06479891 g', () => close(convertWeight(1, 'grains', 'grams'), 0.06479891));
  it('1 lb = 7000 grains', () => close(convertWeight(1, 'lb', 'grains'), 7000, 1e-3));
  it('1 oz ≈ 28.3495 g', () => close(convertWeight(1, 'oz', 'grams'), 28.3495, 1e-3));
});

describe('convertEnergy — references', () => {
  it('1 ft·lbf ≈ 1.35582 J', () => close(convertEnergy(1, 'ftlbs', 'joules'), 1.35582, 1e-4));
  it('UK FAC limit: 12 ft·lb ≈ 16.27 J', () => close(convertEnergy(12, 'ftlbs', 'joules'), 16.27, 0.01));
  it('round-trips J ↔ ft·lbf', () => {
    close(convertEnergy(convertEnergy(123.45, 'joules', 'ftlbs'), 'ftlbs', 'joules'), 123.45, 1e-9);
  });
});

describe('convertPressure — references', () => {
  it('1 bar = 100000 Pa', () => close(convertPressure(1, 'bar', 'pa'), 100000));
  it('1 atm = 101325 Pa', () => close(convertPressure(1, 'atm', 'pa'), 101325));
  it('1 bar ≈ 14.5038 psi', () => close(convertPressure(1, 'bar', 'psi'), 14.5038, 1e-3));
  it('1013.25 hPa ≈ 1 atm', () => close(convertPressure(1013.25, 'hpa', 'atm'), 1, 1e-4));
});

describe('convertTemperature — non-linear', () => {
  it('0 °C = 32 °F', () => close(convertTemperature(0, 'celsius', 'fahrenheit'), 32));
  it('100 °C = 212 °F', () => close(convertTemperature(100, 'celsius', 'fahrenheit'), 212));
  it('0 °C = 273.15 K', () => close(convertTemperature(0, 'celsius', 'kelvin'), 273.15));
  it('round-trips °C ↔ °F ↔ K', () => {
    const c = -12.5;
    const f = convertTemperature(c, 'celsius', 'fahrenheit');
    const k = convertTemperature(f, 'fahrenheit', 'kelvin');
    close(convertTemperature(k, 'kelvin', 'celsius'), c, 1e-9);
  });
});

describe('convertAngle — angular references', () => {
  it('1 MRAD = 3.43775 MOA (within 1e-4)', () => {
    close(convertAngle(1, 'mrad', 'moa'), 3.43775, 1e-4);
  });
  it('1 MOA ≈ 0.290888 MRAD', () => close(convertAngle(1, 'moa', 'mrad'), 0.290888, 1e-5));
  it('360° = 1 full circle', () => close(convertAngle(360, 'degrees', 'circle'), 1));
  it('clicks_moa → MOA uses 0.25 default click value', () => {
    close(convertAngle(4, 'clicks_moa', 'moa'), 1);
    close(convertAngle(8, 'clicks_moa', 'moa', 0.125), 1);
  });
});

describe('convertPower — special-case dBm', () => {
  it('30 dBm = 1 W', () => close(convertPower(30, 'dBm', 'watt'), 1, 1e-9));
  it('1 W = 30 dBm', () => close(convertPower(1, 'watt', 'dBm'), 30, 1e-9));
  it('1 hp ≈ 745.7 W', () => close(convertPower(1, 'hp', 'watt'), 745.7, 0.5));
});

describe('convertForce — references', () => {
  it('1 kgf = 9.80665 N', () => close(convertForce(1, 'kgf', 'newton'), 9.80665));
  it('1 lbf ≈ 4.4482 N', () => close(convertForce(1, 'lbf', 'newton'), 4.4482, 1e-3));
});

describe('convertArea / convertVolume — references', () => {
  it('1 hectare = 10000 m²', () => close(convertArea(1, 'hectare', 'm2'), 10000));
  it('1 in² ≈ 6.4516 cm²', () => close(convertArea(1, 'in2', 'cm2'), 6.4516, 1e-4));
  it('1 L = 1000 ml', () => close(convertVolume(1, 'liter', 'ml'), 1000));
  it('1 gal_us ≈ 3.7854 L', () => close(convertVolume(1, 'gal_us', 'liter'), 3.7854, 1e-3));
});

describe('calcMuzzleEnergy — physical sanity', () => {
  it('matches ½ m v² for a 18 gr pellet at 280 m/s (~45.7 J)', () => {
    const { joules, ftlbs } = calcMuzzleEnergy(280, 18);
    close(joules, 45.74, 0.05);
    close(ftlbs, 33.74, 0.05);
  });

  it('rounds to 2 decimal places', () => {
    const { joules } = calcMuzzleEnergy(280.123, 18.456);
    expect(Number.isInteger(joules * 100)).toBe(true);
  });
});
