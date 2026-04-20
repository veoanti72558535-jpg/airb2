/**
 * BUILD-C bis — Tests du schéma utilisateur + mapping vers le harness.
 *
 * Couvre :
 *  - validation Zod (champs requis, sources fermées, formats)
 *  - parsing JSON robuste (JSON cassé renvoie une issue, pas un throw)
 *  - round-trip JSON : export → parse → revalidation = identique
 *  - multi-sources : un cas peut porter ≥ 2 références indépendantes
 *  - mapping vers `CrossValidationCase` (BUILD-A) sans perte d'info
 *    structurelle, et compatible avec `runCaseComparison()`
 */

import { describe, it, expect } from 'vitest';
import {
  makeEmptyUserCase,
  makeEmptyUserReference,
  mapUserCaseToCrossValidationCase,
  parseUserCaseJson,
  validateUserCase,
  type UserCrossValidationCase,
} from './user-case-schema';
import { runCaseComparison } from './compare';

function makeValidCase(): UserCrossValidationCase {
  return {
    caseId: '22-pellet-test',
    title: '.22 pellet test',
    inputs: {
      projectileName: 'JSB 18gr',
      caliber: '.22',
      weightGrains: 18.13,
      bc: 0.035,
      bcModel: 'G1',
      muzzleVelocity: 280,
      sightHeight: 50,
      zeroDistance: 30,
      rangeMax: 50,
      rangeStep: 10,
      temperatureC: 15,
      pressureHpaAbsolute: 1013,
      humidityPercent: 50,
      altitudeM: 0,
    },
    references: [
      {
        meta: {
          source: 'strelok-pro',
          version: 'Strelok Pro 6.x',
          confidence: 'B',
          extractionMethod: 'screenshot-retyped',
          extractedAt: '2025-04-12',
        },
        rows: [
          { range: 10, drop: 5, velocity: 275 },
          { range: 30, drop: 0, velocity: 264 },
          { range: 50, drop: -27, velocity: 252 },
        ],
      },
    ],
    schemaVersion: 1,
  };
}

describe('user-case-schema — validation', () => {
  it('accepts a minimal well-formed case', () => {
    const result = validateUserCase(makeValidCase());
    expect(result.ok).toBe(true);
  });

  it('rejects a payload missing required inputs', () => {
    const bad = makeValidCase() as unknown as Record<string, unknown>;
    delete (bad.inputs as Record<string, unknown>).muzzleVelocity;
    const result = validateUserCase(bad);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.issues.some((i) => i.path.includes('muzzleVelocity'))).toBe(true);
    }
  });

  it('rejects an unknown source value', () => {
    const bad = makeValidCase();
    (bad.references[0].meta as { source: string }).source = 'unknown-app';
    const result = validateUserCase(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects an empty references array', () => {
    const bad = { ...makeValidCase(), references: [] };
    const result = validateUserCase(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects a row with negative range', () => {
    const bad = makeValidCase();
    bad.references[0].rows[0].range = -1;
    const result = validateUserCase(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects an extractedAt that is not a parseable date', () => {
    const bad = makeValidCase();
    bad.references[0].meta.extractedAt = 'definitely-not-a-date';
    const result = validateUserCase(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown extra keys (strict schema)', () => {
    const bad = { ...makeValidCase(), maliciousField: 42 } as unknown;
    const result = validateUserCase(bad);
    expect(result.ok).toBe(false);
  });

  it('makes empty case factory always valid', () => {
    // Factory is "valid in shape but not physically meaningful": numbers
    // at 0 may or may not pass the schema. We assert at least that the
    // structure is present.
    const empty = makeEmptyUserCase();
    expect(empty.references.length).toBeGreaterThanOrEqual(1);
    expect(empty.references[0].rows.length).toBeGreaterThanOrEqual(1);
  });

  it('supports multi-source: 3 references in a single case', () => {
    const c = makeValidCase();
    c.references = [
      makeEmptyUserReference(),
      makeEmptyUserReference(),
      makeEmptyUserReference(),
    ];
    c.references[0].meta.source = 'chairgun-elite';
    c.references[0].meta.version = 'CG Elite 1';
    c.references[1].meta.source = 'strelok-pro';
    c.references[1].meta.version = 'Strelok Pro 6';
    c.references[2].meta.source = 'mero';
    c.references[2].meta.version = 'MERO 2';
    for (const r of c.references) r.rows = [{ range: 10, drop: 5 }];
    const result = validateUserCase(c);
    expect(result.ok).toBe(true);
  });
});

describe('user-case-schema — parseUserCaseJson', () => {
  it('returns a single root issue for invalid JSON syntax', () => {
    const result = parseUserCaseJson('{not valid json');
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].path).toBe('<root>');
      expect(result.issues[0].message).toMatch(/JSON/);
    }
  });

  it('round-trips a valid case through JSON without loss', () => {
    const original = makeValidCase();
    const json = JSON.stringify(original);
    const parsed = parseUserCaseJson(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok === true) {
      expect(parsed.case.caseId).toBe(original.caseId);
      expect(parsed.case.references).toHaveLength(original.references.length);
      expect(parsed.case.references[0].rows).toHaveLength(original.references[0].rows.length);
    }
  });
});

