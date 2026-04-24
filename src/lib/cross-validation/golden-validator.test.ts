/**
 * Tests for the golden validator orchestrator.
 *
 * We exercise:
 *  - the in-memory path (no filesystem dependency, deterministic),
 *  - tolerance overrides (loose vs tight) flipping a case PASS↔FAIL,
 *  - BASELINE behavior when no oracle is supplied,
 *  - aggregation logic (worst status wins),
 *  - the fixture-discovery path (skipped if root absent — covered by
 *    the existing fixture under src/lib/__fixtures__/cross-validation).
 */

import { describe, expect, it } from 'vitest';
import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticInput, WeatherSnapshot } from '@/lib/types';

import {
  validateGoldenCases,
  validateInMemoryCase,
  type InMemoryGoldenCase,
} from './golden-validator';

const STD_WEATHER: WeatherSnapshot = {
  temperature: 15,
  humidity: 50,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: '',
};

const SAMPLE_INPUT: BallisticInput = {
  muzzleVelocity: 280,
  bc: 0.025,
  projectileWeight: 18,
  sightHeight: 40,
  zeroRange: 30,
  maxRange: 60,
  rangeStep: 10,
  dragModel: 'G1',
  weather: STD_WEATHER,
};

/** Build an oracle that exactly matches the engine — should always PASS. */
function exactOracle(): { range: number; drop: number; velocity: number }[] {
  const rows = calculateTrajectory(SAMPLE_INPUT);
  return rows
    .filter((r) => r.range === 10 || r.range === 30 || r.range === 50)
    .map((r) => ({ range: r.range, drop: r.drop, velocity: r.velocity }));
}

describe('golden-validator — in-memory path', () => {
  it('returns BASELINE when no oracle is supplied', () => {
    const cs: InMemoryGoldenCase = { id: 'baseline-only', input: SAMPLE_INPUT };
    const report = validateGoldenCases({
      skipFixtureDiscovery: true,
      inMemoryCases: [cs],
    });
    expect(report.totals).toMatchObject({ cases: 1, baseline: 1, pass: 0, fail: 0 });
    expect(report.cases[0].status).toBe('BASELINE');
    expect(report.cases[0].engineRows.length).toBeGreaterThan(0);
    expect(report.cases[0].comparisons).toEqual([]);
  });

  it('returns PASS when the synthetic oracle matches the engine within default tolerances', () => {
    const cs: InMemoryGoldenCase = {
      id: 'exact-match',
      input: SAMPLE_INPUT,
      expectedRows: exactOracle(),
    };
    const report = validateGoldenCases({
      skipFixtureDiscovery: true,
      inMemoryCases: [cs],
    });
    expect(report.cases[0].status).toBe('PASS');
    expect(report.totals.pass).toBe(1);
    expect(report.overallStatus).toBe('PASS');
  });

  it('flips PASS → FAIL when tolerances are tightened beyond engine precision', () => {
    // Build oracle with tiny synthetic drift on drop (~0.5 mm).
    const oracle = exactOracle().map((r) => ({ ...r, drop: r.drop + 0.5 }));
    const cs: InMemoryGoldenCase = { id: 'jitter', input: SAMPLE_INPUT, expectedRows: oracle };

    const loose = validateGoldenCases({
      skipFixtureDiscovery: true,
      inMemoryCases: [cs],
      // default drop tolerance = 5 mm absolute → 0.5 mm passes
    });
    expect(loose.cases[0].status).toBe('PASS');

    const tight = validateGoldenCases({
      skipFixtureDiscovery: true,
      inMemoryCases: [cs],
      tolerances: { drop: { absThreshold: 0.1, relThreshold: 0.0001 } },
    });
    expect(tight.cases[0].status).toBe('FAIL');
    expect(tight.totals.fail).toBe(1);
    expect(tight.overallStatus).toBe('FAIL');
  });

  it('records worst |Δ| absolute deltas per metric', () => {
    const oracle = exactOracle().map((r) => ({ ...r, velocity: r.velocity + 1.0 }));
    const report = validateGoldenCases({
      skipFixtureDiscovery: true,
      inMemoryCases: [{ id: 'velocity-jitter', input: SAMPLE_INPUT, expectedRows: oracle }],
    });
    const c = report.cases[0];
    expect(c.worstAbsoluteDeltas.velocity).toBeGreaterThanOrEqual(0.999);
    expect(c.worstAbsoluteDeltas.velocity).toBeLessThanOrEqual(1.001);
  });

  it('aggregates overallStatus as worst status across cases', () => {
    const passOracle = exactOracle();
    const failOracle = exactOracle().map((r) => ({ ...r, drop: r.drop + 50 }));
    const report = validateGoldenCases({
      skipFixtureDiscovery: true,
      inMemoryCases: [
        { id: 'good', input: SAMPLE_INPUT, expectedRows: passOracle },
        { id: 'bad', input: SAMPLE_INPUT, expectedRows: failOracle },
      ],
    });
    expect(report.totals).toMatchObject({ cases: 2, pass: 1, fail: 1 });
    expect(report.overallStatus).toBe('FAIL');
  });

  it('exposes the fully resolved tolerance profile in the report', () => {
    const report = validateGoldenCases({
      skipFixtureDiscovery: true,
      inMemoryCases: [],
      tolerances: { drop: { absThreshold: 1, relThreshold: 0.01 } },
    });
    expect(report.toleranceProfile.drop.absThreshold).toBe(1);
    expect(report.toleranceProfile.drop.relThreshold).toBe(0.01);
    // unspecified metric falls back to default
    expect(report.toleranceProfile.velocity.absThreshold).toBe(3);
  });
});

describe('golden-validator — fixture discovery path', () => {
  it('discovers and runs the pilot cross-validation case from disk', () => {
    const report = validateGoldenCases({ inMemoryCases: [] });
    // The pilot case `case-22-pellet-18gr-270-zero30` exists and uses
    // synthetic auxiliary data → expected status is FAIL (intentionally,
    // it is a pipeline bootstrap and NOT a real oracle).
    const pilot = report.cases.find(
      (c) => c.caseId === 'case-22-pellet-18gr-270-zero30',
    );
    expect(pilot).toBeDefined();
    expect(pilot!.source).toBe('cross-validation-fixture');
    expect(['FAIL', 'INDICATIVE']).toContain(pilot!.status);
    expect(pilot!.engineRows.length).toBeGreaterThan(10);
    expect(pilot!.comparisons[0].metricSummaries.length).toBeGreaterThan(0);
  });
});

describe('validateInMemoryCase — direct call', () => {
  it('runs the engine and returns BASELINE without oracle', () => {
    const r = validateInMemoryCase({ id: 'direct', input: SAMPLE_INPUT });
    expect(r.status).toBe('BASELINE');
    expect(r.source).toBe('in-memory');
    expect(r.engineRows[0].range).toBe(0);
  });
});