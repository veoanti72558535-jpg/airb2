/**
 * Truth-set — P1 foundation.
 *
 * Curated set of trajectories whose expected values are agreed upon by at
 * least two independent references (MERO, JBM, StrelokPro, ChairGun) and
 * that the engine MUST stay close to within a defined tolerance. Adding a
 * row here is a deliberate act: every entry must cite its sources.
 *
 * P1 ships an INITIAL set of 5 setups. P2 will grow this to ≥15 once the
 * MERO + JBM cross-check spreadsheets have been digested. The accompanying
 * test (`truth-set.test.ts`) treats P1 entries as smoke checks against the
 * legacy engine itself (tolerance ±5%) — the goal is to lock the current
 * engine's outputs as a snapshot so later phases can detect any drift.
 *
 * IMPORTANT: tolerance in P1 is intentionally loose (5%). P2 tightens it
 * to ±2% once the MERO Cd tables ship and the legacy piecewise Cd is
 * superseded.
 */

import type { BallisticInput } from '../types';

export interface TruthSetEntry {
  id: string;
  /** Short human description. */
  description: string;
  /** Provenance — MERO, JBM, StrelokPro, ChairGun, manual chrono… */
  sources: string[];
  input: BallisticInput;
  /**
   * Expected results at specific ranges. Only the fields we want to assert
   * are listed — everything else is ignored by the test runner.
   */
  expected: Array<{
    range: number;
    /** Drop in mm relative to line of sight. */
    drop?: number;
    /** Velocity in m/s. */
    velocity?: number;
  }>;
  /**
   * Per-entry tolerance overrides (fractions). Falls back to the suite
   * default when omitted.
   */
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

/**
 * P1 initial truth-set — 5 entries.
 *
 * Each entry's expected values were captured from the current engine itself
 * during the P1 cut-over. They serve as a freeze: any future change that
 * shifts these numbers more than the tolerance must be reviewed explicitly.
 */
export const TRUTH_SET: TruthSetEntry[] = [
  {
    id: '22-jsb-18gr-280-zero30',
    description: '.22 JSB Exact Jumbo 18.13 gr, MV 280 m/s, BC 0.025 G1, zero 30 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 40,
      zeroRange: 30,
      maxRange: 100,
      rangeStep: 10,
      weather: STD_WEATHER,
      dragModel: 'G1',
    },
    expected: [
      { range: 30, drop: 0 },
      { range: 50, velocity: 246 }, // approximate cross-check vs JBM
    ],
    tolerance: { drop: 0.05, velocity: 0.05 },
  },
  {
    id: '177-jsb-844gr-300-zero25',
    description: '.177 JSB Exact 8.44 gr, MV 300 m/s, BC 0.021 G1, zero 25 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 300,
      bc: 0.021,
      projectileWeight: 8.44,
      sightHeight: 40,
      zeroRange: 25,
      maxRange: 75,
      rangeStep: 5,
      weather: STD_WEATHER,
      dragModel: 'G1',
    },
    expected: [{ range: 25, drop: 0 }],
    tolerance: { drop: 0.05 },
  },
  {
    id: '25-nsa-44gr-260-zero50',
    description: '.25 NSA slug 44 gr, MV 260 m/s, BC 0.080 G7, zero 50 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 260,
      bc: 0.08,
      projectileWeight: 44,
      sightHeight: 50,
      zeroRange: 50,
      maxRange: 150,
      rangeStep: 10,
      weather: STD_WEATHER,
      dragModel: 'G7',
    },
    expected: [{ range: 50, drop: 0 }],
    tolerance: { drop: 0.05 },
  },
  {
    id: '22-hades-1589gr-260-zero30',
    description: '.22 JSB Hades 15.89 gr, MV 260 m/s, BC 0.022 G1, zero 30 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 260,
      bc: 0.022,
      projectileWeight: 15.89,
      sightHeight: 40,
      zeroRange: 30,
      maxRange: 80,
      rangeStep: 10,
      weather: STD_WEATHER,
      dragModel: 'G1',
    },
    expected: [{ range: 30, drop: 0 }],
    tolerance: { drop: 0.05 },
  },
  {
    id: '177-bb-525gr-200-zero20',
    description: '.177 BB sphere 5.25 gr, MV 200 m/s, BC 0.010 GS, zero 20 m',
    sources: ['legacy-engine-snapshot-p1'],
    input: {
      muzzleVelocity: 200,
      bc: 0.01,
      projectileWeight: 5.25,
      sightHeight: 40,
      zeroRange: 20,
      maxRange: 50,
      rangeStep: 5,
      weather: STD_WEATHER,
      dragModel: 'GS',
    },
    expected: [{ range: 20, drop: 0 }],
    tolerance: { drop: 0.05 },
  },
];

/** Default tolerance fractions when an entry doesn't override them. */
export const DEFAULT_TOLERANCE = { drop: 0.05, velocity: 0.05 };
