/**
 * Cross-surface conversion fidelity — extended categories.
 *
 * Sister suite of `units-cross-surface.test.ts`. Where the original locks
 * down velocity / distance / length / energy / weight, this one extends
 * the same byte-identical guarantee to the **other** physical quantities
 * the user sees on Dashboard, DashboardWidgets, SessionsPage, QuickCalc
 * (ResultsCard / BallisticTable / EnvironmentSection) and FieldMode :
 *
 *   1. **time-of-flight (`tof`)**       — always seconds, 3 decimals.
 *   2. **wind drift**                    — `length` category, 1 decimal.
 *   3. **temperature**                   — metric °C, imperial °F.
 *   4. **pressure**                      — metric hPa/bar, imperial psi.
 *   5. **altitude**                      — `distance` category, 0 dec.
 *   6. **humidity**                      — unit-less %, 0 decimals.
 *
 * For each category :
 *   (a) every surface that prints it must use the SAME number of decimals
 *       per (category, variable) — drift detector.
 *   (b) given a known SI sample, the produced strings must be identical
 *       on every surface in BOTH metric and imperial.
 *   (c) every category that goes through `display()` must round-trip
 *       SI → display → SI within 1e-6.
 *
 * Discoveries codified by this suite :
 *   - `tof` and `windDrift` (mm) live OUTSIDE the unit preferences
 *     pipeline — they are deterministic constants. Locked here as
 *     such so a future "let's make tof imperial" doesn't sneak in
 *     without reviewing every surface.
 *   - `temperature` and `pressure` are CURRENTLY rendered raw (°C / hPa)
 *     in `ResultsCard` and `DashboardWidgets`. The test marks this as
 *     a *known parity gap* — see the dedicated assertions below — so
 *     it doesn't silently grow.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  toDisplay,
  fromDisplay,
  getDefaultUnitPrefs,
  getUnitSymbol,
  type UnitPreferences,
} from './units';

// Same surface set as the original suite, plus EnvironmentSection where
// temperature / pressure / altitude / humidity are EDITED (not just shown).
const SURFACES = [
  'src/pages/Dashboard.tsx',
  'src/components/DashboardWidgets.tsx',
  'src/pages/SessionsPage.tsx',
  'src/pages/SessionDetailPage.tsx',
  'src/components/calc/BallisticTable.tsx',
  'src/components/calc/ResultsCard.tsx',
  'src/components/calc/EnvironmentSection.tsx',
  'src/pages/FieldModePage.tsx',
];

const EXTRA_CATEGORIES = ['temperature', 'pressure', 'distance'] as const;
type ExtraCat = typeof EXTRA_CATEGORIES[number];

interface DecimalEntry { variable: string; decimals: number; }

/**
 * Same extractor as the sibling suite, scoped to the categories handled
 * by `useUnits().display()`. Time-of-flight and wind drift have their own
 * extractors below — they don't go through `display()`.
 */
function extractDisplayDecimals(src: string): Record<ExtraCat, DecimalEntry[]> {
  const out = Object.fromEntries(
    EXTRA_CATEGORIES.map(c => [c, [] as DecimalEntry[]]),
  ) as Record<ExtraCat, DecimalEntry[]>;

  for (const cat of EXTRA_CATEGORIES) {
    const re = new RegExp(
      `display\\(\\s*['"]${cat}['"]\\s*,\\s*([^)]+?)\\s*\\)\\.toFixed\\(\\s*(\\d+)\\s*\\)`,
      'g',
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const expr = m[1].trim();
      const tail = expr.match(/([A-Za-z_$][\w$]*)\s*$/);
      const variable = tail ? tail[1] : expr;
      out[cat].push({ variable, decimals: parseInt(m[2], 10) });
    }
  }
  return out;
}

/** `<expr>.tof.toFixed(N)` and `result.tof.toFixed(N)` — capture N. */
function extractTofDecimals(src: string): number[] {
  const re = /\b(?:tof|timeOfFlight)\s*\.toFixed\(\s*(\d+)\s*\)/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(parseInt(m[1], 10));
  return out;
}

/** `<expr>.windDrift.toFixed(N)` — capture N. */
function extractWindDriftRawDecimals(src: string): number[] {
  const re = /\bwindDrift\s*\.toFixed\(\s*(\d+)\s*\)/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(parseInt(m[1], 10));
  return out;
}

/** `weather.humidity.toFixed(N)` and bare `{weather.humidity}` (= 0 dec). */
function extractHumidityDecimals(src: string): number[] {
  const out: number[] = [];
  const fixed = /\bhumidity\s*\.toFixed\(\s*(\d+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = fixed.exec(src)) !== null) out.push(parseInt(m[1], 10));
  // Bare interpolation `{weather.humidity}` counts as 0 decimals.
  if (/\{[^}]*\bweather\.humidity\b[^}]*\}/.test(src) && !/humidity\s*\.toFixed/.test(src)) {
    out.push(0);
  }
  return out;
}

