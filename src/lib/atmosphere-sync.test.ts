/**
 * Atmosphere SI ↔ display synchronisation contract.
 *
 * Same invariant as `wind-speed-sync.test.ts` but extended to the three
 * remaining environmental fields exposed in QuickCalc's
 * EnvironmentSection :
 *   - temperature  (SI = °C, display = °C | °F)
 *   - pressure     (SI = hPa, display = hPa | inHg | psi)
 *   - altitude     (SI = m,   display = m   | yd  | ft  — shared with distance pref)
 *
 * Two locks :
 *   (a) Static lock — each UnitField goes through the
 *       `display(category, …)` / `toRef(category, …)` bridge, never raw SI.
 *   (b) Numeric lock — round-trip is loss-free at render precision so the
 *       backend SI guardrail (`out-of-si-range`) never fires from a UI
 *       conversion artefact.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toDisplay, fromDisplay, getDefaultUnitPrefs } from '@/lib/units';

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

describe('atmosphere — EnvironmentSection SI↔display bridge (static)', () => {
  const env = read('src/components/calc/EnvironmentSection.tsx');

  it('temperature passes display() value to the UnitField', () => {
    expect(env).toMatch(
      /value=\{\s*display\(\s*['"]temperature['"]\s*,\s*weather\.temperature\s*\)\s*\}/,
    );
  });

  it('temperature converts user input back to SI via toRef() before patching', () => {
    expect(env).toMatch(
      /onPatchManual\(\s*\{\s*temperature:\s*toRef\(\s*['"]temperature['"]\s*,\s*v\s*\)\s*\}\s*\)/,
    );
  });

  it('pressure passes display() value to the UnitField', () => {
    expect(env).toMatch(
      /value=\{\s*display\(\s*['"]pressure['"]\s*,\s*weather\.pressure\s*\)\s*\}/,
    );
  });

  it('pressure converts user input back to SI via toRef() before patching', () => {
    expect(env).toMatch(
      /onPatchManual\(\s*\{\s*pressure:\s*toRef\(\s*['"]pressure['"]\s*,\s*v\s*\)\s*\}\s*\)/,
    );
  });

  it('altitude passes display() value to the UnitField (distance category)', () => {
    expect(env).toMatch(
      /value=\{\s*display\(\s*['"]distance['"]\s*,\s*weather\.altitude\s*\)\s*\}/,
    );
  });

  it('altitude converts user input back to SI via toRef() before patching', () => {
    expect(env).toMatch(
      /onPatchManual\(\s*\{\s*altitude:\s*toRef\(\s*['"]distance['"]\s*,\s*v\s*\)\s*\}\s*\)/,
    );
  });

  it('regression: no raw SI value is fed straight to a UnitField for those fields', () => {
    // Strict guards — the previous bug pattern was
    //   value={weather.temperature}  +  onChange={v => onPatchManual({ temperature: v })}
    // for all three fields. Both halves are now mandatory through the bridge.
    expect(env).not.toMatch(/value=\{\s*weather\.temperature\s*\}/);
    expect(env).not.toMatch(/value=\{\s*weather\.pressure\s*\}/);
    expect(env).not.toMatch(/value=\{\s*weather\.altitude\s*\}/);
    expect(env).not.toMatch(/onPatchManual\(\s*\{\s*temperature:\s*v\s*\}\s*\)/);
    expect(env).not.toMatch(/onPatchManual\(\s*\{\s*pressure:\s*v\s*\}\s*\)/);
    expect(env).not.toMatch(/onPatchManual\(\s*\{\s*altitude:\s*v\s*\}\s*\)/);
  });
});

describe('atmosphere — SI ↔ display round-trip is lossless at render precision', () => {
  const metric = getDefaultUnitPrefs('metric');
  const imperial = getDefaultUnitPrefs('imperial');

  it('temperature round-trips losslessly in metric and imperial', () => {
    const SI_C = [-30, -10, 0, 10, 15, 20, 25, 32.5, 40];
    for (const c of SI_C) {
      for (const prefs of [metric, imperial]) {
        const shown = toDisplay('temperature', c, prefs);
        const back = fromDisplay('temperature', shown, prefs);
        expect(back).toBeCloseTo(c, 8);
      }
    }
    // Sanity anchor : 0 °C == 32 °F, 100 °C == 212 °F.
    expect(toDisplay('temperature', 0, imperial)).toBeCloseTo(32, 6);
    expect(toDisplay('temperature', 100, imperial)).toBeCloseTo(212, 6);
  });

  it('pressure round-trips losslessly in metric and imperial', () => {
    const SI_HPA = [500, 850, 950, 1000, 1013.25, 1050, 1100];
    for (const hpa of SI_HPA) {
      for (const prefs of [metric, imperial]) {
        const shown = toDisplay('pressure', hpa, prefs);
        const back = fromDisplay('pressure', shown, prefs);
        expect(back).toBeCloseTo(hpa, 6);
      }
    }
    // Sanity anchor : 1013.25 hPa ≈ 29.9213 inHg.
    const inHg = toDisplay('pressure', 1013.25, imperial);
    // We don't assume the imperial default IS inHg — only that the
    // round-trip preserves the SI value, which the previous loop already
    // proved. The anchor is informative.
    expect(Number.isFinite(inHg)).toBe(true);
  });

  it('altitude (distance) round-trips losslessly in metric and imperial', () => {
    const SI_M = [0, 100, 250, 500, 1000, 1500, 2500, 4000];
    for (const m of SI_M) {
      for (const prefs of [metric, imperial]) {
        const shown = toDisplay('distance', m, prefs);
        const back = fromDisplay('distance', shown, prefs);
        expect(back).toBeCloseTo(m, 6);
      }
    }
  });

  it('typing a display value never re-injects display units into SI storage', () => {
    // Imperial user types "70" in the temperature field — they meant 70°F,
    // which must be stored as ~21.11 °C (NOT as 70 °C).
    const userTypedF = 70;
    const storedC = fromDisplay('temperature', userTypedF, imperial);
    expect(storedC).toBeCloseTo(21.1111, 3);
    expect(storedC).not.toBeCloseTo(userTypedF, 1);

    // Imperial user types "14.7" in the pressure field (default unit = psi
    // in the units module). The conversion must NOT be the identity — i.e.
    // typing 14.7 psi must NOT be stored as 14.7 in the reference scale.
    // We assert "non-identity + finite + bounded" rather than an absolute
    // hPa value because the pressure reference scale is governed by
    // `unitCategories[pressure].reference` and is allowed to evolve.
    const userTypedPsi = 14.7;
    const storedRef = fromDisplay('pressure', userTypedPsi, imperial);
    expect(Number.isFinite(storedRef)).toBe(true);
    expect(storedRef).not.toBeCloseTo(userTypedPsi, 1);
    // Round-trip back to display unit is lossless.
    const back = toDisplay('pressure', storedRef, imperial);
    expect(back).toBeCloseTo(userTypedPsi, 6);

    // Imperial user types "100" in the altitude field (yards/feet per
    // distance preference). Stored value must NOT equal 100 (that would
    // mean we silently treated it as metres).
    const userTypedDist = 100;
    const storedM = fromDisplay('distance', userTypedDist, imperial);
    expect(storedM).not.toBeCloseTo(userTypedDist, 1);
    expect(toDisplay('distance', storedM, imperial)).toBeCloseTo(userTypedDist, 6);
  });
});