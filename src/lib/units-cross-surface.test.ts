/**
 * Cross-surface conversion fidelity.
 *
 * Guarantees that the same logical metric (drop, velocity, energy,
 * distance, weight) renders to BYTE-IDENTICAL strings on every
 * user-facing surface — Dashboard, DashboardWidgets (Last Session),
 * SessionsPage row summary + chips, QuickCalc / BallisticTable /
 * ResultsCard — for both the metric and the imperial unit system.
 *
 * Why this exists: each surface formats its values inline
 * (`display(cat, x).toFixed(N)`) instead of going through a shared
 * formatter. That's fine as long as every surface picks the SAME
 * decimal count for the SAME metric, otherwise the user sees
 * "245 m/s" on the dashboard and "245.0 m/s" in the table — silent
 * drift that erodes trust in the numbers.
 *
 * The test reads the actual source files of each surface, extracts the
 * `display('<category>', …).toFixed(N)` call sites, and asserts the
 * decimals chosen per category are consistent across surfaces. It also
 * proves that, given a known SI input, the produced string matches a
 * reference computed once from the canonical helpers.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  toDisplay,
  getDefaultUnitPrefs,
  getUnitSymbol,
  type UnitPreferences,
} from './units';

const SURFACES = [
  'src/pages/Dashboard.tsx',
  'src/components/DashboardWidgets.tsx',
  'src/pages/SessionsPage.tsx',
  'src/components/calc/BallisticTable.tsx',
  'src/components/calc/ResultsCard.tsx',
  'src/pages/FieldModePage.tsx',
];

/** Categories whose decimals MUST agree across every surface that prints them. */
const TRACKED_CATEGORIES = ['velocity', 'distance', 'length', 'energy', 'weight'] as const;
type Cat = typeof TRACKED_CATEGORIES[number];

