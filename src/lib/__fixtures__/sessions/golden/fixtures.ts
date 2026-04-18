/**
 * Golden fixtures — P3.2.
 *
 * Each fixture is a minimal `BallisticInput` + a business intent. The
 * golden snapshot test file (`golden.test.ts`) feeds each input to the
 * legacy engine and asserts that 6 metrics × 5 distances stay strictly
 * stable. Any drift trips the test → either a bug or an explicit
 * decision (regenerate by editing the snapshot file).
 *
 * Inputs are committed as TS objects (not JSON files) so they stay
 * type-checked against `BallisticInput` and refactors of the type catch
 * fixture rot at compile time. The "fixture as data file" idea was
 * considered but rejected — JSON drifts silently.
 *
 * Coverage targets (cf. P3.2 plan §6):
 *  - .177 short pellet
 *  - .22 standard pellet
 *  - .22 long slug
 *  - .25 heavy pellet at altitude
 *  - .30 long range
 *  - cold-dry vs hot-humid same caliber
 *  - short zero (10-15m) and long zero (50-100m)
 *  - one crosswind case
 */

import type { BallisticInput, WeatherSnapshot } from '@/lib/types';

export interface GoldenFixture {
  /** Stable id — also used as snapshot key. */
  id: string;
  /** Short business description for the manifest. */
  description: string;
  /** Caliber tag for grouping. */
  caliber: '.177' | '.22' | '.25' | '.30';
  /** Pellet vs slug for grouping. */
  projectileType: 'pellet' | 'slug';
  /** Engine input fed to `calculateTrajectory`. */
  input: BallisticInput;
}

const STD_WEATHER: WeatherSnapshot = {
  temperature: 15,
  humidity: 50,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: '',
};

const COLD_DRY: WeatherSnapshot = {
  ...STD_WEATHER,
  temperature: -10,
  humidity: 20,
  pressure: 1020,
};

const HOT_HUMID: WeatherSnapshot = {
  ...STD_WEATHER,
  temperature: 35,
  humidity: 90,
  pressure: 1005,
};

const ALTITUDE_1500: WeatherSnapshot = {
  ...STD_WEATHER,
  altitude: 1500,
  pressure: 845,
  temperature: 5,
};

const CROSSWIND_5MS: WeatherSnapshot = {
  ...STD_WEATHER,
  windSpeed: 5,
  windAngle: 90,
};

export const GOLDEN_FIXTURES: GoldenFixture[] = [
  {
    id: '01-22-pellet-30m-std',
    description: '.22 pellet 18gr @ 280 m/s, zero 30m, ICAO standard, no wind',
    caliber: '.22',
    projectileType: 'pellet',
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 40,
      zeroRange: 30,
      maxRange: 60,
      rangeStep: 10,
      dragModel: 'G1',
      weather: STD_WEATHER,
    },
  },
  {
    id: '02-22-slug-100m-std',
    description: '.22 slug 25gr @ 320 m/s, zero 50m, max 100m, ICAO',
    caliber: '.22',
    projectileType: 'slug',
    input: {
      muzzleVelocity: 320,
      bc: 0.085,
      projectileWeight: 25,
      sightHeight: 45,
      zeroRange: 50,
      maxRange: 100,
      rangeStep: 20,
      dragModel: 'G1',
      weather: STD_WEATHER,
    },
  },
  {
    id: '03-25-heavy-75m-altitude',
    description: '.25 heavy pellet 33gr @ 270 m/s, zero 40m, altitude 1500m',
    caliber: '.25',
    projectileType: 'pellet',
    input: {
      muzzleVelocity: 270,
      bc: 0.038,
      projectileWeight: 33,
      sightHeight: 50,
      zeroRange: 40,
      maxRange: 80,
      rangeStep: 20,
      dragModel: 'G1',
      weather: ALTITUDE_1500,
    },
  },
  {
    id: '04-30-long-range-150m',
    description: '.30 slug 50gr @ 290 m/s, zero 100m, max 150m, long range',
    caliber: '.30',
    projectileType: 'slug',
    input: {
      muzzleVelocity: 290,
      bc: 0.12,
      projectileWeight: 50,
      sightHeight: 55,
      zeroRange: 100,
      maxRange: 150,
      rangeStep: 30,
      dragModel: 'G1',
      weather: STD_WEATHER,
    },
  },
  {
    id: '05-177-fieldtarget-25m',
    description: '.177 pellet 8.4gr @ 240 m/s, zero 25m, field target',
    caliber: '.177',
    projectileType: 'pellet',
    input: {
      muzzleVelocity: 240,
      bc: 0.018,
      projectileWeight: 8.4,
      sightHeight: 38,
      zeroRange: 25,
      maxRange: 50,
      rangeStep: 10,
      dragModel: 'G1',
      weather: STD_WEATHER,
    },
  },
  {
    id: '06-22-cold-dry',
    description: '.22 pellet 18gr, cold (-10°C) dry (20% RH) — same gun as #01',
    caliber: '.22',
    projectileType: 'pellet',
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 40,
      zeroRange: 30,
      maxRange: 60,
      rangeStep: 10,
      dragModel: 'G1',
      weather: COLD_DRY,
    },
  },
  {
    id: '07-22-hot-humid',
    description: '.22 pellet 18gr, hot (35°C) humid (90% RH) — same gun as #01',
    caliber: '.22',
    projectileType: 'pellet',
    input: {
      muzzleVelocity: 280,
      bc: 0.025,
      projectileWeight: 18,
      sightHeight: 40,
      zeroRange: 30,
      maxRange: 60,
      rangeStep: 10,
      dragModel: 'G1',
      weather: HOT_HUMID,
    },
  },
  {
    id: '08-25-slug-altitude-1500',
    description: '.25 slug 38gr @ 280 m/s, zero 50m, altitude 1500m, crosswind 5 m/s',
    caliber: '.25',
    projectileType: 'slug',
    input: {
      muzzleVelocity: 280,
      bc: 0.095,
      projectileWeight: 38,
      sightHeight: 50,
      zeroRange: 50,
      maxRange: 100,
      rangeStep: 20,
      dragModel: 'G1',
      weather: { ...ALTITUDE_1500, ...CROSSWIND_5MS, altitude: 1500, pressure: 845 },
    },
  },
];
