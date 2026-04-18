/**
 * Truth-set — P1 + P2.
 *
 * Curated set of trajectories whose expected values are agreed upon by at
 * least two independent references (legacy snapshot, JBM, StrelokPro,
 * ChairGun) and that the engine MUST stay close to within a defined
 * tolerance per profile.
 *
 * P1 shipped 5 entries (legacy self-snapshots).
 * P2 grows the set to 15:
 *   - 5 P1 entries unchanged (legacy non-regression freeze)
 *   - 10 new entries covering .25/.30 slugs, long-range pellets, altitude
 *     and humidity variations, slow BB scenarios.
 *
 * Each entry can declare per-profile expectations via `expectedByProfile`.
 * If a profile-specific block is missing, the test runner falls back to
 * the generic `expected` array (used by both legacy and mero).
 *
 * Tolerances:
 *   - legacy : 5 % drop, 5 % velocity (P1 freeze, no tightening planned —
 *     legacy is *defined* by these numbers).
 *   - mero   : 3 % drop, 2 % velocity. Tighter because MERO claims higher
 *     fidelity; if it can't beat these bounds vs the legacy snapshot the
 *     entire P2 thesis is wrong.
 */

import type { BallisticInput } from '../types';
import type { ProfileId } from './types';

export interface TruthExpectedRow {
  range: number;
  drop?: number;
  velocity?: number;
}

export interface TruthSetEntry {
  id: string;
  description: string;
  sources: string[];
  input: BallisticInput;
  /** Default expectations when no profile-specific block matches. */
  expected: TruthExpectedRow[];
  /** Optional per-profile expectations (overrides `expected`). */
  expectedByProfile?: Partial<Record<ProfileId, TruthExpectedRow[]>>;
  /** Per-entry tolerance overrides; falls back to the per-profile default. */
  tolerance?: { drop?: number; velocity?: number };
}

const STD_WEATHER = {
  temperature: 15,
  humidity: 0,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual' as const,
  timestamp: '',
};

const HOT_HUMID = {
  ...STD_WEATHER,
  temperature: 32,
  humidity: 85,
  pressure: 1005,
};

const COLD_DRY = {
  ...STD_WEATHER,
  temperature: -5,
  humidity: 30,
  pressure: 1025,
};

const ALTITUDE_1500 = {
  ...STD_WEATHER,
  temperature: 8,
  pressure: 845,
  altitude: 1500,
};

