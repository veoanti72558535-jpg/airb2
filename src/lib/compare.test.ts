/**
 * Tests for the centralised comparison logic.
 *
 * We intentionally avoid touching the storage layer (`resolveSession` reads
 * from localStorage) — every test here builds two `Session` literals so the
 * suite stays deterministic and DOES NOT depend on test ordering or any
 * `beforeEach` reseed.
 */

import { describe, it, expect } from 'vitest';
import {
  buildComparisonRows,
  defaultRange,
  diffSessions,
  exportComparisonCsv,
  exportComparisonJson,
  exportSessionCsv,
  exportSessionJson,
  safeFilename,
  summariseWeather,
} from './compare';
import type { BallisticResult, Session, WeatherSnapshot } from './types';

const stdWeather: WeatherSnapshot = {
  temperature: 15, humidity: 50, pressure: 1013.25, altitude: 0,
  windSpeed: 0, windAngle: 0, source: 'manual', timestamp: '',
};

function row(range: number, drop: number, vel = 280, energy = 30): BallisticResult {
  return {
    range, drop, holdover: 0, holdoverMRAD: 0,
    velocity: vel, energy, tof: range / vel,
    windDrift: 0, windDriftMOA: 0, windDriftMRAD: 0,
  };
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 's',
    name: 'Test session',
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18,
      sightHeight: 40, zeroRange: 30, maxRange: 100, rangeStep: 10,
      weather: stdWeather,
    },
    results: [row(0, -40), row(50, -20), row(100, -120)],
    tags: [], favorite: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── diffSessions ────────────────────────────────────────────────────────────

describe('diffSessions — equality semantics', () => {
  it('marks every comparable input field as same when sessions are identical', () => {
    const a = session();
    const b = session({ id: 'b' });
    const diff = diffSessions(a, b);
    // Every entry that has a value on both sides should be marked same.
    const numericEntries = diff.filter(d => d.a != null && d.b != null);
    expect(numericEntries.every(d => d.same)).toBe(true);
  });

  it('flags muzzleVelocity, bc and dragModel when they differ', () => {
    const a = session();
    const b = session({
      id: 'b',
      input: { ...a.input, muzzleVelocity: 290, bc: 0.030, dragModel: 'G7' },
    });
    const diff = diffSessions(a, b);
    const byKey = (k: string) => diff.find(d => d.labelKey === k);
    expect(byKey('compare.fieldMuzzleVelocity')!.same).toBe(false);
    expect(byKey('compare.fieldBc')!.same).toBe(false);
    expect(byKey('compare.fieldDragModel')!.same).toBe(false);
  });

  it('treats missing dragModel as G1 on both sides (legacy compatibility)', () => {
    const a = session();
    const b = session({ id: 'b', input: { ...session().input, dragModel: 'G1' } });
    const diff = diffSessions(a, b);
    expect(diff.find(d => d.labelKey === 'compare.fieldDragModel')!.same).toBe(true);
  });

  it('flags zeroWeather presence as a difference when only one side uses it', () => {
    const a = session();
    const b = session({
      id: 'b',
      input: { ...session().input, zeroWeather: stdWeather },
    });
    const diff = diffSessions(a, b);
    expect(diff.find(d => d.labelKey === 'compare.fieldZeroWeather')!.same).toBe(false);
  });

  it('detects weather field differences (temperature, wind)', () => {
    const a = session();
    const b = session({
      id: 'b',
      input: { ...a.input, weather: { ...stdWeather, temperature: 5, windSpeed: 4 } },
    });
    const diff = diffSessions(a, b);
    expect(diff.find(d => d.labelKey === 'compare.fieldTemperature')!.same).toBe(false);
    expect(diff.find(d => d.labelKey === 'compare.fieldWindSpeed')!.same).toBe(false);
    expect(diff.find(d => d.labelKey === 'compare.fieldPressure')!.same).toBe(true);
  });
});

// ── buildComparisonRows ─────────────────────────────────────────────────────

describe('buildComparisonRows — alignment', () => {
  it('produces a row per grid point regardless of session step sizes', () => {
    const a = session();
    const b = session({
      id: 'b',
      results: [row(0, -40), row(25, -10), row(75, -55), row(100, -125)],
      input: { ...session().input, rangeStep: 25 },
    });
    const rows = buildComparisonRows(a, b, { start: 0, end: 100, step: 50 });
    expect(rows.map(r => r.range)).toEqual([0, 50, 100]);
    expect(rows[0].a).toBeDefined();
    expect(rows[0].b).toBeDefined();
  });

  it('returns undefined for sides with no result inside tolerance', () => {
    const a = session({ results: [row(0, -40), row(100, -120)] });
    const b = session({ id: 'b', results: [row(0, -40), row(100, -120)] });
    // Step of 10 with tolerance 5: only 0 and 100 should align; 50 should be undefined.
    const rows = buildComparisonRows(a, b, { start: 0, end: 100, step: 10, tolerance: 2 });
    const at50 = rows.find(r => r.range === 50)!;
    expect(at50.a).toBeUndefined();
    expect(at50.b).toBeUndefined();
    expect(rows.find(r => r.range === 0)!.a).toBeDefined();
    expect(rows.find(r => r.range === 100)!.a).toBeDefined();
  });

  it('handles sessions with no results gracefully (all rows undefined)', () => {
    const a = session({ results: [] });
    const b = session({ id: 'b', results: [] });
    const rows = buildComparisonRows(a, b, { start: 0, end: 50, step: 25 });
    expect(rows).toHaveLength(3);
    expect(rows.every(r => r.a === undefined && r.b === undefined)).toBe(true);
  });
});

