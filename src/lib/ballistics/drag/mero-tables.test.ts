/**
 * MERO drag table sanity tests — P2.
 *
 * These tests don't validate exact Cd values (P3 will, against the
 * digitised MERO source). Their job is to catch *shape* regressions:
 *   - subsonic Cd is monotone or near-flat
 *   - transonic peak exists and sits in the expected range
 *   - supersonic decay is monotone-decreasing
 *   - every law stays positive and bounded
 *
 * If any of these fail, the table no longer represents real drag physics
 * and the engine will produce nonsense — even before any tolerance check.
 */

import { describe, it, expect } from 'vitest';
import {
  cdFromMero,
  getMeroTableRaw,
  getProvenance,
  hasMeroTable,
} from './mero-tables';
import type { DragModel } from '../../types';

const ALL_MODELS: DragModel[] = ['G1', 'G7', 'GA', 'GS', 'RA4', 'GA2', 'SLG0', 'SLG1'];

describe('mero-tables — P2 sanity', () => {
  it('every supported model has a 169-point table', () => {
    for (const m of ALL_MODELS) {
      expect(hasMeroTable(m)).toBe(true);
      const t = getMeroTableRaw(m);
      expect(t.machs.length).toBe(169);
      expect(t.cds.length).toBe(169);
    }
  });

  it('every table is currently flagged derived-p2 (P3 will flip to mero-official)', () => {
    for (const m of ALL_MODELS) {
      expect(getProvenance(m)).toBe('derived-p2');
    }
  });

  it('Cd values stay positive and bounded ≤ 1.5', () => {
    for (const m of ALL_MODELS) {
      const t = getMeroTableRaw(m);
      for (let i = 0; i < t.cds.length; i++) {
        expect(t.cds[i]).toBeGreaterThan(0);
        expect(t.cds[i]).toBeLessThan(1.5);
      }
    }
  });

  it('subsonic Cd at M=0.3 sits in the expected band per family', () => {
    // Bands are intentionally wide — they catch a swapped law, not a
    // 1 % drift.
    expect(cdFromMero('G1', 0.3)).toBeGreaterThan(0.18);
    expect(cdFromMero('G1', 0.3)).toBeLessThan(0.30);
    expect(cdFromMero('G7', 0.3)).toBeGreaterThan(0.09);
    expect(cdFromMero('G7', 0.3)).toBeLessThan(0.16);
    expect(cdFromMero('GS', 0.3)).toBeGreaterThan(0.40);
    expect(cdFromMero('GS', 0.3)).toBeLessThan(0.55);
  });

  it('transonic peak (Mach 1.0–1.2) is the highest point in [0, 1.5]', () => {
    for (const m of ALL_MODELS) {
      let peakMach = 0;
      let peakCd = 0;
      for (let mach = 0; mach <= 1.5; mach += 0.02) {
        const cd = cdFromMero(m, mach);
        if (cd > peakCd) {
          peakCd = cd;
          peakMach = mach;
        }
      }
      expect(peakMach, `${m} peak Mach`).toBeGreaterThanOrEqual(0.95);
      expect(peakMach, `${m} peak Mach`).toBeLessThanOrEqual(1.25);
    }
  });

  it('supersonic Cd at M=2.5 < transonic peak Cd', () => {
    for (const m of ALL_MODELS) {
      const peak = cdFromMero(m, 1.1);
      const supersonic = cdFromMero(m, 2.5);
      expect(supersonic, `${m} supersonic`).toBeLessThan(peak);
    }
  });

  it('linear interpolation matches grid points at sample boundaries', () => {
    const t = getMeroTableRaw('G1');
    // Pick a random grid index and verify the lookup returns its exact value.
    const idx = 50;
    const machAtIdx = t.machs[idx];
    expect(cdFromMero('G1', machAtIdx)).toBeCloseTo(t.cds[idx], 6);
  });

  it('out-of-range queries clamp instead of extrapolating', () => {
    const t = getMeroTableRaw('G7');
    expect(cdFromMero('G7', -10)).toBe(t.cds[0]);
    expect(cdFromMero('G7', 100)).toBe(t.cds[t.cds.length - 1]);
  });

  it('GS (sphere) has the highest subsonic Cd of all 8 laws', () => {
    const cds = ALL_MODELS.map((m) => ({ m, cd: cdFromMero(m, 0.3) }));
    const max = cds.reduce((a, b) => (b.cd > a.cd ? b : a));
    expect(max.m).toBe('GS');
  });

  it('SLG1 (best slug) has lower subsonic Cd than RA4 (cylinder slug)', () => {
    expect(cdFromMero('SLG1', 0.5)).toBeLessThan(cdFromMero('RA4', 0.5));
  });
});
