/**
 * Zero-solver validation matrix — Tranche E.
 *
 * Goal: produce an audit artefact that exercises the zero-solver (legacy
 * AND mero) over a deliberately broad grid of zero distances, altitudes
 * and temperatures, then reports the residual drop at the zero point.
 *
 * NOT a refonte of the solver. NOT a scientific contract. Just a
 * reproducible "did the solver behave reasonably under these conditions"
 * audit, surfaced as a markdown table that humans can review on PR.
 *
 * Why a residual ?
 *  - The solver is a bisection that returns a launch angle. A correct
 *    angle, fed back into the flight loop, must put the projectile on
 *    the sight line at `zeroRange`. The residual is the signed drop
 *    measured at that range (in mm). |residual| should be ≤ tolerance.
 *
 * Tolerance policy (intentionally lenient for an audit):
 *  - WARN  : |drop| > 5 mm   — flagged but does not fail tests
 *  - FAIL  : |drop| > 50 mm  — gate, would mean the solver is broken
 *
 * The 50 mm hard gate exists only to detect catastrophic regressions
 * (sign-flip, wrong integrator dispatch, infinite-loop bail-out). Real
 * solver-quality investigation lives in the WARN column of the report.
 */

import { calculateTrajectory } from './engine';
import { LEGACY_PROFILE, MERO_PROFILE } from './profiles';
import type { BallisticInput, BallisticResult, WeatherSnapshot } from '../types';
import type { BallisticProfile } from './types';

/** Zero distances exercised. Chosen to span typical PCP use. */
export const MATRIX_ZERO_DISTANCES_M = [10, 25, 50, 100] as const;
/** Altitudes (m). Density at 2000 m is ~80 % of sea level — meaningful. */
export const MATRIX_ALTITUDES_M = [0, 1000, 2000] as const;
/** Temperatures (°C). Cold/standard/hot. */
export const MATRIX_TEMPERATURES_C = [-10, 15, 35] as const;

/** Tolerance band for the report (informational warning). */
export const MATRIX_WARN_THRESHOLD_MM = 5;
/** Hard gate — catastrophic regression. */
export const MATRIX_FAIL_THRESHOLD_MM = 50;

/**
 * Reference projectile — kept stable so cell-to-cell variation only
 * reflects the (zero, altitude, temperature) axes, not projectile spec.
 * .22 18 gr pellet @ 280 m/s G1 BC 0.025 — same gun as golden #01.
 */
const REFERENCE_INPUT: Omit<BallisticInput, 'weather' | 'zeroRange' | 'maxRange' | 'engineConfig'> = {
  muzzleVelocity: 280,
  bc: 0.025,
  projectileWeight: 18,
  sightHeight: 40,
  rangeStep: 5,
  dragModel: 'G1',
};

/**
 * Approximate ICAO pressure for a given altitude (hPa). Good enough for
 * an audit grid — the moteur recomputes density properly.
 */
function pressureForAltitude(altitudeM: number): number {
  // ICAO standard atmosphere lapse, simplified.
  return 1013.25 * Math.pow(1 - 2.25577e-5 * altitudeM, 5.25588);
}

function buildWeather(altitudeM: number, temperatureC: number): WeatherSnapshot {
  return {
    temperature: temperatureC,
    humidity: 50,
    pressure: pressureForAltitude(altitudeM),
    altitude: altitudeM,
    windSpeed: 0,
    windAngle: 0,
    source: 'manual',
    timestamp: '',
  };
}

export type CellStatus = 'OK' | 'WARN' | 'FAIL';

export interface MatrixCell {
  profileId: 'legacy' | 'mero';
  zeroRange: number;
  altitude: number;
  temperature: number;
  /** Signed drop at zero range, mm. Positive = above sight line. */
  residualMm: number;
  status: CellStatus;
}

export interface MatrixSummary {
  total: number;
  ok: number;
  warn: number;
  fail: number;
  worstAbsResidualMm: number;
}

/**
 * Build the input for one matrix cell. `maxRange` is set to `zeroRange`
 * so the engine produces a row exactly at the zero point — that row's
 * `drop` IS the residual we want to grade.
 */
function buildInput(
  zeroRange: number,
  altitude: number,
  temperature: number,
  profile: BallisticProfile,
): BallisticInput {
  return {
    ...REFERENCE_INPUT,
    zeroRange,
    maxRange: zeroRange,
    rangeStep: zeroRange,
    weather: buildWeather(altitude, temperature),
    engineConfig: profile.config,
  };
}

function classify(residualMm: number): CellStatus {
  const abs = Math.abs(residualMm);
  if (abs > MATRIX_FAIL_THRESHOLD_MM) return 'FAIL';
  if (abs > MATRIX_WARN_THRESHOLD_MM) return 'WARN';
  return 'OK';
}

/**
 * Find the result row at `range`. The engine emits a row at every
 * `rangeStep` plus the muzzle row; with `rangeStep === zeroRange` and
 * `maxRange === zeroRange` the row at `zeroRange` is the one we want.
 */
function rowAtRange(rows: BallisticResult[], range: number): BallisticResult | undefined {
  return rows.find((r) => r.range === range);
}