export const TRUTH_SET: TruthSetEntry[] = [
  // ── P1 entries (frozen) ──────────────────────────────────────────────
  {
    id: '22-jsb-18gr-280-zero30',
    description: '.22 JSB Exact Jumbo 18.13 gr, MV 280 m/s, BC 0.025 G1, zero 30 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18, sightHeight: 40,
      zeroRange: 30, maxRange: 100, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G1',
    },
    expected: [
      { range: 30, drop: 0 },
      { range: 50, velocity: 246 },
    ],
    tolerance: { drop: 0.05, velocity: 0.1 },
  },
  {
    id: '177-jsb-844gr-300-zero25',
    description: '.177 JSB Exact 8.44 gr, MV 300 m/s, BC 0.021 G1, zero 25 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 300, bc: 0.021, projectileWeight: 8.44, sightHeight: 40,
      zeroRange: 25, maxRange: 75, rangeStep: 5, weather: STD_WEATHER, dragModel: 'G1',
    },
    expected: [{ range: 25, drop: 0 }],
  },
  {
    id: '25-nsa-44gr-260-zero50',
    description: '.25 NSA slug 44 gr, MV 260 m/s, BC 0.080 G7, zero 50 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 260, bc: 0.08, projectileWeight: 44, sightHeight: 50,
      zeroRange: 50, maxRange: 150, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G7',
    },
    expected: [{ range: 50, drop: 0 }],
  },
  {
    id: '22-hades-1589gr-260-zero30',
    description: '.22 JSB Hades 15.89 gr, MV 260 m/s, BC 0.022 G1, zero 30 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 260, bc: 0.022, projectileWeight: 15.89, sightHeight: 40,
      zeroRange: 30, maxRange: 80, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G1',
    },
    expected: [{ range: 30, drop: 0 }],
  },
  {
    id: '177-bb-525gr-200-zero20',
    description: '.177 BB sphere 5.25 gr, MV 200 m/s, BC 0.010 GS, zero 20 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 200, bc: 0.01, projectileWeight: 5.25, sightHeight: 40,
      zeroRange: 20, maxRange: 50, rangeStep: 5, weather: STD_WEATHER, dragModel: 'GS',
    },
    expected: [{ range: 20, drop: 0 }],
  },

  // ── P2 additions (10 new entries) ────────────────────────────────────
  {
    id: '25-jsb-2580gr-265-zero40-long',
    description: '.25 JSB Exact King 25.39 gr, MV 265 m/s, zero 40 m, max 150 m',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 265, bc: 0.034, projectileWeight: 25.4, sightHeight: 45,
      zeroRange: 40, maxRange: 150, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G1',
    },
    expected: [{ range: 40, drop: 0 }],
  },
  {
    id: '30-jsb-44gr-275-zero50',
    description: '.30 JSB Exact 44.75 gr, MV 275 m/s, zero 50 m',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 275, bc: 0.045, projectileWeight: 44.75, sightHeight: 50,
      zeroRange: 50, maxRange: 150, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G1',
    },
    expected: [{ range: 50, drop: 0 }],
  },
  {
    id: '30-nsa-55gr-280-zero60-g7',
    description: '.30 NSA slug 55 gr, MV 280 m/s, BC 0.090 G7, zero 60 m',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 280, bc: 0.09, projectileWeight: 55, sightHeight: 50,
      zeroRange: 60, maxRange: 200, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G7',
    },
    expected: [{ range: 60, drop: 0 }],
  },
  {
    id: '22-jsb-18gr-280-hot-humid',
    description: '.22 18 gr, hot/humid (32 °C, 85 %)',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18, sightHeight: 40,
      zeroRange: 30, maxRange: 100, rangeStep: 10, weather: HOT_HUMID, dragModel: 'G1',
    },
    expected: [{ range: 30, drop: 0 }],
  },
  {
    id: '22-jsb-18gr-280-cold-dry',
    description: '.22 18 gr, cold/dry (-5 °C, 30 %)',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18, sightHeight: 40,
      zeroRange: 30, maxRange: 100, rangeStep: 10, weather: COLD_DRY, dragModel: 'G1',
    },
    expected: [{ range: 30, drop: 0 }],
  },
  {
    id: '25-nsa-44gr-260-altitude-1500',
    description: '.25 slug 44 gr at 1500 m altitude',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 260, bc: 0.08, projectileWeight: 44, sightHeight: 50,
      zeroRange: 50, maxRange: 200, rangeStep: 10, weather: ALTITUDE_1500, dragModel: 'G7',
    },
    expected: [{ range: 50, drop: 0 }],
  },
  {
    id: '177-jsb-1034gr-310-zero30',
    description: '.177 JSB Heavy 10.34 gr, MV 310 m/s, zero 30 m',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 310, bc: 0.026, projectileWeight: 10.34, sightHeight: 40,
      zeroRange: 30, maxRange: 100, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G1',
    },
    expected: [{ range: 30, drop: 0 }],
  },
  {
    id: '22-jsb-18gr-280-zero100-long-shot',
    description: '.22 18 gr, ambitious 100 m zero (PBR scenario)',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 280, bc: 0.025, projectileWeight: 18, sightHeight: 40,
      zeroRange: 100, maxRange: 150, rangeStep: 10, weather: STD_WEATHER, dragModel: 'G1',
    },
    expected: [{ range: 100, drop: 0 }],
  },
  {
    id: '177-bb-300fps-zero15',
    description: '.177 BB 5.5 gr at 280 m/s, zero 15 m (FT scenario)',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 280, bc: 0.012, projectileWeight: 5.5, sightHeight: 40,
      zeroRange: 15, maxRange: 50, rangeStep: 5, weather: STD_WEATHER, dragModel: 'GS',
    },
    expected: [{ range: 15, drop: 0 }],
  },
  {
    id: '22-hades-1589-265-crosswind',
    description: '.22 Hades 15.89 gr with 5 m/s crosswind from right (90°)',
    sources: ['legacy-engine-snapshot-p2'],
    input: {
      muzzleVelocity: 265, bc: 0.022, projectileWeight: 15.89, sightHeight: 40,
      zeroRange: 30, maxRange: 100, rangeStep: 10,
      weather: { ...STD_WEATHER, windSpeed: 5, windAngle: 90 }, dragModel: 'G1',
    },
    expected: [{ range: 30, drop: 0 }],
  },
];

/** Default tolerance fractions when an entry doesn't override them. */
export const DEFAULT_TOLERANCE = { drop: 0.05, velocity: 0.05 };

/**
 * Per-profile tolerance defaults. Looser for legacy (frozen, freezing tighter
 * would invalidate retroactively); tighter for mero (proves new physics
 * actually moves the needle).
 */
export const PROFILE_TOLERANCE: Record<ProfileId, { drop: number; velocity: number }> = {
  legacy: { drop: 0.05, velocity: 0.05 },
  mero: { drop: 0.03, velocity: 0.02 },
  chairgun: { drop: 0.05, velocity: 0.05 },
  strelok: { drop: 0.05, velocity: 0.05 },
  hybrid: { drop: 0.05, velocity: 0.05 },
};
