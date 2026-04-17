/**
 * Centralised comparison logic for two ballistic sessions.
 *
 * - `diffSessions` produces a structured list of input differences (with
 *   localised labels resolved at render time via i18n keys).
 * - `buildComparisonRows` aligns A and B trajectories on a common range grid
 *   so the comparison table renders cleanly regardless of original step sizes.
 * - `exportComparisonCsv`, `exportComparisonJson`, `exportSessionCsv`,
 *   `exportSessionJson`: pure string builders consumed by `downloadBlob`.
 *
 * Keeping every projection here means SessionsPage / ComparePage / future
 * visualisations all read the SAME truth — no scattered duplication.
 */

import {
  Airgun,
  BallisticInput,
  BallisticResult,
  Optic,
  Projectile,
  Session,
  WeatherSnapshot,
} from './types';
import { airgunStore, opticStore, projectileStore, tuneStore } from './storage';

// ── Diff model ──────────────────────────────────────────────────────────────

export interface SessionDiffEntry {
  /** Stable group key for grouping / collapsing in the UI. */
  group: 'projectile' | 'weapon' | 'optic' | 'zeroing' | 'distance' | 'weather';
  /** i18n key for the field label. */
  labelKey: string;
  /** Optional unit suffix shown next to both values. */
  unit?: string;
  /** Whichever side is missing the value renders an em dash. */
  a: string | number | undefined | null;
  b: string | number | undefined | null;
  /** Pre-computed equality used to filter out unchanged fields. */
  same: boolean;
}

interface ResolvedSession {
  session: Session;
  airgun?: Airgun;
  projectile?: Projectile;
  optic?: Optic;
  tuneName?: string;
}

export function resolveSession(s: Session): ResolvedSession {
  return {
    session: s,
    airgun: s.airgunId ? airgunStore.getById(s.airgunId) : undefined,
    projectile: s.projectileId ? projectileStore.getById(s.projectileId) : undefined,
    optic: s.opticId ? opticStore.getById(s.opticId) : undefined,
    tuneName: s.tuneId ? tuneStore.getById(s.tuneId)?.name : undefined,
  };
}

function eq(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  return a === b;
}

function entry(
  group: SessionDiffEntry['group'],
  labelKey: string,
  a: SessionDiffEntry['a'],
  b: SessionDiffEntry['b'],
  unit?: string,
): SessionDiffEntry {
  return { group, labelKey, a, b, unit, same: eq(a, b) };
}

/**
 * Produce every comparable input field from two sessions. Unchanged ones are
 * still returned (filter via `.same` in the UI) so the consumer can offer a
 * "show identical fields" toggle.
 */