// ── defaultRange ────────────────────────────────────────────────────────────

describe('defaultRange', () => {
  it('uses the larger of the two maxRange and the smaller of the two steps', () => {
    const a = session({ input: { ...session().input, maxRange: 80, rangeStep: 20 } });
    const b = session({ id: 'b', input: { ...session().input, maxRange: 150, rangeStep: 10 } });
    const r = defaultRange(a, b);
    expect(r.start).toBe(0);
    expect(r.end).toBe(150);
    expect(r.step).toBe(10);
  });

  it('clamps step to a minimum of 5 m to keep tables readable', () => {
    const a = session({ input: { ...session().input, rangeStep: 1 } });
    const b = session({ id: 'b', input: { ...session().input, rangeStep: 1 } });
    expect(defaultRange(a, b).step).toBe(5);
  });
});

// ── Exports ─────────────────────────────────────────────────────────────────

describe('exportSessionCsv', () => {
  it('emits a header line plus one row per result, with metadata comments', () => {
    const csv = exportSessionCsv(session());
    expect(csv).toContain('# session,Test session');
    expect(csv).toContain('range,drop,holdover');
    // 3 result rows on the standard fixture
    const dataLines = csv.split('\n').filter(l => /^\d/.test(l));
    expect(dataLines).toHaveLength(3);
  });
});

describe('exportSessionJson', () => {
  it('wraps the session under kind/version envelope so importers can branch on it', () => {
    const obj = JSON.parse(exportSessionJson(session()));
    expect(obj.kind).toBe('airballistik.session');
    expect(obj.version).toBe(1);
    expect(obj.session.id).toBe('s');
  });
});

describe('exportComparisonCsv', () => {
  it('contains both session names in metadata and one data row per range', () => {
    const a = session({ name: 'Alpha' });
    const b = session({ id: 'b', name: 'Bravo' });
    const rows = buildComparisonRows(a, b, { start: 0, end: 100, step: 50 });
    const csv = exportComparisonCsv(a, b, rows);
    expect(csv).toContain('# A,Alpha');
    expect(csv).toContain('# B,Bravo');
    expect(csv).toContain('range_m,A_drop_mm,B_drop_mm,delta_drop_mm');
    const dataLines = csv.split('\n').filter(l => /^\d/.test(l));
    expect(dataLines).toHaveLength(3);
  });

  it('emits empty deltas when one side is missing data at a range', () => {
    const a = session({ results: [row(0, -40), row(100, -120)] });
    const b = session({ id: 'b', results: [row(0, -40)] });
    const rows = buildComparisonRows(a, b, { start: 0, end: 100, step: 100, tolerance: 1 });
    const csv = exportComparisonCsv(a, b, rows);
    const last = csv.trim().split('\n').pop()!;
    // At 100m, B has no value → drop columns for B and delta should be empty.
    const cols = last.split(',');
    // Layout: range, A_drop, B_drop, delta_drop, ...
    expect(cols[0]).toBe('100');
    expect(cols[1]).toBe('-120');
    expect(cols[2]).toBe('');
    expect(cols[3]).toBe('');
  });
});

describe('exportComparisonJson', () => {
  it('strips identical diff entries from the output (only meaningful changes)', () => {
    const a = session();
    const b = session({ id: 'b', input: { ...session().input, muzzleVelocity: 300 } });
    const diff = diffSessions(a, b);
    const rows = buildComparisonRows(a, b, { start: 0, end: 50, step: 50 });
    const obj = JSON.parse(exportComparisonJson(a, b, rows, diff));
    expect(obj.kind).toBe('airballistik.comparison');
    // Only the differing field(s) should appear.
    expect(obj.diff.every((d: any) => !d.same)).toBe(true);
    expect(obj.diff.some((d: any) => d.labelKey === 'compare.fieldMuzzleVelocity')).toBe(true);
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

describe('safeFilename', () => {
  it('strips unsafe characters and collapses runs of dashes', () => {
    expect(safeFilename('Hello World!')).toBe('Hello-World');
    expect(safeFilename('  ___ name //// here ')).toBe('___-name-here');
    expect(safeFilename('')).toBe('session');
  });
});

describe('summariseWeather', () => {
  it('returns undefined when weather is undefined', () => {
    expect(summariseWeather(undefined)).toBeUndefined();
  });
  it('formats T/P/H/wind into a compact string', () => {
    const s = summariseWeather(stdWeather)!;
    expect(s).toContain('°C');
    expect(s).toContain('hPa');
    expect(s).toContain('%');
    expect(s).toContain('m/s');
  });
});
