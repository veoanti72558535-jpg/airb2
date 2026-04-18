/**
 * Zero-solver matrix tests — Tranche E.
 *
 * Two responsibilities, both intentionally narrow:
 *
 *  1. Per-cell hard gate. Every cell MUST stay below
 *     `MATRIX_FAIL_THRESHOLD_MM` (50 mm). This is the catastrophic-
 *     regression net (sign flip, wrong integrator, bisection bail-out).
 *     We do NOT gate the WARN threshold — that lives in the report.
 *
 *  2. Report generation. The markdown report is regenerated and written
 *     to `src/lib/__fixtures__/sessions/zero-solver-matrix.md` so reviewers
 *     can inspect deltas in PRs. This mirrors the `cross-profile.test.ts`
 *     pattern — informative artefact, no value gate.
 *
 * Out of scope (per Tranche E brief):
 *  - no Newton, no solver refonte
 *  - no UI changes
 *  - no new user-facing knob
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  computeMatrix,
  computeAllMatrices,
  renderMatrixReport,
  summarize,
  MATRIX_FAIL_THRESHOLD_MM,
  MATRIX_ZERO_DISTANCES_M,
  MATRIX_ALTITUDES_M,
  MATRIX_TEMPERATURES_C,
} from './zero-solver-matrix';
import { LEGACY_PROFILE, MERO_PROFILE } from './profiles';

const EXPECTED_CELLS_PER_PROFILE =
  MATRIX_ZERO_DISTANCES_M.length * MATRIX_ALTITUDES_M.length * MATRIX_TEMPERATURES_C.length;

describe('zero-solver matrix — coverage', () => {
  it('produces 36 cells per profile (4×3×3)', () => {
    expect(EXPECTED_CELLS_PER_PROFILE).toBe(36);
    expect(computeMatrix(LEGACY_PROFILE)).toHaveLength(EXPECTED_CELLS_PER_PROFILE);
    expect(computeMatrix(MERO_PROFILE)).toHaveLength(EXPECTED_CELLS_PER_PROFILE);
  });

  it('exercises every (zero, altitude, temperature) tuple exactly once', () => {
    const cells = computeMatrix(LEGACY_PROFILE);
    const keys = new Set(cells.map((c) => `${c.zeroRange}|${c.altitude}|${c.temperature}`));
    expect(keys.size).toBe(EXPECTED_CELLS_PER_PROFILE);
  });
});

describe('zero-solver matrix — hard gate (catastrophic regression)', () => {
  it('legacy: every cell stays within ±50 mm of zero', () => {
    const cells = computeMatrix(LEGACY_PROFILE);
    const failures = cells.filter((c) => c.status === 'FAIL');
    if (failures.length > 0) {
      // Surface the offending cells in the assertion for fast triage.
      const detail = failures
        .map((f) => `zero=${f.zeroRange}m alt=${f.altitude}m T=${f.temperature}°C drop=${f.residualMm.toFixed(2)}mm`)
        .join('\n');
      throw new Error(`Legacy zero-solver regression in ${failures.length} cells:\n${detail}`);
    }
    expect(failures).toHaveLength(0);
  });

  it('mero: every cell stays within ±50 mm of zero', () => {
    const cells = computeMatrix(MERO_PROFILE);
    const failures = cells.filter((c) => c.status === 'FAIL');
    if (failures.length > 0) {
      const detail = failures
        .map((f) => `zero=${f.zeroRange}m alt=${f.altitude}m T=${f.temperature}°C drop=${f.residualMm.toFixed(2)}mm`)
        .join('\n');
      throw new Error(`MERO zero-solver regression in ${failures.length} cells:\n${detail}`);
    }
    expect(failures).toHaveLength(0);
  });

  it('every residual is finite (solver did not bail out)', () => {
    const { legacy, mero } = computeAllMatrices();
    for (const c of [...legacy, ...mero]) {
      expect(Number.isFinite(c.residualMm)).toBe(true);
      expect(Math.abs(c.residualMm)).toBeLessThanOrEqual(MATRIX_FAIL_THRESHOLD_MM);
    }
  });
});

describe('zero-solver matrix — summary', () => {
  it('summary counts add up to the total', () => {
    const cells = computeMatrix(LEGACY_PROFILE);
    const s = summarize(cells);
    expect(s.ok + s.warn + s.fail).toBe(s.total);
    expect(s.total).toBe(EXPECTED_CELLS_PER_PROFILE);
  });
});

describe('zero-solver matrix — report artefact', () => {
  it('writes a stable, parseable markdown report', () => {
    const report = renderMatrixReport();

    // Structural expectations — keep the file reviewable across runs.
    expect(report).toContain('# Zero-solver validation matrix');
    expect(report).toContain('## Profil Legacy');
    expect(report).toContain('## Profil MERO (beta)');
    expect(report).toContain('## Résumé');

    // One header row + one separator + 36 cells per profile section.
    const profileHeaderCount = (report.match(/\| zéro \(m\) \|/g) ?? []).length;
    expect(profileHeaderCount).toBe(2);

    const target = join(process.cwd(), 'src/lib/__fixtures__/sessions/zero-solver-matrix.md');
    writeFileSync(target, report, 'utf-8');
  });
});