export function diffSessions(a: Session, b: Session): SessionDiffEntry[] {
  const ra = resolveSession(a);
  const rb = resolveSession(b);
  const ai = a.input;
  const bi = b.input;

  const projLabel = (r: ResolvedSession) =>
    r.projectile ? `${r.projectile.brand} ${r.projectile.model}` : undefined;
  const airgunLabel = (r: ResolvedSession) =>
    r.airgun ? `${r.airgun.brand} ${r.airgun.model}` : undefined;
  const opticLabel = (r: ResolvedSession) => r.optic?.name;

  const entries: SessionDiffEntry[] = [
    // Projectile
    entry('projectile', 'compare.fieldProjectile', projLabel(ra), projLabel(rb)),
    entry('projectile', 'compare.fieldProjectileType', ra.projectile?.projectileType, rb.projectile?.projectileType),
    entry('projectile', 'compare.fieldWeight', ai.projectileWeight, bi.projectileWeight, 'gr'),
    entry('projectile', 'compare.fieldBc', ai.bc, bi.bc),
    entry('projectile', 'compare.fieldDragModel', ai.dragModel ?? 'G1', bi.dragModel ?? 'G1'),
    entry('projectile', 'compare.fieldProjectileLength', ai.projectileLength, bi.projectileLength, 'mm'),
    entry('projectile', 'compare.fieldProjectileDiameter', ai.projectileDiameter, bi.projectileDiameter, 'mm'),
    entry('projectile', 'compare.fieldCustomDrag', ai.customDragTable ? `${ai.customDragTable.length} pts` : '—', bi.customDragTable ? `${bi.customDragTable.length} pts` : '—'),

    // Weapon
    entry('weapon', 'compare.fieldAirgun', airgunLabel(ra), airgunLabel(rb)),
    entry('weapon', 'compare.fieldCaliber', ra.airgun?.caliber, rb.airgun?.caliber),
    entry('weapon', 'compare.fieldBarrelLength', ra.airgun?.barrelLength, rb.airgun?.barrelLength, 'mm'),
    entry('weapon', 'compare.fieldTwistRate', ai.twistRate ? `1:${ai.twistRate}″` : undefined, bi.twistRate ? `1:${bi.twistRate}″` : undefined),
    entry('weapon', 'compare.fieldTune', ra.tuneName, rb.tuneName),
    entry('weapon', 'compare.fieldMuzzleVelocity', ai.muzzleVelocity, bi.muzzleVelocity, 'm/s'),

    // Optic
    entry('optic', 'compare.fieldOptic', opticLabel(ra), opticLabel(rb)),
    entry('optic', 'compare.fieldFocalPlane', ai.focalPlane ?? 'FFP', bi.focalPlane ?? 'FFP'),
    entry('optic', 'compare.fieldClickValue', ai.clickValue, bi.clickValue, ai.clickUnit ?? bi.clickUnit ?? ''),
    entry('optic', 'compare.fieldClickUnit', ai.clickUnit, bi.clickUnit),
    entry('optic', 'compare.fieldCurrentMag', ai.currentMag != null ? `${ai.currentMag}×` : undefined, bi.currentMag != null ? `${bi.currentMag}×` : undefined),
    entry('optic', 'compare.fieldMagCalibration', ai.magCalibration != null ? `${ai.magCalibration}×` : undefined, bi.magCalibration != null ? `${bi.magCalibration}×` : undefined),
    entry('optic', 'compare.fieldSightHeight', ai.sightHeight, bi.sightHeight, 'mm'),

    // Zeroing
    entry('zeroing', 'compare.fieldZeroRange', ai.zeroRange, bi.zeroRange, 'm'),
    entry('zeroing', 'compare.fieldZeroWeather', ai.zeroWeather ? '✓' : '—', bi.zeroWeather ? '✓' : '—'),

    // Distance
    entry('distance', 'compare.fieldMaxRange', ai.maxRange, bi.maxRange, 'm'),
    entry('distance', 'compare.fieldRangeStep', ai.rangeStep, bi.rangeStep, 'm'),

    // Weather (current)
    entry('weather', 'compare.fieldWeatherSource', ai.weather?.source, bi.weather?.source),
    entry('weather', 'compare.fieldTemperature', ai.weather?.temperature, bi.weather?.temperature, '°C'),
    entry('weather', 'compare.fieldPressure', ai.weather?.pressure, bi.weather?.pressure, 'hPa'),
    entry('weather', 'compare.fieldHumidity', ai.weather?.humidity, bi.weather?.humidity, '%'),
    entry('weather', 'compare.fieldAltitude', ai.weather?.altitude, bi.weather?.altitude, 'm'),
    entry('weather', 'compare.fieldWindSpeed', ai.weather?.windSpeed, bi.weather?.windSpeed, 'm/s'),
    entry('weather', 'compare.fieldWindAngle', ai.weather?.windAngle, bi.weather?.windAngle, '°'),
    entry('weather', 'compare.fieldWeatherLocation', ai.weather?.location, bi.weather?.location),
  ];

  return entries;
}

// ── Trajectory alignment ────────────────────────────────────────────────────

export interface ComparisonRow {
  range: number;
  a?: BallisticResult;
  b?: BallisticResult;
}

/**
 * Build a unified row set across both sessions on a configurable range grid.
 * For each grid point we pick the result whose `range` is closest (within
 * `tolerance` metres) — sessions saved with different step sizes still align
 * gracefully without any side recomputation.
 */
export function buildComparisonRows(
  a: Session,
  b: Session,
  opts: { start: number; end: number; step: number; tolerance?: number },
): ComparisonRow[] {
  const tol = opts.tolerance ?? Math.max(2, opts.step / 2);
  const rows: ComparisonRow[] = [];
  for (let r = opts.start; r <= opts.end + 1e-6; r += opts.step) {
    const range = Math.round(r);
    rows.push({
      range,
      a: pickClosest(a.results, range, tol),
      b: pickClosest(b.results, range, tol),
    });
  }
  return rows;
}

function pickClosest(
  results: BallisticResult[] | undefined,
  range: number,
  tol: number,
): BallisticResult | undefined {
  if (!results || results.length === 0) return undefined;
  let best: BallisticResult | undefined;
  let bestDist = Infinity;
  for (const r of results) {
    const d = Math.abs(r.range - range);
    if (d < bestDist) {
      best = r;
      bestDist = d;
    }
  }
  return best && bestDist <= tol ? best : undefined;
}

/** Sensible default range bounds for a comparison: 0 → max(target both). */
export function defaultRange(a: Session, b: Session): { start: number; end: number; step: number } {
  const end = Math.max(a.input.maxRange, b.input.maxRange, 50);
  // Pick a step that fits inside the smaller of the two saved steps so we
  // don't fabricate rows that have no underlying data.
  const minStep = Math.min(a.input.rangeStep || 10, b.input.rangeStep || 10);
  const step = Math.max(5, Math.round(minStep));
  return { start: 0, end, step };
}

