/**
 * Engine determinism vs. unit system.
 *
 * Contract under test: changing the user's display unit system (or any
 * per-category preference) MUST NOT change the engine output by a
 * single bit. The engine works exclusively in the SI reference units
 * documented in `BallisticInput` (m, m/s, mm, grains, …) — unit
 * preferences are a render-only concern handled via `toDisplay()`.
 *
 * What we assert:
 *   1. `calculateTrajectory(input)` returns a byte-identical array
 *      regardless of which unit system is "active" in localStorage at
 *      call time.
 *   2. The same single ref value (e.g. drop in meters) projected to
 *      display units gives the expected metric vs imperial format.
 *
 * If this test ever fails, the culprit is almost certainly a UI helper
 * that mistakenly fed display units back into the engine — a bug that
 * would silently corrupt every saved session.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateTrajectory } from '@/lib/ballistics';
import type { BallisticInput, WeatherSnapshot } from '@/lib/types';
import {
  toDisplay,
  fromDisplay,
  getDefaultUnitPrefs,
} from '@/lib/units';
import { saveSettings, getSettings } from '@/lib/storage';

const stdWeather: WeatherSnapshot = {
  temperature: 15,
  humidity: 0,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: '',
};

const REF_INPUT: BallisticInput = {
  muzzleVelocity: 280, // m/s — SI reference
  bc: 0.025,
  projectileWeight: 18, // grains (engine convention)
  sightHeight: 40, // mm
  zeroRange: 30, // m
  maxRange: 100, // m
  rangeStep: 10, // m
  weather: stdWeather,
};

describe('ballistic engine — determinism vs. unit system', () => {
  beforeEach(() => {
    // Clean slate — each case picks the system it needs.
    localStorage.clear();
  });

  it('produces byte-identical results in metric and imperial localStorage states', () => {
    // Run #1 — metric system active
    saveSettings({
      ...getSettings(),
      unitSystem: 'metric',
      unitPreferences: getDefaultUnitPrefs('metric'),
    });
    const metricRun = calculateTrajectory(REF_INPUT);

    // Run #2 — imperial system active
    saveSettings({
      ...getSettings(),
      unitSystem: 'imperial',
      unitPreferences: getDefaultUnitPrefs('imperial'),
    });
    const imperialRun = calculateTrajectory(REF_INPUT);

    // Run #3 — exotic mixed prefs
    saveSettings({
      ...getSettings(),
      unitSystem: 'imperial',
      unitPreferences: {
        ...getDefaultUnitPrefs('imperial'),
        distance: 'meters',
        velocity: 'kmh',
        energy: 'joules',
      },
    });
    const mixedRun = calculateTrajectory(REF_INPUT);

    // Same length, same range grid, same numeric fields — exact equality.
    expect(imperialRun).toEqual(metricRun);
    expect(mixedRun).toEqual(metricRun);

    // Spot-check: deep equality on each field too (guards against a
    // future row carrying a unit-tagged field by mistake).
    for (let i = 0; i < metricRun.length; i++) {
      expect(imperialRun[i]).toStrictEqual(metricRun[i]);
      expect(mixedRun[i]).toStrictEqual(metricRun[i]);
    }
  });

  it('two consecutive runs with the same input are bit-exact', () => {
    const a = calculateTrajectory(REF_INPUT);
    const b = calculateTrajectory(REF_INPUT);
    expect(b).toStrictEqual(a);
  });

  it('only the DISPLAY layer changes when switching systems', () => {
    const out = calculateTrajectory(REF_INPUT);
    const dropMeters = out.find((r) => r.range === 100)!.drop; // m, signed
    const velMps = out.find((r) => r.range === 100)!.velocity; // m/s
    const energyJ = out.find((r) => r.range === 100)!.energy; // J

    const metric = getDefaultUnitPrefs('metric');
    const imperial = getDefaultUnitPrefs('imperial');

    // Distance: 1 m = 1.09361 yd (default imperial distance unit).
    const dropYd = toDisplay('distance', dropMeters, imperial);
    expect(toDisplay('distance', dropMeters, metric)).toBe(dropMeters);
    expect(dropYd).toBeCloseTo(dropMeters * 1.0936133, 4);

    // Velocity: 1 m/s = 3.28084 fps.
    expect(toDisplay('velocity', velMps, metric)).toBe(velMps);
    expect(toDisplay('velocity', velMps, imperial)).toBeCloseTo(velMps * 3.28084, 3);

    // Energy: 1 J = 0.737562 ft·lbf.
    expect(toDisplay('energy', energyJ, metric)).toBe(energyJ);
    expect(toDisplay('energy', energyJ, imperial)).toBeCloseTo(energyJ * 0.7375621, 4);
  });

  it('round-trip toDisplay → fromDisplay preserves the reference value', () => {
    const out = calculateTrajectory(REF_INPUT);
    const energyJ = out[out.length - 1].energy;

    const imperial = getDefaultUnitPrefs('imperial');
    const ftlbs = toDisplay('energy', energyJ, imperial);
    expect(fromDisplay('energy', ftlbs, imperial)).toBeCloseTo(energyJ, 6);
  });
});