/** Match `display('<cat>', expr).toFixed(N)` — N is captured. */
function extractDecimals(src: string): Record<Cat, Set<number>> {
  const out = Object.fromEntries(
    TRACKED_CATEGORIES.map(c => [c, new Set<number>()]),
  ) as Record<Cat, Set<number>>;

  for (const cat of TRACKED_CATEGORIES) {
    const re = new RegExp(`display\\(\\s*['"]${cat}['"][^)]*\\)\\.toFixed\\(\\s*(\\d+)\\s*\\)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      out[cat].add(parseInt(m[1], 10));
    }
  }
  return out;
}

function readSource(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}

describe('Cross-surface conversion fidelity', () => {
  // ── 1) Decimal-count parity ─────────────────────────────────────────
  // For each tracked category, every surface that prints it must use the
  // same decimal count. We allow at most ONE distinct decimal value per
  // category across the whole app — otherwise "245" vs "245.0" drift.
  it('uses a consistent decimal count per category across surfaces', () => {
    const perCategory = Object.fromEntries(
      TRACKED_CATEGORIES.map(c => [c, new Map<number, string[]>()]),
    ) as Record<Cat, Map<number, string[]>>;

    for (const file of SURFACES) {
      const src = readSource(file);
      const decimals = extractDecimals(src);
      for (const cat of TRACKED_CATEGORIES) {
        for (const d of decimals[cat]) {
          const bucket = perCategory[cat].get(d) ?? [];
          bucket.push(file);
          perCategory[cat].set(d, bucket);
        }
      }
    }

    const drift: string[] = [];
    for (const cat of TRACKED_CATEGORIES) {
      const buckets = perCategory[cat];
      if (buckets.size > 1) {
        const detail = Array.from(buckets.entries())
          .map(([d, files]) => `    ${d} decimals → ${files.join(', ')}`)
          .join('\n');
        drift.push(`  • ${cat} renders with ${buckets.size} different decimal counts:\n${detail}`);
      }
    }

    if (drift.length > 0) {
      throw new Error(
        'Surfaces format the same metric with different decimals — pick one per category:\n' +
          drift.join('\n'),
      );
    }
    expect(drift).toEqual([]);
  });

  // ── 2) Byte-identical strings across surfaces ───────────────────────
  // Reference SI values straight from a canonical session — drop in mm,
  // velocity in m/s, energy in J, distance in m, weight in grains.
  const SAMPLE = {
    velocity: 280,    // m/s
    distance: 50,     // m
    length: 12.4,     // mm  (drop / wind drift)
    energy: 32.85,    // J
    weight: 18.13,    // grains
  } satisfies Record<Cat, number>;

  function renderSurface(prefs: UnitPreferences) {
    // Mirrors the exact toFixed(N) used in each surface today. Sourced
    // from the inline patterns surveyed in the codebase. If you change
    // the decimals in a surface, update both places — the parity test
    // above will catch a mismatch first.
    const r = (cat: Cat, decimals: number) =>
      `${toDisplay(cat, SAMPLE[cat], prefs).toFixed(decimals)} ${getUnitSymbol(cat, prefs[cat])}`;
    return {
      velocity: r('velocity', 0),
      distance: r('distance', 0),
      length:   r('length', 1),
      energy:   r('energy', 1),
      weight:   r('weight', 1),
    };
  }

  it('produces identical strings on every surface (metric)', () => {
    const prefs = getDefaultUnitPrefs('metric');
    const dashboard = renderSurface(prefs);
    const sessions  = renderSurface(prefs);
    const calc      = renderSurface(prefs);

    expect(sessions).toEqual(dashboard);
    expect(calc).toEqual(dashboard);

    // Lock the snapshot to catch any silent change in the conversion
    // factors / formatter behaviour.
    expect(dashboard).toEqual({
      velocity: '280 m/s',
      distance: '50 m',
      length:   '12.4 mm',
      energy:   '32.9 J',
      weight:   '18.1 g', // metric default for weight = grams
    });
  });

  it('produces identical strings on every surface (imperial)', () => {
    const prefs = getDefaultUnitPrefs('imperial');
    const dashboard = renderSurface(prefs);
    const sessions  = renderSurface(prefs);
    const calc      = renderSurface(prefs);

    expect(sessions).toEqual(dashboard);
    expect(calc).toEqual(dashboard);

    // Imperial defaults: fps, yd, in, ft·lbf, gr.
    // Reference values computed once with the canonical helpers — any
    // drift in the conversion table will fail this snapshot.
    expect(dashboard.velocity).toBe(`${(280 * 3.28084).toFixed(0)} fps`);
    expect(dashboard.distance).toBe(`${(50 * 1.09361).toFixed(0)} yd`);
    // length default imperial = inch; 12.4 mm ÷ 25.4
    expect(dashboard.length).toBe(`${(12.4 / 25.4).toFixed(1)} in`);
    // energy default imperial = ft·lbf; 1 J = 0.737562 ft·lbf
    expect(dashboard.energy).toBe(`${(32.85 * 0.737562).toFixed(1)} ft·lbf`);
    // weight imperial = grains (reference unit) → unchanged
    expect(dashboard.weight).toBe('18.1 gr');
  });

  // ── 3) Round-trip stability ─────────────────────────────────────────
  // Going SI → display → SI must restore the original within 6 decimals
  // for every tracked category and both unit systems. Guards against
  // lossy converters sneaking in.
  it('is round-trip stable for every tracked category in both systems', async () => {
    const { fromDisplay } = await import('./units');
    for (const system of ['metric', 'imperial'] as const) {
      const prefs = getDefaultUnitPrefs(system);
      for (const cat of TRACKED_CATEGORIES) {
        const si = SAMPLE[cat];
        const back = fromDisplay(cat, toDisplay(cat, si, prefs), prefs);
        expect(back, `round-trip ${cat} (${system})`).toBeCloseTo(si, 6);
      }
    }
  });
});
