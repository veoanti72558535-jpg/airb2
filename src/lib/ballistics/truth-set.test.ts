/**
 * Truth-set non-regression tests — P1 + P2.
 *
 * P1 ran every entry against the legacy engine.
 * P2 runs every entry against BOTH `legacy` and `mero` profiles, with the
 * profile-specific tolerance from `PROFILE_TOLERANCE`. The mero pass uses
 * the *same* expected values (legacy snapshot) and asserts they remain
 * within the tighter mero tolerance — i.e. MERO must not deviate more than
 * 3 % drop / 2 % velocity from the legacy reference at zero ranges and
 * documented sample points.
 *
 * Why use legacy snapshots as the reference for mero too in P2: until the
 * MERO official tables ship in P3 (`provenance: 'mero-official'`), we have
 * no third-party numerical truth. The closest we get is "MERO must agree
 * with legacy within tighter bounds because both should converge to the
 * same physics, modulo the integrator order".
 */

import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from './engine';
import { TRUTH_SET, PROFILE_TOLERANCE } from './truth-set';
import { LEGACY_PROFILE, MERO_PROFILE } from './profiles';
import type { BallisticInput } from '../types';
import type { ProfileId } from './types';

const PROFILES = [
  { id: 'legacy' as ProfileId, profile: LEGACY_PROFILE },
  { id: 'mero' as ProfileId, profile: MERO_PROFILE },
];

function runEntry(
  input: BallisticInput,
  profileId: ProfileId,
  config: typeof LEGACY_PROFILE.config | undefined,
) {
  // Pass engineConfig only for non-legacy — legacy stays bit-exact by
  // running through the historical no-config code path.
  const finalInput = profileId === 'legacy' ? input : { ...input, engineConfig: config };
  return calculateTrajectory(finalInput);
}

describe('truth-set — non-regression', () => {
  for (const { id: profileId, profile } of PROFILES) {
    describe(`profile: ${profileId}`, () => {
      const profileTol = PROFILE_TOLERANCE[profileId];
      for (const entry of TRUTH_SET) {
        it(entry.id, () => {
          const results = runEntry(entry.input, profileId, profile.config);
          const expectedRows =
            entry.expectedByProfile?.[profileId] ?? entry.expected;
          const tolDrop = entry.tolerance?.drop ?? profileTol.drop;
          const tolVel = entry.tolerance?.velocity ?? profileTol.velocity;

          for (const exp of expectedRows) {
            const row = results.find((r) => r.range === exp.range);
            expect(row, `missing range ${exp.range} m for ${entry.id}`).toBeDefined();
            if (!row) continue;

            if (exp.drop !== undefined) {
              if (exp.drop === 0) {
                // Drop @ zeroRange must be ~0 (absolute mm tolerance).
                // MERO uses dt=1e-3 so its zero-solver tolerance is slightly
                // looser than legacy's dt=5e-4 — 3 mm covers both.
                expect(Math.abs(row.drop)).toBeLessThanOrEqual(3);
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
    });
  }

  it('every entry cites at least one source', () => {
    for (const entry of TRUTH_SET) {
      expect(entry.sources.length, `entry ${entry.id} missing sources`).toBeGreaterThan(0);
    }
  });

  it('truth-set has at least 15 entries (P2 target)', () => {
    expect(TRUTH_SET.length).toBeGreaterThanOrEqual(15);
  });
});
