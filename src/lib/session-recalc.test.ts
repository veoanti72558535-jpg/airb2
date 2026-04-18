/**
 * Tranche C — session-recalc invariants.
 *
 * Pure unit tests. No DOM, no React. They lock the contract:
 *  1. Recalc returns a NEW draft with `derivedFromSessionId = source.id`.
 *  2. The source object is never mutated.
 *  3. Metadata is freshly frozen (`metadataInferred: false`).
 *  4. Suffix composition is stable and collision-aware.
 */

import { describe, it, expect } from 'vitest';
import { buildRecalcPayload, composeRecalcName } from './session-recalc';
import type { Session } from './types';

function makeSource(overrides: Partial<Session> = {}): Session {
  return {
    id: 'src-1',
    name: 'My Setup',
    airgunId: 'a-1',
    projectileId: 'p-1',
    opticId: 'o-1',
    tuneId: 't-1',
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 100,
      rangeStep: 10,
      weather: {
        temperature: 15, humidity: 50, pressure: 1013.25,
        altitude: 0, windSpeed: 0, windAngle: 0,
        source: 'manual', timestamp: '',
      },
      dragModel: 'G1',
    },
    results: [{
      range: 0, drop: 0, holdover: 0, holdoverMRAD: 0,
      velocity: 280, energy: 0, tof: 0,
      windDrift: 0, windDriftMOA: 0, windDriftMRAD: 0,
    }],
    tags: ['hunting'],
    favorite: true,
    notes: 'Field test',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    profileId: 'legacy',
    cdProvenance: 'legacy-piecewise',
    dragLawEffective: 'G1',
    dragLawRequested: 'G1',
    calculatedAt: '2026-01-01T00:00:00Z',
    calculatedAtSource: 'frozen',
    metadataInferred: false,
    engineVersion: 1,
    engineMetadata: { integrator: 'euler', atmosphereModel: 'icao-simple', dt: 0.0005 },
    ...overrides,
  };
}

describe('buildRecalcPayload — never mutates source', () => {
  it('returns a draft pointing back to the source via derivedFromSessionId', () => {
    const source = makeSource();
    const { draft } = buildRecalcPayload(source, 'My Setup (recalculée)');
    expect(draft.derivedFromSessionId).toBe('src-1');
  });

  it('does NOT mutate the source object', () => {
    const source = makeSource();
    const snapshot = JSON.parse(JSON.stringify(source));
    buildRecalcPayload(source, 'whatever');
    expect(source).toEqual(snapshot);
  });

  it('always freezes fresh metadata (not inferred)', () => {
    const source = makeSource({ metadataInferred: true });
    const { draft } = buildRecalcPayload(source, 'copy', '2026-04-18T10:00:00Z');
    expect(draft.metadataInferred).toBe(false);
    expect(draft.calculatedAtSource).toBe('frozen');
    expect(draft.calculatedAt).toBe('2026-04-18T10:00:00Z');
  });

  it('clears favorite on the copy and copies tags by value', () => {
    const source = makeSource({ favorite: true, tags: ['a', 'b'] });
    const { draft } = buildRecalcPayload(source, 'copy');
    expect(draft.favorite).toBe(false);
    expect(draft.tags).toEqual(['a', 'b']);
    expect(draft.tags).not.toBe(source.tags); // fresh array
  });

  it('keeps entity links from the source', () => {
    const source = makeSource();
    const { draft } = buildRecalcPayload(source, 'copy');
    expect(draft.airgunId).toBe('a-1');
    expect(draft.projectileId).toBe('p-1');
    expect(draft.opticId).toBe('o-1');
    expect(draft.tuneId).toBe('t-1');
  });

  it('produces a non-empty results array (engine actually ran)', () => {
    const source = makeSource();
    const { draft } = buildRecalcPayload(source, 'copy');
    expect(Array.isArray(draft.results)).toBe(true);
    expect(draft.results.length).toBeGreaterThan(0);
  });
});

describe('composeRecalcName', () => {
  it('appends the suffix when the name is free', () => {
    expect(composeRecalcName('Setup', '(recalculated)', [])).toBe('Setup (recalculated)');
  });

  it('disambiguates with a numeric counter when the suffixed name already exists', () => {
    expect(
      composeRecalcName('Setup', '(recalculated)', ['Setup (recalculated)']),
    ).toBe('Setup (recalculated) (2)');
  });

  it('keeps incrementing past existing counters', () => {
    expect(
      composeRecalcName('Setup', '(recalculated)', [
        'Setup (recalculated)',
        'Setup (recalculated) (2)',
        'Setup (recalculated) (3)',
      ]),
    ).toBe('Setup (recalculated) (4)');
  });

  it('trims surrounding whitespace on the original name', () => {
    expect(composeRecalcName('  Setup  ', '(rec)', [])).toBe('Setup (rec)');
  });
});
