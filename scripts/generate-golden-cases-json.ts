/**
 * Generates `/mnt/documents/golden-cases.json` — 10 complete golden
 * cases serialized in the canonical `external-case-json` v1 pivot format.
 *
 * Honesty contract
 * ----------------
 *  - The engine outputs embedded as `references[].rows` are computed
 *    HERE by `calculateTrajectory` (deterministic, no AI).
 *  - This means the file is a **self-reference snapshot**, not an
 *    external oracle. We mark every reference accordingly :
 *      `meta.source = "auxiliary"`
 *      `meta.confidence = "B"` (deterministic, traceable, but circular
 *      against the engine itself)
 *      `meta.extractionMethod = "manual-entry"`
 *      `meta.assumptions[]` explicitly states the circularity.
 *  - To convert any of these cases into a TRUE oracle, swap the rows
 *    block for values exported from ChairGun / Strelok / MERO and bump
 *    `meta.source` + `meta.confidence` accordingly.
 *
 * Coverage
 * --------
 *  10 cases spanning calibres .177 / .22 / .25 / .30, pellet vs slug,
 *  ICAO vs cold/hot/altitude/crosswind, short to long zero. Same
 *  general shape as the in-repo `GOLDEN_FIXTURES` snapshot suite, with
 *  two extra cases for cross-wind and far long-range.
 *
 * Output : /mnt/documents/golden-cases.json
 * Usage  : bun scripts/generate-golden-cases-json.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { calculateTrajectory } from '../src/lib/ballistics';
import type { BallisticInput, WeatherSnapshot } from '../src/lib/types';

// ----------------------------------------------------------------------------
// Atmospheres
// ----------------------------------------------------------------------------

const ICAO: WeatherSnapshot = {
  temperature: 15,
  humidity: 50,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windAngle: 0,
  source: 'manual',
  timestamp: '',
};

const COLD_DRY: WeatherSnapshot = { ...ICAO, temperature: -10, humidity: 20, pressure: 1020 };
const HOT_HUMID: WeatherSnapshot = { ...ICAO, temperature: 35, humidity: 90, pressure: 1005 };
const ALTITUDE_1500: WeatherSnapshot = { ...ICAO, altitude: 1500, pressure: 845, temperature: 5 };
const CROSSWIND_5: WeatherSnapshot = { ...ICAO, windSpeed: 5, windAngle: 90 };
const HEADWIND_3: WeatherSnapshot = { ...ICAO, windSpeed: 3, windAngle: 0 };

// ----------------------------------------------------------------------------
// Case definitions
// ----------------------------------------------------------------------------

interface CaseSpec {
  caseId: string;
  title: string;
  description: string;
  tags: string[];
  projectile: {
    name: string;
    type: 'pellet' | 'slug';
    caliber: string;
    diameterMm: number;
    weightGrains: number;
    bc: number;
    bcModel: 'G1';
  };
  optic: { sightHeight: number; zeroDistance: number };
  range: { rangeStart: number; rangeMax: number; rangeStep: number };
  muzzleVelocity: number;
  weather: WeatherSnapshot;
  comment?: string;
}

const SPECS: CaseSpec[] = [
  {
    caseId: '01-22-jsb-18gr-280-zero30-icao',
    title: '.22 JSB Exact Jumbo Heavy 18.13 gr @ 280 m/s — zero 30 m, ICAO',
    description: 'Pellet .22 standard, atmosphère ICAO, vent nul. Cas pédagogique de référence.',
    tags: ['.22', 'pellet', 'zero-30', 'icao'],
    projectile: { name: 'JSB Exact Jumbo Heavy', type: 'pellet', caliber: '.22', diameterMm: 5.52, weightGrains: 18.13, bc: 0.030, bcModel: 'G1' },
    optic: { sightHeight: 50, zeroDistance: 30 },
    range: { rangeStart: 10, rangeMax: 100, rangeStep: 10 },
    muzzleVelocity: 280,
    weather: ICAO,
  },
  {
    caseId: '02-22-jsb-18gr-280-zero30-cold',
    title: '.22 JSB 18.13 gr @ 280 m/s — zero 30 m, -10 °C / 20 % RH',
    description: 'Même setup que #01 mais conditions hivernales sèches.',
    tags: ['.22', 'pellet', 'zero-30', 'cold'],
    projectile: { name: 'JSB Exact Jumbo Heavy', type: 'pellet', caliber: '.22', diameterMm: 5.52, weightGrains: 18.13, bc: 0.030, bcModel: 'G1' },
    optic: { sightHeight: 50, zeroDistance: 30 },
    range: { rangeStart: 10, rangeMax: 100, rangeStep: 10 },
    muzzleVelocity: 280,
    weather: COLD_DRY,
  },
  {
    caseId: '03-22-jsb-18gr-280-zero30-hot',
    title: '.22 JSB 18.13 gr @ 280 m/s — zero 30 m, 35 °C / 90 % RH',
    description: 'Même setup que #01 mais conditions estivales humides.',
    tags: ['.22', 'pellet', 'zero-30', 'hot'],
    projectile: { name: 'JSB Exact Jumbo Heavy', type: 'pellet', caliber: '.22', diameterMm: 5.52, weightGrains: 18.13, bc: 0.030, bcModel: 'G1' },
    optic: { sightHeight: 50, zeroDistance: 30 },
    range: { rangeStart: 10, rangeMax: 100, rangeStep: 10 },
    muzzleVelocity: 280,
    weather: HOT_HUMID,
  },
  {
    caseId: '04-177-jsb-84gr-240-zero25-icao',
    title: '.177 JSB Exact 8.44 gr @ 240 m/s — zero 25 m, ICAO',
    description: 'Pellet .177 field-target, ICAO, vent nul.',
    tags: ['.177', 'pellet', 'zero-25', 'field-target'],
    projectile: { name: 'JSB Exact 4.52 mm', type: 'pellet', caliber: '.177', diameterMm: 4.52, weightGrains: 8.44, bc: 0.018, bcModel: 'G1' },
    optic: { sightHeight: 38, zeroDistance: 25 },
    range: { rangeStart: 10, rangeMax: 50, rangeStep: 5 },
    muzzleVelocity: 240,
    weather: ICAO,
  },
  {
    caseId: '05-22-slug-25gr-320-zero50-icao',
    title: '.22 NSA slug 25 gr @ 320 m/s — zero 50 m, ICAO',
    description: 'Slug .22 standard, ICAO, vent nul.',
    tags: ['.22', 'slug', 'zero-50'],
    projectile: { name: 'Nielsen NSA 25 gr', type: 'slug', caliber: '.22', diameterMm: 5.55, weightGrains: 25, bc: 0.085, bcModel: 'G1' },
    optic: { sightHeight: 45, zeroDistance: 50 },
    range: { rangeStart: 10, rangeMax: 150, rangeStep: 10 },
    muzzleVelocity: 320,
    weather: ICAO,
  },
  {
    caseId: '06-25-jsb-336gr-270-zero40-altitude',
    title: '.25 JSB Exact King 33.95 gr @ 270 m/s — zero 40 m, altitude 1500 m',
    description: 'Pellet .25 lourd, altitude 1500 m, vent nul.',
    tags: ['.25', 'pellet', 'zero-40', 'altitude'],
    projectile: { name: 'JSB Exact King 25.39 mm', type: 'pellet', caliber: '.25', diameterMm: 6.35, weightGrains: 33.95, bc: 0.038, bcModel: 'G1' },
    optic: { sightHeight: 50, zeroDistance: 40 },
    range: { rangeStart: 10, rangeMax: 100, rangeStep: 10 },
    muzzleVelocity: 270,
    weather: ALTITUDE_1500,
  },
  {
    caseId: '07-25-slug-38gr-280-zero50-altitude-crosswind',
    title: '.25 slug 38 gr @ 280 m/s — zero 50 m, altitude 1500 m + crosswind 5 m/s',
    description: 'Slug .25, altitude + vent travers full value 90°.',
    tags: ['.25', 'slug', 'zero-50', 'altitude', 'crosswind'],
    projectile: { name: 'Generic .25 slug 38 gr', type: 'slug', caliber: '.25', diameterMm: 6.35, weightGrains: 38, bc: 0.095, bcModel: 'G1' },
    optic: { sightHeight: 50, zeroDistance: 50 },
    range: { rangeStart: 10, rangeMax: 150, rangeStep: 10 },
    muzzleVelocity: 280,
    weather: { ...ALTITUDE_1500, windSpeed: 5, windAngle: 90 },
  },
  {
    caseId: '08-30-slug-50gr-290-zero100-icao',
    title: '.30 slug 50 gr @ 290 m/s — zero 100 m, ICAO',
    description: 'Slug .30 long-range, ICAO, vent nul.',
    tags: ['.30', 'slug', 'zero-100', 'long-range'],
    projectile: { name: 'Generic .30 slug 50 gr', type: 'slug', caliber: '.30', diameterMm: 7.62, weightGrains: 50, bc: 0.12, bcModel: 'G1' },
    optic: { sightHeight: 55, zeroDistance: 100 },
    range: { rangeStart: 25, rangeMax: 200, rangeStep: 25 },
    muzzleVelocity: 290,
    weather: ICAO,
  },
  {
    caseId: '09-22-jsb-18gr-280-zero30-crosswind',
    title: '.22 JSB 18.13 gr @ 280 m/s — zero 30 m, ICAO + crosswind 5 m/s',
    description: 'Même setup que #01 + vent travers full value pour exposer windDrift non-trivial.',
    tags: ['.22', 'pellet', 'zero-30', 'crosswind'],
    projectile: { name: 'JSB Exact Jumbo Heavy', type: 'pellet', caliber: '.22', diameterMm: 5.52, weightGrains: 18.13, bc: 0.030, bcModel: 'G1' },
    optic: { sightHeight: 50, zeroDistance: 30 },
    range: { rangeStart: 10, rangeMax: 100, rangeStep: 10 },
    muzzleVelocity: 280,
    weather: CROSSWIND_5,
  },
  {
    caseId: '10-22-jsb-18gr-280-zero30-headwind',
    title: '.22 JSB 18.13 gr @ 280 m/s — zero 30 m, ICAO + headwind 3 m/s',
    description: 'Même setup que #01 + vent de face pour vérifier impact TOF.',
    tags: ['.22', 'pellet', 'zero-30', 'headwind'],
    projectile: { name: 'JSB Exact Jumbo Heavy', type: 'pellet', caliber: '.22', diameterMm: 5.52, weightGrains: 18.13, bc: 0.030, bcModel: 'G1' },
    optic: { sightHeight: 50, zeroDistance: 30 },
    range: { rangeStart: 10, rangeMax: 100, rangeStep: 10 },
    muzzleVelocity: 280,
    weather: HEADWIND_3,
  },
];

// ----------------------------------------------------------------------------
// Build pivot JSON
// ----------------------------------------------------------------------------

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

function buildEngineRows(spec: CaseSpec) {
  const input: BallisticInput = {
    muzzleVelocity: spec.muzzleVelocity,
    bc: spec.projectile.bc,
    projectileWeight: spec.projectile.weightGrains,
    sightHeight: spec.optic.sightHeight,
    zeroRange: spec.optic.zeroDistance,
    maxRange: spec.range.rangeMax,
    rangeStep: spec.range.rangeStep,
    dragModel: spec.projectile.bcModel,
    weather: spec.weather,
    projectileDiameter: spec.projectile.diameterMm,
  };
  const rows = calculateTrajectory(input);
  // Filter to range >= rangeStart (engine emits range=0 muzzle row).
  return rows
    .filter((r) => r.range >= spec.range.rangeStart)
    .map((r) => ({
      range: r.range,
      drop: round(r.drop, 2),
      velocity: round(r.velocity, 2),
      tof: round(r.tof, 4),
      windDrift: round(r.windDrift, 2),
      energy: round(r.energy, 2),
    }));
}

function buildPivotCase(spec: CaseSpec) {
  const w = spec.weather;
  const rows = buildEngineRows(spec);
  const inputs: Record<string, unknown> = {
    projectileName: spec.projectile.name,
    projectileType: spec.projectile.type,
    caliber: spec.projectile.caliber,
    diameterMm: spec.projectile.diameterMm,
    weightGrains: spec.projectile.weightGrains,
    bc: spec.projectile.bc,
    bcModel: spec.projectile.bcModel,
    muzzleVelocity: spec.muzzleVelocity,
    sightHeight: spec.optic.sightHeight,
    zeroDistance: spec.optic.zeroDistance,
    temperatureC: w.temperature,
    pressureHpaAbsolute: w.pressure,
    humidityPercent: w.humidity,
    altitudeM: w.altitude,
    windSpeed: w.windSpeed,
    windDirection: w.windAngle,
    windConvention: '0deg=12h-headwind',
    rangeStart: spec.range.rangeStart,
    rangeMax: spec.range.rangeMax,
    rangeStep: spec.range.rangeStep,
    sourceUnitsNote: 'm, mm, m/s, hPa absolu',
  };
  if (spec.comment) inputs.comment = spec.comment;

  return {
    caseId: spec.caseId,
    title: spec.title,
    description: spec.description,
    tags: spec.tags,
    inputs,
    references: [
      {
        meta: {
          source: 'auxiliary' as const,
          version: 'airballistik-engine self-reference (G1 ChairGun table, Euler, ICAO)',
          confidence: 'B' as const,
          extractionMethod: 'manual-entry' as const,
          extractedAt: new Date().toISOString().slice(0, 10),
          operator: 'generate-golden-cases-json.ts',
          assumptions: [
            'CIRCULAR REFERENCE — outputs computed by AirBallistik engine itself, NOT an external oracle',
            'BC interpreted as G1 with ChairGun lookup table',
            'Atmosphere as specified above (no implicit ICAO fallback)',
            'Wind convention: 0° = headwind at 12 o\'clock, clockwise',
            'Signed drop: negative = below line of sight',
            'windDrift includes spin-drift contribution if applicable (zero here, no twist rate set)',
          ],
          notes:
            'To turn this into a real oracle, replace the rows[] block with values exported from ChairGun / Strelok / MERO and bump meta.source + meta.confidence accordingly.',
        },
        rows,
      },
    ],
    schemaVersion: 1 as const,
  };
}

function main() {
  const cases = SPECS.map(buildPivotCase);

  // Sanity : every case has at least 5 rows.
  for (const c of cases) {
    if (c.references[0].rows.length < 5) {
      throw new Error(`Case ${c.caseId} produced only ${c.references[0].rows.length} rows`);
    }
  }

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generator:
      'scripts/generate-golden-cases-json.ts — deterministic engine self-reference (no AI)',
    note:
      'These cases use the AirBallistik engine as their own reference (circular). They are useful for non-regression and onboarding, NOT for engine validation against an external oracle. See docs/handoff/golden-cases-request.md for sourcing real external references.',
    cases,
  };

  const outDir = '/mnt/documents';
  try {
    mkdirSync(outDir, { recursive: true });
  } catch {
    // noop
  }
  const outPath = join(outDir, 'golden-cases.json');
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`✓ Wrote ${outPath}`);
  console.log(`  ${cases.length} cases, total ${cases.reduce((s, c) => s + c.references[0].rows.length, 0)} rows.`);
  for (const c of cases) {
    console.log(`  - ${c.caseId} → ${c.references[0].rows.length} rows`);
  }
}

main();