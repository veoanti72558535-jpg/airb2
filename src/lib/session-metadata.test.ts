import { describe, it, expect } from 'vitest';
import { buildSessionMetadata } from './session-metadata';
import { LEGACY_PROFILE, MERO_PROFILE } from './ballistics/profiles';
import { ENGINE_VERSION } from './ballistics/types';
import type { BallisticInput, WeatherSnapshot } from './types';

const baseWeather: WeatherSnapshot = {
  temperature: 15,
  humidity: 0,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: '',
};

const baseInput: BallisticInput = {
  muzzleVelocity: 280,
  bc: 0.025,
  projectileWeight: 18,
  sightHeight: 40,
  zeroRange: 30,
  maxRange: 100,
  rangeStep: 10,
  weather: baseWeather,
};

describe('buildSessionMetadata — legacy default', () => {
  it('falls back to legacy profile when no engineConfig is set', () => {
    const md = buildSessionMetadata(baseInput, '2025-01-01T00:00:00.000Z');
    expect(md.profileId).toBe('legacy');
    expect(md.cdProvenance).toBe('legacy-piecewise');
    expect(md.engineMetadata.integrator).toBe('euler');
    expect(md.engineMetadata.atmosphereModel).toBe('icao-simple');
    expect(md.engineMetadata.dt).toBe(LEGACY_PROFILE.config.dt);
    expect(md.engineVersion).toBe(ENGINE_VERSION);
    expect(md.calculatedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('records dragLawEffective as G1 when dragModel is unset', () => {
    const md = buildSessionMetadata(baseInput);
    expect(md.dragLawEffective).toBe('G1');
  });

  it('records the explicit dragModel when provided', () => {
    const md = buildSessionMetadata({ ...baseInput, dragModel: 'G7' });
    expect(md.dragLawEffective).toBe('G7');
  });
});

describe('buildSessionMetadata — P3.2 new fields', () => {
  it('always marks new saves as frozen, never inferred', () => {
    const md = buildSessionMetadata(baseInput);
    expect(md.calculatedAtSource).toBe('frozen');
    expect(md.metadataInferred).toBe(false);
  });

  it('captures the requested drag law alongside the effective one', () => {
    const md = buildSessionMetadata({ ...baseInput, dragModel: 'G7' });
    expect(md.dragLawRequested).toBe('G7');
    expect(md.dragLawEffective).toBe('G7');
  });
});

describe('buildSessionMetadata — explicit profileId resolution (P3.2)', () => {
  it('uses the profileId field on engineConfig when present (legacy)', () => {
    const md = buildSessionMetadata(
      { ...baseInput, engineConfig: LEGACY_PROFILE.config },
      '2025-01-01T00:00:00.000Z',
    );
    expect(md.profileId).toBe('legacy');
  });

  it('records mero when MERO config is used (explicit profileId)', () => {
    const md = buildSessionMetadata(
      { ...baseInput, engineConfig: MERO_PROFILE.config },
      '2025-01-01T00:00:00.000Z',
    );
    expect(md.profileId).toBe('mero');
    expect(md.cdProvenance).toBe('derived-p2');
  });

  it('trusts the explicit profileId even when shape would suggest otherwise', () => {
    const tricky = { ...LEGACY_PROFILE.config, profileId: 'mero' as const };
    const md = buildSessionMetadata({ ...baseInput, engineConfig: tricky });
    expect(md.profileId).toBe('mero');
  });

  it('falls back to structural matching when profileId is absent (rétrocompat)', () => {
    const { profileId: _omit, ...rest } = LEGACY_PROFILE.config;
    const meroShape = {
      ...rest,
      integrator: MERO_PROFILE.config.integrator,
      atmosphereModel: MERO_PROFILE.config.atmosphereModel,
      dt: MERO_PROFILE.config.dt,
    };
    const md = buildSessionMetadata({ ...baseInput, engineConfig: meroShape });
    expect(md.profileId).toBe('mero');
  });
});

describe('buildSessionMetadata — MERO opt-in', () => {
  it('flags profileId=mero and cdProvenance=derived-p2 when MERO config is passed', () => {
    const md = buildSessionMetadata(
      { ...baseInput, engineConfig: MERO_PROFILE.config },
      '2025-01-01T00:00:00.000Z',
    );
    expect(md.profileId).toBe('mero');
    expect(md.cdProvenance).toBe('derived-p2');
    expect(md.engineMetadata.integrator).toBe('trapezoidal');
    expect(md.engineMetadata.atmosphereModel).toBe('tetens-full');
    expect(md.engineMetadata.dt).toBe(MERO_PROFILE.config.dt);
  });
});

describe('buildSessionMetadata — purity', () => {
  it('does not mutate the input', () => {
    const snap = JSON.parse(JSON.stringify(baseInput));
    buildSessionMetadata(baseInput);
    expect(baseInput).toEqual(snap);
  });

  it('returns a fresh object each call', () => {
    const a = buildSessionMetadata(baseInput);
    const b = buildSessionMetadata(baseInput);
    expect(a).not.toBe(b);
    expect(a.engineMetadata).not.toBe(b.engineMetadata);
  });
});
