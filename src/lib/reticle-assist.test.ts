/**
 * Tranche I — Tests du helper pur reticle-assist.
 */
import { describe, it, expect } from 'vitest';
import {
  buildReticleAssist,
  pickBetweenMarks,
  pickNearestMark,
} from './reticle-assist';
import type { BallisticResult, Optic, Reticle } from './types';

function mkOptic(extras: Partial<Optic> = {}): Optic {
  return {
    id: 'opt-1',
    name: 'Test optic',
    clickUnit: 'MRAD',
    clickValue: 0.1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...extras,
  };
}

function mkReticle(extras: Partial<Reticle> = {}): Reticle {
  return {
    id: 'ret-1',
    brand: 'Acme',
    model: 'Mil-Dot',
    type: 'mil-dot',
    unit: 'MRAD',
    subtension: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...extras,
  };
}

function mkRow(range: number, holdMOA: number, holdMRAD: number): BallisticResult {
  return {
    range,
    drop: -range * 0.5,
    holdover: holdMOA,
    holdoverMRAD: holdMRAD,
    velocity: 280 - range * 0.5,
    energy: 30 - range * 0.1,
    tof: range * 0.005,
    windDrift: range * 0.2,
    windDriftMOA: holdMOA * 0.3,
    windDriftMRAD: holdMRAD * 0.3,
  };
}

const ROWS = [
  mkRow(0, 0, 0),
  mkRow(50, 1.2, 0.35),
  mkRow(100, 4.5, 1.31),
];

describe('reticle-assist — helpers', () => {
  it('pickNearestMark renvoie null si marks vide ou absent', () => {
    expect(pickNearestMark(1.2)).toBeNull();
    expect(pickNearestMark(1.2, [])).toBeNull();
  });

  it('pickNearestMark sélectionne le repère le plus proche en valeur absolue', () => {
    expect(pickNearestMark(1.2, [0, 0.5, 1, 1.5, 2])).toBe(1);
    expect(pickNearestMark(-1.4, [0, 0.5, 1, 1.5, 2])).toBe(1.5);
    expect(pickNearestMark(0.7, [0.5, 1])).toBe(0.5);
  });

  it('pickBetweenMarks encadre proprement', () => {
    expect(pickBetweenMarks(1.2, [0, 1, 2])).toEqual([1, 2]);
    expect(pickBetweenMarks(1, [0, 1, 2])).toBeNull(); // strictement entre
    expect(pickBetweenMarks(5, [0, 1, 2])).toBeNull(); // hors plage
    expect(pickBetweenMarks(0.5, [0, 1])).toEqual([0, 1]);
    expect(pickBetweenMarks(0.5)).toBeNull();
    expect(pickBetweenMarks(0.5, [1])).toBeNull();
  });
});

describe('reticle-assist — buildReticleAssist', () => {
  it('renvoie no-optic quand aucune optique', () => {
    const a = buildReticleAssist({
      optic: null,
      getReticleById: () => undefined,
      results: ROWS,
      distances: [50],
    });
    expect(a.status).toBe('no-optic');
    expect(a.rows).toEqual([]);
  });

  it('renvoie no-reticle quand l\'optique n\'a pas de reticleId', () => {
    const a = buildReticleAssist({
      optic: mkOptic(),
      getReticleById: () => undefined,
      results: ROWS,
      distances: [50],
    });
    expect(a.status).toBe('no-reticle');
    expect(a.optic).toBeDefined();
  });

  it('renvoie reticle-missing quand reticleId pointe sur un id inconnu', () => {
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: 'ghost' }),
      getReticleById: () => undefined,
      results: ROWS,
      distances: [50],
    });
    expect(a.status).toBe('reticle-missing');
  });

  it('renvoie ok et lit le holdover en MRAD pour un réticule MRAD', () => {
    const ret = mkReticle({ unit: 'MRAD', marks: [0, 0.5, 1, 1.5, 2] });
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: ret.id }),
      getReticleById: () => ret,
      results: ROWS,
      distances: [50, 100],
    });
    expect(a.status).toBe('ok');
    expect(a.unit).toBe('MRAD');
    expect(a.rows).toHaveLength(2);
    expect(a.rows[0].vertical).toBeCloseTo(0.35, 5);
    expect(a.rows[1].vertical).toBeCloseTo(1.31, 5);
    // wind = MRAD wind = 0.35 * 0.3
    expect(a.rows[0].wind).toBeCloseTo(0.105, 5);
  });

  it('renvoie ok et lit le holdover en MOA pour un réticule MOA', () => {
    const ret = mkReticle({ unit: 'MOA', marks: [0, 1, 2, 3, 4, 5] });
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: ret.id }),
      getReticleById: () => ret,
      results: ROWS,
      distances: [50, 100],
    });
    expect(a.status).toBe('ok');
    expect(a.unit).toBe('MOA');
    expect(a.rows[0].vertical).toBeCloseTo(1.2, 5);
    expect(a.rows[1].vertical).toBeCloseTo(4.5, 5);
  });

  it('signale degraded=no-marks quand le réticule n\'a pas de marks', () => {
    const ret = mkReticle({ marks: undefined });
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: ret.id }),
      getReticleById: () => ret,
      results: ROWS,
      distances: [50],
    });
    expect(a.status).toBe('ok');
    expect(a.degraded).toBe('no-marks');
    expect(a.rows[0].nearestMark).toBeNull();
    expect(a.rows[0].betweenMarks).toBeNull();
  });

  it('expose nearestMark / betweenMarks quand marks est présent', () => {
    const ret = mkReticle({ marks: [0, 1, 2] });
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: ret.id }),
      getReticleById: () => ret,
      results: ROWS,
      distances: [100],
    });
    // holdoverMRAD à 100 = 1.31 → nearestMark = 1, between = [1, 2]
    expect(a.rows[0].nearestMark).toBe(1);
    expect(a.rows[0].betweenMarks).toEqual([1, 2]);
  });

  it('signale degraded=sfp-unsupported pour un réticule SFP sans calibration', () => {
    const ret = mkReticle({ focalPlane: 'SFP', marks: [0, 1] });
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: ret.id, magCalibration: undefined }),
      getReticleById: () => ret,
      results: ROWS,
      distances: [50],
    });
    expect(a.status).toBe('ok');
    expect(a.degraded).toBe('sfp-unsupported');
  });

  it('n\'est PAS dégradé pour un réticule SFP avec magCalibration > 0', () => {
    const ret = mkReticle({ focalPlane: 'SFP', marks: [0, 1] });
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: ret.id, magCalibration: 10 }),
      getReticleById: () => ret,
      results: ROWS,
      distances: [50],
    });
    expect(a.status).toBe('ok');
    expect(a.degraded).toBeUndefined();
  });

  it('saute les distances hors plage moteur', () => {
    const ret = mkReticle({ marks: [0, 1] });
    const a = buildReticleAssist({
      optic: mkOptic({ reticleId: ret.id }),
      getReticleById: () => ret,
      results: ROWS,
      distances: [50, 200, 300], // 200/300 hors plage
    });
    expect(a.rows).toHaveLength(1);
    expect(a.rows[0].distance).toBe(50);
  });
});
