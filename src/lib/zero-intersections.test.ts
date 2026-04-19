import { describe, it, expect } from 'vitest';
import { computeZeroIntersections } from './zero-intersections';
import type { BallisticResult } from './types';

/**
 * Tranche O — tests du helper pur Near/Far Zero.
 * Convention drop : mm, 0 = ligne de visée, négatif = sous, positif = au-dessus.
 */

function row(range: number, drop: number): BallisticResult {
  return {
    range,
    drop,
    holdover: 0,
    holdoverMRAD: 0,
    velocity: 0,
    energy: 0,
    tof: 0,
    windDrift: 0,
    windDriftMOA: 0,
    windDriftMRAD: 0,
  };
}

describe('computeZeroIntersections — empty / degenerate inputs', () => {
  it('retourne insufficient pour null/undefined', () => {
    const a = computeZeroIntersections(null);
    expect(a.nearZeroDistance).toBeNull();
    expect(a.farZeroDistance).toBeNull();
    expect(a.nearMissingReason).toBe('insufficient');
    expect(a.farMissingReason).toBe('insufficient');

    const b = computeZeroIntersections(undefined);
    expect(b.nearMissingReason).toBe('insufficient');
  });

  it('retourne insufficient pour < 2 rows', () => {
    const r = computeZeroIntersections([row(0, -50)]);
    expect(r.nearMissingReason).toBe('insufficient');
    expect(r.farMissingReason).toBe('insufficient');
  });
});

describe('computeZeroIntersections — typical PCP trajectory (2 crossings)', () => {
  it('détecte near + far par interpolation linéaire', () => {
    // Tir avec sight-height ~50mm sous LOS au muzzle, monte au-dessus,
    // redescend. Crossings attendus ~12.5m (montée) et ~37.5m (redescente).
    const traj: BallisticResult[] = [
      row(0, -50),
      row(10, -10),
      row(15, 10), // crossing entre 10 et 15
      row(20, 20),
      row(30, 10),
      row(40, -10), // crossing entre 30 et 40
      row(50, -40),
    ];
    const r = computeZeroIntersections(traj);
    expect(r.nearZeroDistance).toBeCloseTo(12.5, 5);
    expect(r.farZeroDistance).toBeCloseTo(35, 5);
    expect(r.nearExactSample).toBe(false);
    expect(r.farExactSample).toBe(false);
    expect(r.nearMissingReason).toBeNull();
    expect(r.farMissingReason).toBeNull();
  });
});

describe('computeZeroIntersections — exact-sample handling', () => {
  it('un point exactement sur la LOS compte comme crossing exact', () => {
    const traj: BallisticResult[] = [
      row(0, -50),
      row(15, 0), // exact hit
      row(30, 20),
      row(45, 0), // exact hit
      row(60, -30),
    ];
    const r = computeZeroIntersections(traj);
    expect(r.nearZeroDistance).toBe(15);
    expect(r.farZeroDistance).toBe(45);
    expect(r.nearExactSample).toBe(true);
    expect(r.farExactSample).toBe(true);
  });

  it("ne double-compte pas un crossing exact suivi d'un point du même côté", () => {
    // Après avoir touché 0 à 15m, le drop redescend (négatif) — c'est un
    // re-croisement éventuel, mais surtout le sample exact à 15 ne doit pas
    // être confondu avec un sign-change ensuite.
    const traj: BallisticResult[] = [
      row(0, -50),
      row(15, 0), // exact
      row(20, -5), // descend immédiatement → ce n'est PAS un nouveau crossing
      row(30, -30),
    ];
    const r = computeZeroIntersections(traj);
    expect(r.nearZeroDistance).toBe(15);
    expect(r.nearExactSample).toBe(true);
    // Far doit rester null (un seul croisement)
    expect(r.farZeroDistance).toBeNull();
    expect(r.farMissingReason).toBe('out-of-range');
  });
});

describe('computeZeroIntersections — single crossing only', () => {
  it('expose near et marque far hors plage', () => {
    const traj: BallisticResult[] = [
      row(0, -50),
      row(10, -20),
      row(20, 5), // unique crossing
      row(30, 25),
      row(40, 30), // continue à monter, pas de redescente capturée
    ];
    const r = computeZeroIntersections(traj);
    expect(r.nearZeroDistance).toBeCloseTo(18, 5);
    expect(r.farZeroDistance).toBeNull();
    expect(r.nearMissingReason).toBeNull();
    expect(r.farMissingReason).toBe('out-of-range');
  });
});

describe('computeZeroIntersections — no crossing observable', () => {
  it('retourne out-of-range pour les deux quand jamais au-dessus de la LOS', () => {
    const traj: BallisticResult[] = [
      row(0, -50),
      row(10, -55),
      row(20, -70),
      row(30, -100),
    ];
    const r = computeZeroIntersections(traj);
    expect(r.nearZeroDistance).toBeNull();
    expect(r.farZeroDistance).toBeNull();
    expect(r.nearMissingReason).toBe('out-of-range');
    expect(r.farMissingReason).toBe('out-of-range');
  });
});

describe('computeZeroIntersections — robustness', () => {
  it("ignore un éventuel hit exact à range 0 (muzzle dégénéré)", () => {
    const traj: BallisticResult[] = [
      row(0, 0),
      row(10, -10),
      row(20, -30),
    ];
    const r = computeZeroIntersections(traj);
    expect(r.nearZeroDistance).toBeNull();
    expect(r.farZeroDistance).toBeNull();
  });

  it('ne renvoie jamais plus de 2 crossings (oscillations numériques)', () => {
    // Trajectoire aberrante avec 3 sign-changes — on ne garde que les 2 premiers.
    const traj: BallisticResult[] = [
      row(0, -10),
      row(10, 10), // c1
      row(20, -10), // c2
      row(30, 10), // c3 — doit être ignoré
      row(40, -10),
    ];
    const r = computeZeroIntersections(traj);
    expect(r.nearZeroDistance).toBeCloseTo(5, 5);
    expect(r.farZeroDistance).toBeCloseTo(15, 5);
  });

  it("interpolation correcte quand drop varie linéairement", () => {
    const traj: BallisticResult[] = [row(20, -8), row(30, 2)];
    const r = computeZeroIntersections(traj);
    // crossing à 20 + 8/10 * 10 = 28
    expect(r.nearZeroDistance).toBeCloseTo(28, 5);
  });
});
