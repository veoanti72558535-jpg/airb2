/**
 * Tranche H — Ballistic table helpers (pure).
 *
 * Reads existing `BallisticResult[]` produced by the engine and rebuilds a
 * coherent set of rows at user-configurable distances, WITHOUT touching the
 * engine. When a requested distance falls between two computed rows we
 * linearly interpolate every numeric field; this keeps the table cheap and
 * deterministic. No physics is reinvented here — the engine remains the
 * single source of truth.
 *
 * Strict scope:
 *  - no recomputation, no profile awareness, no MERO / engine selector
 *  - no reticle subtension math
 *  - rounding policy is left to the UI layer (toFixed)
 */
import type { BallisticResult } from './types';

/** Default visible columns when no user preference is stored. */
export const DEFAULT_COLUMNS: BallisticTableColumn[] = [
  'distance',
  'drop',
  'holdover',
  'velocity',
  'energy',
];

/** Every column the table can render. Keep this list closed (typed). */
export type BallisticTableColumn =
  | 'distance'
  | 'drop'
  | 'holdover'
  | 'elevationClicks'
  | 'windDrift'
  | 'windClicks'
  | 'velocity'
  | 'energy'
  | 'tof';

export const ALL_COLUMNS: BallisticTableColumn[] = [
  'distance',
  'drop',
  'holdover',
  'elevationClicks',
  'windDrift',
  'windClicks',
  'velocity',
  'energy',
  'tof',
];

/** Distance is structural — never hideable. */
export const REQUIRED_COLUMNS: BallisticTableColumn[] = ['distance'];

export interface BallisticTableConfig {
  /** First distance shown (m). Clamped to ≥ 0. */
  startDistance: number;
  /** Last distance shown (m). Clamped to ≥ startDistance. */
  maxDistance: number;
  /** Step between rows (m). Clamped to ≥ 1. */
  step: number;
  /** Columns the user wants to see. `distance` is always added back. */
  columns: BallisticTableColumn[];
}

export function defaultConfig(maxRangeHint?: number): BallisticTableConfig {
  const max = maxRangeHint && maxRangeHint > 0 ? Math.round(maxRangeHint) : 100;
  return {
    startDistance: 0,
    maxDistance: max,
    step: max <= 50 ? 5 : 10,
    columns: [...DEFAULT_COLUMNS],
  };
}

/**
 * Build the list of distances the table should show, respecting bounds and
 * step. Always inclusive of `startDistance` when start ≤ max.
 */
export function buildDistanceList(cfg: BallisticTableConfig): number[] {
  const start = Math.max(0, Math.floor(cfg.startDistance));
  const max = Math.max(start, Math.floor(cfg.maxDistance));
  const step = Math.max(1, Math.floor(cfg.step));
  const out: number[] = [];
  for (let d = start; d <= max; d += step) out.push(d);
  // Edge case: ensure at least one row when start === max.
  if (out.length === 0) out.push(start);
  return out;
}

/** Linear interpolation between two BallisticResult rows. */
function lerpResult(a: BallisticResult, b: BallisticResult, t: number): BallisticResult {
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const lerpOpt = (x?: number, y?: number) =>
    x == null || y == null ? (x ?? y) : lerp(x, y);
  return {
    range: lerp(a.range, b.range),
    drop: lerp(a.drop, b.drop),
    holdover: lerp(a.holdover, b.holdover),
    holdoverMRAD: lerp(a.holdoverMRAD, b.holdoverMRAD),
    reticleHoldoverMOA: lerpOpt(a.reticleHoldoverMOA, b.reticleHoldoverMOA),
    reticleHoldoverMRAD: lerpOpt(a.reticleHoldoverMRAD, b.reticleHoldoverMRAD),
    reticleWindMOA: lerpOpt(a.reticleWindMOA, b.reticleWindMOA),
    reticleWindMRAD: lerpOpt(a.reticleWindMRAD, b.reticleWindMRAD),
    velocity: lerp(a.velocity, b.velocity),
    energy: lerp(a.energy, b.energy),
    tof: lerp(a.tof, b.tof),
    windDrift: lerp(a.windDrift, b.windDrift),
    windDriftMOA: lerp(a.windDriftMOA, b.windDriftMOA),
    windDriftMRAD: lerp(a.windDriftMRAD, b.windDriftMRAD),
    spinDrift: lerpOpt(a.spinDrift, b.spinDrift),
    clicksElevation:
      a.clicksElevation == null || b.clicksElevation == null
        ? (a.clicksElevation ?? b.clicksElevation)
        : Math.round(lerp(a.clicksElevation, b.clicksElevation)),
    clicksWindage:
      a.clicksWindage == null || b.clicksWindage == null
        ? (a.clicksWindage ?? b.clicksWindage)
        : Math.round(lerp(a.clicksWindage, b.clicksWindage)),
  };
}

/**
 * Resolve a row at `distance` from the precomputed engine results. Uses
 * exact match when present, otherwise linear interpolation between the two
 * surrounding rows. Returns `null` when the distance falls outside the
 * computed range — the UI must skip / flag those rows rather than fabricate.
 */
export function resolveRowAt(rows: BallisticResult[], distance: number): BallisticResult | null {
  if (!rows || rows.length === 0) return null;
  // Sorted by range as produced by the engine, but be defensive.
  const sorted = [...rows].sort((a, b) => a.range - b.range);
  if (distance < sorted[0].range || distance > sorted[sorted.length - 1].range) return null;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].range === distance) return sorted[i];
    if (sorted[i].range > distance) {
      const a = sorted[i - 1];
      const b = sorted[i];
      if (!a) return b;
      const span = b.range - a.range;
      const t = span === 0 ? 0 : (distance - a.range) / span;
      return lerpResult(a, b, t);
    }
  }
  return sorted[sorted.length - 1];
}

/**
 * Build the full row set the table will render. Rows whose distance falls
 * outside the engine's computed range are dropped silently (the empty-state
 * helper below tells the UI when nothing is left).
 */
export function buildTableRows(
  rows: BallisticResult[],
  cfg: BallisticTableConfig,
): BallisticResult[] {
  const distances = buildDistanceList(cfg);
  const out: BallisticResult[] = [];
  for (const d of distances) {
    const row = resolveRowAt(rows, d);
    if (row) out.push({ ...row, range: d });
  }
  return out;
}

/** Returns `true` iff the column is currently selected. */
export function isColumnVisible(cfg: BallisticTableConfig, col: BallisticTableColumn): boolean {
  if (REQUIRED_COLUMNS.includes(col)) return true;
  return cfg.columns.includes(col);
}

/** Toggle a column on/off, never letting required columns be removed. */
export function toggleColumn(
  cfg: BallisticTableConfig,
  col: BallisticTableColumn,
): BallisticTableConfig {
  if (REQUIRED_COLUMNS.includes(col)) return cfg;
  const has = cfg.columns.includes(col);
  return {
    ...cfg,
    columns: has ? cfg.columns.filter(c => c !== col) : [...cfg.columns, col],
  };
}
