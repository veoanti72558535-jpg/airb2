import { describe, it, expect } from 'vitest';
import {
  buildDistanceList,
  buildTableRows,
  defaultConfig,
  resolveRowAt,
  isColumnVisible,
  toggleColumn,
  ALL_COLUMNS,
} from './ballistic-table';
import type { BallisticResult } from './types';

function mkRow(range: number, overrides: Partial<BallisticResult> = {}): BallisticResult {
  return {
    range,
    drop: -range * 0.5,
    holdover: range * 0.1,
    holdoverMRAD: range * 0.03,
    velocity: 280 - range * 0.5,
    energy: 30 - range * 0.1,
    tof: range * 0.005,
    windDrift: range * 0.2,
    windDriftMOA: range * 0.05,
    windDriftMRAD: range * 0.015,
    clicksElevation: range,
    clicksWindage: Math.round(range / 2),
    ...overrides,
  };
}

const ROWS: BallisticResult[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(r => mkRow(r));

describe('ballistic-table — buildDistanceList', () => {
  it('produit la grille attendue avec start=0, max=100, step=10', () => {
    expect(buildDistanceList({ startDistance: 0, maxDistance: 100, step: 10, columns: [] }))
      .toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it('clamp le pas à 1 minimum', () => {
    const list = buildDistanceList({ startDistance: 0, maxDistance: 5, step: 0, columns: [] });
    expect(list).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('clamp max ≥ start', () => {
    expect(
      buildDistanceList({ startDistance: 50, maxDistance: 10, step: 5, columns: [] }),
    ).toEqual([50]);
  });
});

describe('ballistic-table — resolveRowAt', () => {
  it('retourne le row exact quand la distance correspond', () => {
    const r = resolveRowAt(ROWS, 50);
    expect(r?.range).toBe(50);
    expect(r?.velocity).toBe(255);
  });

  it('interpole linéairement entre deux rows', () => {
    const r = resolveRowAt(ROWS, 25);
    expect(r).not.toBeNull();
    // velocity at 20 = 270, at 30 = 265 → 25 = 267.5
    expect(r!.velocity).toBeCloseTo(267.5, 5);
    expect(r!.drop).toBeCloseTo(-12.5, 5);
  });

  it('retourne null hors plage', () => {
    expect(resolveRowAt(ROWS, -5)).toBeNull();
    expect(resolveRowAt(ROWS, 200)).toBeNull();
  });

  it('arrondit les clics interpolés', () => {
    const r = resolveRowAt(ROWS, 25);
    expect(Number.isInteger(r!.clicksElevation!)).toBe(true);
  });
});

describe('ballistic-table — buildTableRows', () => {
  it('drop des lignes hors-plage sans crash', () => {
    const out = buildTableRows(ROWS, { startDistance: 50, maxDistance: 200, step: 10, columns: [] });
    // 50..100 valid, beyond is dropped
    expect(out.map(r => r.range)).toEqual([50, 60, 70, 80, 90, 100]);
  });

  it('respecte le pas configuré', () => {
    const out = buildTableRows(ROWS, { startDistance: 0, maxDistance: 50, step: 25, columns: [] });
    expect(out.map(r => r.range)).toEqual([0, 25, 50]);
  });
});

describe('ballistic-table — column toggling', () => {
  it('distance reste toujours visible (required)', () => {
    const cfg = defaultConfig(100);
    const next = toggleColumn(cfg, 'distance');
    expect(next.columns).toEqual(cfg.columns);
    expect(isColumnVisible(next, 'distance')).toBe(true);
  });

  it('toggleColumn ajoute / retire une colonne optionnelle', () => {
    const cfg = defaultConfig(100);
    expect(isColumnVisible(cfg, 'tof')).toBe(false);
    const on = toggleColumn(cfg, 'tof');
    expect(isColumnVisible(on, 'tof')).toBe(true);
    const off = toggleColumn(on, 'tof');
    expect(isColumnVisible(off, 'tof')).toBe(false);
  });

  it('expose ALL_COLUMNS complet', () => {
    expect(ALL_COLUMNS).toContain('distance');
    expect(ALL_COLUMNS).toContain('tof');
    expect(ALL_COLUMNS).toContain('energy');
  });
});

describe('ballistic-table — defaultConfig', () => {
  it('utilise un pas raisonnable selon la portée', () => {
    expect(defaultConfig(50).step).toBe(5);
    expect(defaultConfig(150).step).toBe(10);
  });

  it('garde un set de colonnes par défaut sobre', () => {
    const cfg = defaultConfig(100);
    expect(cfg.columns).toContain('distance');
    expect(cfg.columns).toContain('drop');
    expect(cfg.columns).toContain('holdover');
    expect(cfg.columns).toContain('velocity');
    expect(cfg.columns).toContain('energy');
    expect(cfg.columns).not.toContain('tof');
    expect(cfg.columns).not.toContain('windClicks');
  });
});