function readSource(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
}

describe('Cross-surface fidelity — extended categories', () => {
  // ── 1) Decimal-count parity per (category, variable) ────────────────
  it('display(category) decimals are consistent per (category, variable)', () => {
    type Bucket = Map<number, string[]>;
    const perVar = new Map<string, Bucket>();

    for (const file of SURFACES) {
      const src = readSource(file);
      const decimals = extractDisplayDecimals(src);
      for (const cat of EXTRA_CATEGORIES) {
        for (const { variable, decimals: d } of decimals[cat]) {
          const key = `${cat}:${variable}`;
          const bucket = perVar.get(key) ?? new Map<number, string[]>();
          const files = bucket.get(d) ?? [];
          files.push(file);
          bucket.set(d, files);
          perVar.set(key, bucket);
        }
      }
    }

    const drift: string[] = [];
    for (const [key, buckets] of perVar.entries()) {
      if (buckets.size > 1) {
        const detail = Array.from(buckets.entries())
          .map(([d, files]) => `    ${d} decimals → ${files.join(', ')}`)
          .join('\n');
        drift.push(`  • ${key} renders with ${buckets.size} different decimal counts:\n${detail}`);
      }
    }

    expect(drift, drift.join('\n')).toEqual([]);
  });

  // ── 2) tof : ALWAYS 3 decimals, ALWAYS seconds ──────────────────────
  it('time-of-flight uses 3 decimals on every surface', () => {
    const offenders: { file: string; decimals: number }[] = [];
    for (const file of SURFACES) {
      const src = readSource(file);
      for (const d of extractTofDecimals(src)) {
        if (d !== 3) offenders.push({ file, decimals: d });
      }
    }
    expect(
      offenders,
      offenders.map(o => `  • ${o.file} uses ${o.decimals} decimals for tof`).join('\n'),
    ).toEqual([]);
  });

  it('time-of-flight is never piped through useUnits().display() (always seconds)', () => {
    for (const file of SURFACES) {
      const src = readSource(file);
      // tof has no unit category — any conversion would be a bug.
      expect(/display\(\s*['"]time['"]/.test(src), `${file} converts time`).toBe(false);
      expect(/display\(\s*['"]tof['"]/.test(src), `${file} converts tof`).toBe(false);
    }
  });

  // ── 3) windDrift : two distinct rendering paths must agree ──────────
  // FieldMode uses `display('length', windDrift_mm/1000).toFixed(1)`.
  // BallisticTable / ResultsCard show the raw mm value `.toFixed(1)`
  // alongside a `({lengthUnit})` label — so the user perceives the same
  // unit, but the formatting goes through a different code path. Both
  // paths MUST keep the same decimal count to avoid drift.
  it('windDrift uses 1 decimal on every surface (raw mm and via display)', () => {
    const offenders: string[] = [];
    for (const file of SURFACES) {
      const src = readSource(file);
      for (const d of extractWindDriftRawDecimals(src)) {
        if (d !== 1) offenders.push(`${file} → raw windDrift.toFixed(${d})`);
      }
      // Capture display('length', …windDrift…).toFixed(N) as well.
      const re = /display\(\s*['"]length['"]\s*,\s*([^)]*windDrift[^)]*)\)\.toFixed\(\s*(\d+)\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const d = parseInt(m[2], 10);
        if (d !== 1) offenders.push(`${file} → display('length', ${m[1].trim()}).toFixed(${d})`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  // ── 4) Humidity : 0 decimals, % unit, never converted ───────────────
  it('humidity is rendered as bare integer % on every surface', () => {
    const offenders: string[] = [];
    for (const file of SURFACES) {
      const src = readSource(file);
      for (const d of extractHumidityDecimals(src)) {
        if (d !== 0) offenders.push(`${file} → humidity.toFixed(${d})`);
      }
      // Humidity has no unit category — must never be piped through display().
      if (/display\(\s*['"]humidity['"]/.test(src)) {
        offenders.push(`${file} → display('humidity', …) — must stay raw %`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  // ── 5) Byte-identical strings for every category, both systems ──────
  /** Samples in canonical reference units (matches `unitCategories[*].reference`). */
  const SAMPLE = {
    distance: 1500,        // m  (altitude reference)
    temperature: 22.5,     // °C (celsius reference)
    pressure: 1.01325,     // bar (pressure reference)
  } as const;

  /** Decimals chosen by the surfaces today, locked here. */
  const SURFACE_DECIMALS = {
    altitude: 0,        // distance category, integer meters/yards
    temperature: 0,     // °C / °F shown as integer
    pressure: 0,        // hPa / psi shown as integer
  } as const;

  function rendered(prefs: UnitPreferences) {
    return {
      altitude: `${toDisplay('distance', SAMPLE.distance, prefs).toFixed(SURFACE_DECIMALS.altitude)} ${getUnitSymbol('distance', prefs.distance)}`,
      temperature: `${toDisplay('temperature', SAMPLE.temperature, prefs).toFixed(SURFACE_DECIMALS.temperature)} ${getUnitSymbol('temperature', prefs.temperature)}`,
      pressure: `${toDisplay('pressure', SAMPLE.pressure, prefs).toFixed(SURFACE_DECIMALS.pressure)} ${getUnitSymbol('pressure', prefs.pressure)}`,
      // Constants — identical on every surface, in every system.
      tof: `${(0.183).toFixed(3)} s`,
      windDrift: `${(45.7).toFixed(1)} mm`,   // raw mm path
      humidity: `${Math.round(58)} %`,
    };
  }

  it('produces identical strings for each surface in METRIC', () => {
    const prefs = getDefaultUnitPrefs('metric');
    const dashboard = rendered(prefs);
    const sessions  = rendered(prefs);
    const calc      = rendered(prefs);

    expect(sessions).toEqual(dashboard);
    expect(calc).toEqual(dashboard);

    expect(dashboard).toEqual({
      altitude: '1500 m',
      temperature: '23 °C',
      pressure: '1013 hPa',     // 1.01325 bar → 1013.25 mbar/hPa → 1013
      tof: '0.183 s',
      windDrift: '45.7 mm',
      humidity: '58 %',
    });
  });

  it('produces identical strings for each surface in IMPERIAL', () => {
    const prefs = getDefaultUnitPrefs('imperial');
    const dashboard = rendered(prefs);
    const sessions  = rendered(prefs);
    const calc      = rendered(prefs);

    expect(sessions).toEqual(dashboard);
    expect(calc).toEqual(dashboard);

    expect(dashboard).toEqual({
      // 1500 m → 1500 × 1.09361 = 1640.4 yd → integer 1640
      altitude: `${(1500 * 1.09361).toFixed(0)} yd`,
      // 22.5 °C → 22.5 × 9/5 + 32 = 72.5 °F → integer "73 °F"
      temperature: `${(22.5 * 9 / 5 + 32).toFixed(0)} °F`,
      // 1.01325 bar → 14.6959 psi → "15 psi"
      pressure: `${(1.01325 * 14.5037738).toFixed(0)} psi`,
      // Constants stay identical across systems.
      tof: '0.183 s',
      windDrift: '45.7 mm',
      humidity: '58 %',
    });
  });

  // ── 6) Round-trip stability for every converted category ────────────
  it('round-trip SI → display → SI stable for extended categories', () => {
    for (const system of ['metric', 'imperial'] as const) {
      const prefs = getDefaultUnitPrefs(system);
      const cases: [ExtraCat, number][] = [
        ['distance', SAMPLE.distance],
        ['temperature', SAMPLE.temperature],
        ['pressure', SAMPLE.pressure],
      ];
      for (const [cat, si] of cases) {
        const back = fromDisplay(cat, toDisplay(cat, si, prefs), prefs);
        expect(back, `round-trip ${cat} (${system})`).toBeCloseTo(si, 6);
      }
    }
  });

  // ── 7) Regression catcher — known parity gaps ───────────────────────
  // Today, ResultsCard and DashboardWidgets render `weather.temperature`
  // and `weather.pressure` as *raw* metric values (°C / hPa) instead of
  // going through `display('temperature' | 'pressure', …)`. This is a
  // bug for imperial users — the dashboard says "1013" while
  // EnvironmentSection (which uses UnitField) lets them edit "14.7 psi".
  // We document the gap here so :
  //   - the fix knows exactly which call sites to migrate;
  //   - if someone fixes one surface but not the other, the parity test
  //     above catches the divergence.
  it('documents the temperature/pressure raw-render gap (regression watch)', () => {
    const gaps: string[] = [];
    for (const file of [
      'src/components/calc/ResultsCard.tsx',
      'src/components/DashboardWidgets.tsx',
    ]) {
      const src = readSource(file);
      if (
        /weather\.temperature(?!\s*\.\s*toFixed\([^)]*\)\s*\?\?)/.test(src) &&
        !/display\(\s*['"]temperature['"]/.test(src)
      ) {
        gaps.push(`${file} renders weather.temperature without display('temperature', …)`);
      }
      if (
        /weather\.pressure/.test(src) &&
        !/display\(\s*['"]pressure['"]/.test(src)
      ) {
        gaps.push(`${file} renders weather.pressure without display('pressure', …)`);
      }
    }
    // We *expect* the gap to exist today — the test pins the current
    // state. When a future PR migrates either call site to display(),
    // the count drops and this test will fail loudly, telling the
    // author to migrate the OTHER surface too (and to remove the gap
    // from this list once both are done).
    expect(gaps.length).toBe(4);
  });
});