// ── Exports ────────────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const RESULT_COLS: (keyof BallisticResult)[] = [
  'range',
  'drop',
  'holdover',
  'holdoverMRAD',
  'velocity',
  'energy',
  'tof',
  'windDrift',
  'windDriftMOA',
  'windDriftMRAD',
  'spinDrift',
  'clicksElevation',
  'clicksWindage',
];

export function exportSessionCsv(s: Session): string {
  const header = RESULT_COLS.join(',');
  const rows = (s.results ?? []).map(r =>
    RESULT_COLS.map(c => csvEscape(r[c])).join(','),
  );
  const meta = [
    `# session,${csvEscape(s.name)}`,
    `# createdAt,${csvEscape(s.createdAt)}`,
    `# muzzleVelocity,${csvEscape(s.input.muzzleVelocity)}`,
    `# bc,${csvEscape(s.input.bc)}`,
    `# weight_gr,${csvEscape(s.input.projectileWeight)}`,
    `# zeroRange_m,${csvEscape(s.input.zeroRange)}`,
    `# dragModel,${csvEscape(s.input.dragModel ?? 'G1')}`,
    `# weatherSource,${csvEscape(s.input.weather?.source ?? 'manual')}`,
  ].join('\n');
  return `${meta}\n${header}\n${rows.join('\n')}\n`;
}

export function exportSessionJson(s: Session): string {
  return JSON.stringify(
    {
      kind: 'airballistik.session',
      version: 1,
      session: s,
    },
    null,
    2,
  );
}

export function exportComparisonCsv(
  a: Session,
  b: Session,
  rows: ComparisonRow[],
): string {
  const header = [
    'range_m',
    'A_drop_mm',
    'B_drop_mm',
    'delta_drop_mm',
    'A_holdover_MOA',
    'B_holdover_MOA',
    'delta_holdover_MOA',
    'A_velocity_mps',
    'B_velocity_mps',
    'delta_velocity_mps',
    'A_energy_J',
    'B_energy_J',
    'delta_energy_J',
    'A_tof_s',
    'B_tof_s',
    'delta_tof_s',
    'A_windDrift_mm',
    'B_windDrift_mm',
    'delta_windDrift_mm',
  ].join(',');

  const meta = [
    `# A,${csvEscape(a.name)}`,
    `# B,${csvEscape(b.name)}`,
    `# generatedAt,${new Date().toISOString()}`,
  ].join('\n');

  const body = rows.map(row => {
    const num = (av?: number, bv?: number) => ({
      av: av != null ? csvEscape(av) : '',
      bv: bv != null ? csvEscape(bv) : '',
      delta: av != null && bv != null ? csvEscape(+(bv - av).toFixed(3)) : '',
    });
    const drop = num(row.a?.drop, row.b?.drop);
    const hold = num(row.a?.holdover, row.b?.holdover);
    const vel = num(row.a?.velocity, row.b?.velocity);
    const en = num(row.a?.energy, row.b?.energy);
    const tof = num(row.a?.tof, row.b?.tof);
    const wd = num(row.a?.windDrift, row.b?.windDrift);
    return [
      row.range,
      drop.av, drop.bv, drop.delta,
      hold.av, hold.bv, hold.delta,
      vel.av, vel.bv, vel.delta,
      en.av, en.bv, en.delta,
      tof.av, tof.bv, tof.delta,
      wd.av, wd.bv, wd.delta,
    ].join(',');
  });

  return `${meta}\n${header}\n${body.join('\n')}\n`;
}

export function exportComparisonJson(
  a: Session,
  b: Session,
  rows: ComparisonRow[],
  diff: SessionDiffEntry[],
): string {
  return JSON.stringify(
    {
      kind: 'airballistik.comparison',
      version: 1,
      generatedAt: new Date().toISOString(),
      a,
      b,
      diff: diff.filter(d => !d.same),
      rows,
    },
    null,
    2,
  );
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(input: string): string {
  return input
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'session';
}

// Re-export weather snapshot helper for callers that want a compact label.
export function summariseWeather(w?: WeatherSnapshot): string | undefined {
  if (!w) return undefined;
  return `${w.temperature?.toFixed?.(0) ?? '?'}°C · ${w.pressure?.toFixed?.(0) ?? '?'}hPa · ${w.humidity?.toFixed?.(0) ?? '?'}% · ${w.windSpeed?.toFixed?.(1) ?? '?'}m/s`;
}

export function buildInputDescriptor(input: BallisticInput): string {
  return `${input.muzzleVelocity} m/s · BC ${input.bc} · ${input.projectileWeight} gr · zero ${input.zeroRange} m`;
}
