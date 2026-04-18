/**
 * Golden snapshot tests — P3.2.
 *
 * Each fixture is fed to the legacy engine and 6 business metrics are
 * snapshotted. Drift = test red. This is the product-level non-regression
 * net that all subsequent P3 sub-phases rely on.
 *
 * What we snapshot:
 *  - drop (mm)
 *  - holdover (MOA)
 *  - holdoverMRAD
 *  - velocity (m/s)
 *  - energy (J)
 *  - windDrift (mm)
 *
 * We do NOT snapshot full BallisticResult objects because they include
 * spinDrift / clicks / reticle fields that are not always populated and
 * would create noisy diffs. The 6 chosen metrics cover the user-visible
 * trajectory shape.
 */

import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from '@/lib/ballistics';
import { GOLDEN_FIXTURES } from './fixtures';
import type { BallisticResult } from '@/lib/types';

interface SnapshotRow {
  range: number;
  drop: number;
  holdover: number;
  holdoverMRAD: number;
  velocity: number;
  energy: number;
  windDrift: number;
}

function pickMetrics(rows: BallisticResult[]): SnapshotRow[] {
  return rows.map((r) => ({
    range: r.range,
    drop: r.drop,
    holdover: r.holdover,
    holdoverMRAD: r.holdoverMRAD,
    velocity: r.velocity,
    energy: r.energy,
    windDrift: r.windDrift,
  }));
}

describe('golden fixtures — legacy profile snapshot contract', () => {
  for (const fx of GOLDEN_FIXTURES) {
    it(`${fx.id} :: ${fx.description}`, () => {
      const rows = calculateTrajectory(fx.input);
      const snap = pickMetrics(rows);
      // 6 metrics × N distances. Strict equality via snapshot.
      expect(snap).toMatchSnapshot();
    });
  }
});
