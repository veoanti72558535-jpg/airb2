/**
 * Wind speed display synchronisation contract.
 *
 * The user reported (and we now lock down) two coupled invariants:
 *
 *   1. The dashboard "Conditions" tile and the QuickCalc EnvironmentSection
 *      wind input MUST show the same wind value in the same unit, derived
 *      from the same SI source (`weather.windSpeed` in m/s) via the same
 *      `useUnits().display('velocity', …)` pipeline.
 *
 *   2. The manual correction stays mandatory in the user's CURRENT display
 *      unit. Whatever number the user types must be converted back to SI
 *      via `toRef('velocity', …)` BEFORE being stored on
 *      `weather.windSpeed`. Without this, switching to fps would silently
 *      reinject display values into the engine — the very bug the backend
 *      SI guardrail rejects with `out-of-si-range`.
 *
 * This file is a static + numeric contract: it scans the affected sources
 * for the expected call shapes, and exercises the conversion helpers to
 * prove the round-trip is loss-free at the precision we render at.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toDisplay, fromDisplay, getDefaultUnitPrefs } from '@/lib/units';

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

describe('wind speed — dashboard ↔ environment input sync', () => {
  const dashboard = read('src/components/DashboardWidgets.tsx');
  const envSection = read('src/components/calc/EnvironmentSection.tsx');
  const resultsCard = read('src/components/calc/ResultsCard.tsx');

  it('dashboard formats wind via display(\'velocity\', …)', () => {
    expect(dashboard).toMatch(
      /display\(\s*['"]velocity['"]\s*,\s*weather\.windSpeed\s*\)/,
    );
  });

  it('dashboard wind unit comes from symbol(\'velocity\')', () => {
    expect(dashboard).toMatch(/symbol\(\s*['"]velocity['"]\s*\)/);
  });

  it('EnvironmentSection passes display() value to the UnitField', () => {
    expect(envSection).toMatch(
      /value=\{\s*display\(\s*['"]velocity['"]\s*,\s*weather\.windSpeed\s*\)\s*\}/,
    );
  });

  it('EnvironmentSection converts user input back to SI via toRef() before patching', () => {
    expect(envSection).toMatch(
      /onPatchManual\(\s*\{\s*windSpeed:\s*toRef\(\s*['"]velocity['"]\s*,\s*v\s*\)\s*\}\s*\)/,
    );
  });

  it('EnvironmentSection does NOT pass raw SI weather.windSpeed straight to the input', () => {
    // Strict regression guard: the previous bug was
    //   value={weather.windSpeed} + onChange={v => onPatchManual({ windSpeed: v })}
    // — both halves are now mandatory through the unit bridge.
    expect(envSection).not.toMatch(/value=\{\s*weather\.windSpeed\s*\}/);
    expect(envSection).not.toMatch(
      /onPatchManual\(\s*\{\s*windSpeed:\s*v\s*\}\s*\)/,
    );
  });

  it('ResultsCard footer formats wind via display() instead of the hardcoded m/s suffix', () => {
    expect(resultsCard).toMatch(
      /display\(\s*['"]velocity['"]\s*,\s*weather\.windSpeed\s*\)/,
    );
    // No more `…toFixed(1)}m/s` literal — symbol('velocity') drives it.
    expect(resultsCard).not.toMatch(/weather\.windSpeed\.toFixed\(1\)\}m\/s/);
  });
});

describe('wind speed — SI ↔ display round-trip is lossless at render precision', () => {
  // The render uses .toFixed(1) on the display value, so any conversion
  // pair must be stable to ≤ 0.05 of a display unit when round-tripped.

  const SI_VALUES_MS = [0, 0.5, 1, 2.5, 3, 4.4704, 5, 7, 10, 15];

  it('Metric (m/s) is the reference — round-trip is exact', () => {
    const prefs = getDefaultUnitPrefs('metric');
    for (const si of SI_VALUES_MS) {
      const shown = toDisplay('velocity', si, prefs);
      const back = fromDisplay('velocity', shown, prefs);
      expect(back).toBeCloseTo(si, 10);
      expect(shown).toBeCloseTo(si, 10); // m/s is the SI reference
    }
  });

  it('Imperial (fps) round-trips lossless and matches the expected magnitudes', () => {
    const prefs = getDefaultUnitPrefs('imperial');
    for (const si of SI_VALUES_MS) {
      const shown = toDisplay('velocity', si, prefs);
      const back = fromDisplay('velocity', shown, prefs);
      // Lossless to far better than .toFixed(1) precision in fps.
      expect(back).toBeCloseTo(si, 8);
    }
    // Sanity anchor: 4.4704 m/s == 14.6667 fps (≈ 10 mph).
    const shown = toDisplay('velocity', 4.4704, prefs);
    expect(shown).toBeCloseTo(14.6667, 3);
  });

  it('typing in display units then converting back to SI never injects display values into the engine', () => {
    // Simulate the EnvironmentSection bridge end-to-end:
    //   1. Engine stores SI m/s.
    //   2. UI displays it in the user unit.
    //   3. User types a NEW value in that same unit.
    //   4. Bridge converts back to SI before storing.
    // The final SI must equal what the user intended (their typed display
    // value reinterpreted in m/s), independently of which unit they use.
    const metric = getDefaultUnitPrefs('metric');
    const imperial = getDefaultUnitPrefs('imperial');

    // User in Imperial types "12 fps" — engine must store 12 fps in m/s.
    const userTypedFps = 12;
    const storedSiFromImperial = fromDisplay('velocity', userTypedFps, imperial);
    expect(storedSiFromImperial).toBeCloseTo(3.6576, 3); // 12 fps == 3.6576 m/s

    // User in Metric types "5" — that IS m/s, so 5 m/s round-trips to 5.
    const userTypedMs = 5;
    const storedSiFromMetric = fromDisplay('velocity', userTypedMs, metric);
    expect(storedSiFromMetric).toBeCloseTo(5, 10);

    // Critically: 12 fps !== 12 m/s. If the bridge were missing, both
    // would be stored as "12 m/s" (the previous bug), failing the SI
    // bounds guardrail (12 m/s wind is > the 30 km/h common-sense band
    // of Imperial-typing users) and producing garbage trajectories.
    expect(storedSiFromImperial).not.toBeCloseTo(userTypedFps, 1);
  });
});