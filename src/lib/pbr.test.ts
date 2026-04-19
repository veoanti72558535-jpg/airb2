import { describe, it, expect } from 'vitest';
import { computePointBlankRange } from './pbr';
import type { BallisticResult } from './types';

function mkRow(range: number, dropMm: number): BallisticResult {
  return {
    range,
    drop: dropMm,
    holdover: 0,
    holdoverMRAD: 0,
    velocity: 280,
    energy: 30,
    tof: range * 0.005,
    windDrift: 0,
    windDriftMOA: 0,
    windDriftMRAD: 0,
    clicksElevation: 0,
    clicksWindage: 0,
  };
}

describe('computePointBlankRange — Tranche P (helper pur)', () => {
  it('retourne insufficient quand moins de 2 lignes', () => {
    const r = computePointBlankRange([mkRow(0, -50)], 0.05);
    expect(r.missingReason).toBe('insufficient');
    expect(r.startDistance).toBeNull();
    expect(r.range).toBeNull();
  });

  it('retourne insufficient si vitalZoneM <= 0', () => {
    const rows = [mkRow(0, -50), mkRow(50, 0), mkRow(100, -50)];
    expect(computePointBlankRange(rows, 0).missingReason).toBe('insufficient');
    expect(computePointBlankRange(rows, -1).missingReason).toBe('insufficient');
  });

  it('retourne never-entered si la trajectoire reste hors fenêtre', () => {
    // diamètre 50mm → ±25mm. La trajectoire reste sous -100mm partout.
    const rows = [mkRow(0, -150), mkRow(50, -120), mkRow(100, -200)];
    const r = computePointBlankRange(rows, 0.05);
    expect(r.missingReason).toBe('never-entered');
    expect(r.startDistance).toBeNull();
    expect(r.endDistance).toBeNull();
  });

  it('détecte une fenêtre PBR avec interpolation entrée/sortie', () => {
    // Diamètre 60mm → ±30mm.
    // Trajectoire :  -90  → -10 (entre 10 et 30m, croise -30 vers le haut)
    //                  +20 → -50 (entre 50 et 70m, croise -30 vers le bas)
    const rows = [
      mkRow(0, -90),
      mkRow(10, -50),
      mkRow(30, -10),  // dans la fenêtre [-30, +30]
      mkRow(50, 20),   // dans la fenêtre
      mkRow(70, -50),  // sorti
      mkRow(90, -120),
    ];
    const r = computePointBlankRange(rows, 0.06);
    expect(r.missingReason).toBeNull();
    expect(r.startDistance).not.toBeNull();
    expect(r.endDistance).not.toBeNull();
    // Entrée entre 10m (-50) et 30m (-10) sur target -30 :
    //   t = (-30 - -50) / (-10 - -50) = 20/40 = 0.5 → 10 + 0.5*20 = 20m
    expect(r.startDistance!).toBeCloseTo(20, 5);
    // Sortie entre 50m (+20) et 70m (-50) sur target -30 :
    //   t = (-30 - 20) / (-50 - 20) = -50/-70 ≈ 0.7143 → 50 + 0.7143*20 ≈ 64.29m
    expect(r.endDistance!).toBeCloseTo(64.2857, 3);
    expect(r.range!).toBeCloseTo(r.endDistance! - r.startDistance!, 5);
    expect(r.limitedByComputedRange).toBe(false);
  });

  it('flag limitedByComputedRange si la trajectoire est encore dans la fenêtre au dernier point', () => {
    // Diamètre 80mm → ±40mm. Trajectoire entre dans la fenêtre puis y reste.
    const rows = [
      mkRow(0, -100),
      mkRow(20, -10),  // dans la fenêtre
      mkRow(40, 5),    // dans
      mkRow(60, -20),  // dans
    ];
    const r = computePointBlankRange(rows, 0.08);
    expect(r.missingReason).toBeNull();
    expect(r.limitedByComputedRange).toBe(true);
    expect(r.endDistance).toBeCloseTo(60, 5);
    expect(r.startDistance!).toBeGreaterThan(0);
    expect(r.startDistance!).toBeLessThan(20);
  });

  it("démarre à 0m si la trajectoire est déjà dans la fenêtre au point initial", () => {
    // diamètre 200mm → ±100mm. drop initial -50mm donc déjà dans la fenêtre.
    const rows = [
      mkRow(0, -50),
      mkRow(20, 30),
      mkRow(40, -20),
      mkRow(60, -200),  // sort
    ];
    const r = computePointBlankRange(rows, 0.2);
    expect(r.missingReason).toBeNull();
    expect(r.startDistance).toBe(0);
    expect(r.endDistance).not.toBeNull();
    expect(r.endDistance!).toBeGreaterThan(40);
    expect(r.endDistance!).toBeLessThan(60);
  });

  it('apex correspond au point le plus haut au-dessus de la LOS dans la fenêtre', () => {
    const rows = [
      mkRow(0, -90),
      mkRow(20, -10),
      mkRow(40, 25),
      mkRow(60, 12),
      mkRow(80, -28),
      mkRow(100, -150),
    ];
    const r = computePointBlankRange(rows, 0.06);
    expect(r.maxOrdinateDistance).toBe(40);
    expect(r.maxOrdinateMm).toBe(25);
  });

  it("ne prend que la première fenêtre — n'oscille pas après la sortie", () => {
    // Sort à ~30m, ré-entre artificiellement à 80m. Le helper doit ignorer.
    const rows = [
      mkRow(0, -100),
      mkRow(10, -10),  // dans
      mkRow(20, 5),    // dans
      mkRow(30, -50),  // sort
      mkRow(60, -200),
      mkRow(80, -10),  // ré-entre (improbable physiquement, mais on couvre)
      mkRow(100, 5),
    ];
    const r = computePointBlankRange(rows, 0.06);
    expect(r.missingReason).toBeNull();
    expect(r.endDistance!).toBeLessThan(30);
  });

  it('point exact sur la borne haute compte dedans (pas de double comptage)', () => {
    // diamètre 60mm → ±30mm. Le point à 40m vaut exactement +30mm.
    const rows = [
      mkRow(0, -80),
      mkRow(20, -10),
      mkRow(40, 30),    // exactement sur la borne haute → INCLUS
      mkRow(60, 80),    // sort vers le haut
    ];
    const r = computePointBlankRange(rows, 0.06);
    expect(r.missingReason).toBeNull();
    expect(r.startDistance).not.toBeNull();
    // endDistance interpolé entre 40 (+30) et 60 (+80) sur target +30 :
    //   t = (30-30)/(80-30) = 0 → endDistance = 40
    expect(r.endDistance!).toBeCloseTo(40, 5);
  });

  it("ne mute pas les BallisticResult d'entrée", () => {
    const rows = [
      mkRow(0, -80),
      mkRow(20, -10),
      mkRow(40, 5),
      mkRow(60, -50),
    ];
    const snap = rows.map(r => ({ ...r }));
    computePointBlankRange(rows, 0.06);
    for (let i = 0; i < rows.length; i++) {
      expect(rows[i].drop).toBe(snap[i].drop);
      expect(rows[i].range).toBe(snap[i].range);
    }
  });

  it('range = endDistance - startDistance', () => {
    const rows = [
      mkRow(0, -90),
      mkRow(10, -50),
      mkRow(30, -10),
      mkRow(50, 20),
      mkRow(70, -50),
    ];
    const r = computePointBlankRange(rows, 0.06);
    expect(r.range).toBeCloseTo((r.endDistance ?? 0) - (r.startDistance ?? 0), 5);
  });

  it('null / undefined results → insufficient', () => {
    expect(computePointBlankRange(null, 0.05).missingReason).toBe('insufficient');
    expect(computePointBlankRange(undefined, 0.05).missingReason).toBe('insufficient');
  });
});
