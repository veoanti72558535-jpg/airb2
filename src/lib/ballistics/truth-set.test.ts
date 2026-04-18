/**
 * Truth-set non-regression tests — P1.
 *
 * Goal: lock the current engine outputs so any future physics change
 * (P2 trapezoidal, P3 vector wind, etc.) makes a deliberate, reviewable
 * delta instead of a silent drift.
 *
 * Tolerance is intentionally loose (±5%) in P1 — P2 will tighten this to
 * ±2% once MERO Cd tables ship and the truth-set grows beyond legacy
 * self-snapshots.
 */

import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from './engine';
import { TRUTH_SET, DEFAULT_TOLERANCE } from './truth-set';

describe('truth-set — P1 non-regression', () => {
  for (const entry of TRUTH_SET) {
    it(entry.id, () => {
      const results = calculateTrajectory(entry.input);
      const tolDrop = entry.tolerance?.drop ?? DEFAULT_TOLERANCE.drop;
      const tolVel = entry.tolerance?.velocity ?? DEFAULT_TOLERANCE.velocity;

      for (const exp of entry.expected) {
        const row = results.find((r) => r.range === exp.range);
        expect(row, `missing range ${exp.range} m for ${entry.id}`).toBeDefined();
        if (!row) continue;

        if (exp.drop !== undefined) {
          // Drop @ zeroRange must be ~0 — use absolute tolerance there.
          if (exp.drop === 0) {
            expect(Math.abs(row.drop)).toBeLessThanOrEqual(2); // ≤ 2 mm
          } else {
            const delta = Math.abs(row.drop - exp.drop);
            const allowed = Math.max(2, Math.abs(exp.drop) * tolDrop);
            expect(delta).toBeLessThanOrEqual(allowed);
          }
        }
        if (exp.velocity !== undefined) {
          const delta = Math.abs(row.velocity - exp.velocity);
          const allowed = exp.velocity * tolVel;
          expect(delta).toBeLessThanOrEqual(allowed);
        }
      }
    });
  }

  it('every entry cites at least one source', () => {
    for (const entry of TRUTH_SET) {
      expect(entry.sources.length, `entry ${entry.id} missing sources`).toBeGreaterThan(0);
    }
  });
});