/** Compute every matrix cell for a given profile. */
export function computeMatrix(profile: BallisticProfile): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const zeroRange of MATRIX_ZERO_DISTANCES_M) {
    for (const altitude of MATRIX_ALTITUDES_M) {
      for (const temperature of MATRIX_TEMPERATURES_C) {
        const input = buildInput(zeroRange, altitude, temperature, profile);
        const rows = calculateTrajectory(input);
        const row = rowAtRange(rows, zeroRange);
        // If the engine bailed out before reaching zero range, treat it
        // as a hard failure — that itself is a regression worth surfacing.
        const residualMm = row ? row.drop : Number.POSITIVE_INFINITY;
        cells.push({
          profileId: profile.id as 'legacy' | 'mero',
          zeroRange,
          altitude,
          temperature,
          residualMm,
          status: Number.isFinite(residualMm) ? classify(residualMm) : 'FAIL',
        });
      }
    }
  }
  return cells;
}

export function summarize(cells: MatrixCell[]): MatrixSummary {
  let ok = 0,
    warn = 0,
    fail = 0,
    worst = 0;
  for (const c of cells) {
    if (c.status === 'OK') ok++;
    else if (c.status === 'WARN') warn++;
    else fail++;
    if (Number.isFinite(c.residualMm) && Math.abs(c.residualMm) > worst) {
      worst = Math.abs(c.residualMm);
    }
  }
  return { total: cells.length, ok, warn, fail, worstAbsResidualMm: worst };
}

/** Compute both profiles in one call — convenience for the report writer. */
export function computeAllMatrices(): {
  legacy: MatrixCell[];
  mero: MatrixCell[];
  legacySummary: MatrixSummary;
  meroSummary: MatrixSummary;
} {
  const legacy = computeMatrix(LEGACY_PROFILE);
  const mero = computeMatrix(MERO_PROFILE);
  return {
    legacy,
    mero,
    legacySummary: summarize(legacy),
    meroSummary: summarize(mero),
  };
}

/** Render one cell row as markdown. */
function fmtCell(c: MatrixCell): string {
  const r = Number.isFinite(c.residualMm) ? (Math.round(c.residualMm * 100) / 100).toString() : 'N/A';
  const flag = c.status === 'OK' ? '✅' : c.status === 'WARN' ? '⚠️' : '❌';
  return `| ${c.zeroRange} | ${c.altitude} | ${c.temperature} | ${r} | ${flag} ${c.status} |`;
}

function renderProfileSection(title: string, cells: MatrixCell[], summary: MatrixSummary): string[] {
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');
  lines.push(
    `_${summary.total} cellules — ${summary.ok} OK · ${summary.warn} WARN · ${summary.fail} FAIL · pire résidu absolu : ${(Math.round(summary.worstAbsResidualMm * 100) / 100)} mm._`,
  );
  lines.push('');
  lines.push('| zéro (m) | altitude (m) | température (°C) | résidu drop (mm) | statut |');
  lines.push('|---|---|---|---|---|');
  for (const c of cells) lines.push(fmtCell(c));
  lines.push('');
  return lines;
}

/**
 * Render the full markdown report. Pure function — tests can snapshot it
 * and the writer test commits it under `__fixtures__/sessions/`.
 */
export function renderMatrixReport(): string {
  const { legacy, mero, legacySummary, meroSummary } = computeAllMatrices();
  const lines: string[] = [
    '# Zero-solver validation matrix — Legacy vs MERO',
    '',
    '_Auto-généré par `zero-solver-matrix.test.ts`. Audit de validation, **pas** une preuve physique absolue._',
    '',
    '**But** : exercer le zero-solver sur une grille (zéro × altitude × température) et',
    'mesurer le résidu de drop au point de zéro. Un résidu nul signifie que',
    "l'angle de lancement trouvé met bien le projectile sur la ligne de visée à",
    'la distance demandée.',
    '',
    `**Tolérance** : |drop| > ${MATRIX_WARN_THRESHOLD_MM} mm = WARN (à surveiller, pas bloquant).`,
    `|drop| > ${MATRIX_FAIL_THRESHOLD_MM} mm = FAIL (régression catastrophique, gate dur).`,
    '',
    '**Projectile de référence** : .22 pellet 18 gr @ 280 m/s, G1 BC 0.025,',
    'sight height 40 mm. Conservé identique sur toutes les cellules pour que',
    'la variation reflète uniquement (zéro, altitude, température).',
    '',
    `**Total** : ${legacySummary.total + meroSummary.total} cellules (${legacySummary.total} legacy + ${meroSummary.total} MERO).`,
    '',
    ...renderProfileSection('Profil Legacy', legacy, legacySummary),
    ...renderProfileSection('Profil MERO (beta)', mero, meroSummary),
    '## Résumé',
    '',
    `- Legacy : ${legacySummary.ok}/${legacySummary.total} OK · ${legacySummary.warn} WARN · ${legacySummary.fail} FAIL`,
    `- MERO   : ${meroSummary.ok}/${meroSummary.total} OK · ${meroSummary.warn} WARN · ${meroSummary.fail} FAIL`,
    '',
    'Les cellules WARN ne déclenchent pas d\'échec de test. Elles sont',
    'documentées ici pour qu\'un reviewer humain puisse les inspecter avant',
    'tout merge touchant au moteur.',
    '',
  ];
  return lines.join('\n');
}
