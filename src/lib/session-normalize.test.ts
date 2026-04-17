import { describe, it, expect } from 'vitest';
import { normalizeSession, normalizeSessionOpt, defaultWeatherSnapshot } from './session-normalize';
import type { Session } from './types';

// Minimal "legacy" session — only the strictly required identity fields. This
// is roughly the shape that early builds wrote to localStorage before the
// weather snapshot, drag model and zeroing weather features landed.
const legacy = {
  id: 'sess-1',
  name: 'Legacy session',
  // Note: tags missing, favorite missing, results missing
  input: {
    muzzleVelocity: 280,
    bc: 0.025,
    projectileWeight: 18,
    sightHeight: 40,
    zeroRange: 30,
    maxRange: 100,
    rangeStep: 10,
    weather: undefined as any, // simulate the very-old "no weather" layout
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
} as unknown as Session;

describe('normalizeSession — legacy fallbacks', () => {
  it('fills missing tags with [], favorite with false, results with []', () => {
    const out = normalizeSession(legacy);
    expect(out.tags).toEqual([]);
    expect(out.favorite).toBe(false);
    expect(out.results).toEqual([]);
  });

  it('fills missing weather with the ICAO standard snapshot', () => {
    const out = normalizeSession(legacy);
    expect(out.input.weather).toEqual(defaultWeatherSnapshot());
  });

  it('fills missing dragModel with G1 and missing focalPlane with FFP', () => {
    const out = normalizeSession(legacy);
    expect(out.input.dragModel).toBe('G1');
    expect(out.input.focalPlane).toBe('FFP');
  });

  it('does not fabricate physics values that were stored', () => {
    const out = normalizeSession(legacy);
    expect(out.input.muzzleVelocity).toBe(280);
    expect(out.input.bc).toBe(0.025);
    expect(out.input.projectileWeight).toBe(18);
  });

  it('is idempotent — normalising twice yields the same shape', () => {
    const once = normalizeSession(legacy);
    const twice = normalizeSession(once);
    expect(twice).toEqual(once);
  });

  it('does not mutate the input session', () => {
    const snap = JSON.parse(JSON.stringify(legacy));
    normalizeSession(legacy);
    expect(legacy).toEqual(snap);
  });
});

describe('normalizeSession — partial weather', () => {
  it('fills missing weather fields without overwriting present ones', () => {
    const partial: Session = {
      ...legacy,
      input: {
        ...legacy.input,
        weather: { temperature: 22, pressure: 1000 } as any,
      },
    } as Session;
    const out = normalizeSession(partial);
    expect(out.input.weather.temperature).toBe(22);
    expect(out.input.weather.pressure).toBe(1000);
    // Missing fields take the standard defaults.
    expect(out.input.weather.windSpeed).toBe(0);
    expect(out.input.weather.windAngle).toBe(0);
    expect(out.input.weather.source).toBe('manual');
  });
});

describe('normalizeSession — invalid range fields', () => {
  it('replaces non-positive rangeStep / maxRange with safe defaults', () => {
    const broken: Session = {
      ...legacy,
      input: { ...legacy.input, rangeStep: 0, maxRange: -10 },
    } as Session;
    const out = normalizeSession(broken);
    expect(out.input.rangeStep).toBe(10);
    expect(out.input.maxRange).toBe(50);
  });
});

describe('normalizeSessionOpt', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeSessionOpt(undefined)).toBeUndefined();
  });
  it('normalises like normalizeSession otherwise', () => {
    expect(normalizeSessionOpt(legacy)?.tags).toEqual([]);
  });
});
