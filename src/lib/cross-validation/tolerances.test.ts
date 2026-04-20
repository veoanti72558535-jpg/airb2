import { describe, it, expect } from 'vitest';
import { DEFAULT_TOLERANCES, isWithinTolerance } from './tolerances';

describe('tolerances — DEFAULT_TOLERANCES', () => {
  it('expose une tolérance pour chaque métrique comparable', () => {
    expect(Object.keys(DEFAULT_TOLERANCES).sort()).toEqual(
      ['drop', 'energy', 'tof', 'velocity', 'windDrift'].sort(),
    );
  });

  it('toutes les tolérances sont positives et finies', () => {
    for (const tol of Object.values(DEFAULT_TOLERANCES)) {
      expect(tol.absThreshold).toBeGreaterThan(0);
      expect(tol.relThreshold).toBeGreaterThan(0);
      expect(Number.isFinite(tol.absThreshold)).toBe(true);
      expect(Number.isFinite(tol.relThreshold)).toBe(true);
    }
  });
});

describe('tolerances — isWithinTolerance', () => {
  it('passe si le delta absolu tient sous le seuil absolu', () => {
    // drop: abs=5, rel=8% — delta abs=4 mm avec ref énorme → relatif KO mais absolu OK
    expect(isWithinTolerance('drop', 4, 100)).toBe(true);
  });

  it('passe si le delta relatif tient sous le seuil relatif', () => {
    // drop: 50 mm absolu (>5) mais 5% relatif (<8%) → OK
    expect(isWithinTolerance('drop', 50, 0.05)).toBe(true);
  });

  it('échoue si abs ET rel dépassent', () => {
    expect(isWithinTolerance('drop', 50, 0.5)).toBe(false);
  });

  it('quand relative est null seul l\'absolu compte', () => {
    expect(isWithinTolerance('drop', 4, null)).toBe(true);
    expect(isWithinTolerance('drop', 50, null)).toBe(false);
  });

  it('compare en valeur absolue (signes ignorés)', () => {
    expect(isWithinTolerance('drop', -4, -0.04)).toBe(true);
    expect(isWithinTolerance('drop', -50, -0.5)).toBe(false);
  });
});