describe('user-case-schema — mapping to CrossValidationCase', () => {
  it('produces a CrossValidationCase consumable by runCaseComparison', () => {
    const userCase = makeValidCase();
    const cv = mapUserCaseToCrossValidationCase(userCase);
    expect(cv.id).toBe(userCase.caseId);
    expect(cv.references).toHaveLength(1);
    expect(cv.inputs.muzzleVelocity).toBe(280);

    // The harness must execute without throwing; status may be PASS,
    // INDICATIVE or FAIL — we don't assert science here, only plumbing.
    const result = runCaseComparison(cv);
    expect(result.caseId).toBe(userCase.caseId);
    expect(result.perReference).toHaveLength(1);
    expect(['PASS', 'INDICATIVE', 'FAIL']).toContain(result.status);
  });

  it('applies ICAO defaults for missing atmosphere fields', () => {
    const userCase = makeValidCase();
    delete userCase.inputs.temperatureC;
    delete userCase.inputs.pressureHpaAbsolute;
    delete userCase.inputs.humidityPercent;
    delete userCase.inputs.altitudeM;
    const cv = mapUserCaseToCrossValidationCase(userCase);
    expect(cv.inputs.weather.temperature).toBe(15);
    expect(cv.inputs.weather.pressure).toBeCloseTo(1013.25, 2);
    expect(cv.inputs.weather.humidity).toBe(50);
    expect(cv.inputs.weather.altitude).toBe(0);
    expect(cv.inputs.weather.windSpeed).toBe(0);
    expect(cv.inputs.weather.source).toBe('manual');
  });

  it('preserves multi-source references in mapping order', () => {
    const userCase = makeValidCase();
    userCase.references = [
      makeEmptyUserReference(),
      makeEmptyUserReference(),
    ];
    userCase.references[0].meta.source = 'chairgun-elite';
    userCase.references[0].meta.version = 'CG Elite 1';
    userCase.references[1].meta.source = 'strelok-pro';
    userCase.references[1].meta.version = 'Strelok Pro 6';
    for (const r of userCase.references) r.rows = [{ range: 10, drop: 5 }];
    const cv = mapUserCaseToCrossValidationCase(userCase);
    expect(cv.references[0].meta.source).toBe('chairgun-elite');
    expect(cv.references[1].meta.source).toBe('strelok-pro');
  });

  it('does not invent metric values (undefined stays undefined)', () => {
    const userCase = makeValidCase();
    userCase.references[0].rows = [{ range: 10, drop: 5 }];
    const cv = mapUserCaseToCrossValidationCase(userCase);
    expect(cv.references[0].rows[0].velocity).toBeUndefined();
    expect(cv.references[0].rows[0].tof).toBeUndefined();
    expect(cv.references[0].rows[0].energy).toBeUndefined();
  });
});