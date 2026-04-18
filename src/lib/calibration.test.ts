import { describe, it, expect } from 'vitest';
import { calibrateBC, calibrationInputSchema } from './calibration';
import type { Session } from './types';

/**
 * Calibration tests. These use the real ballistic engine (not a mock) so we
 * verify the full feedback loop: engine prediction → bisection → corrected BC.
 */

function makeSession(bc: number): Pick<Session, 'input'> {
  return {
    input: {
      muzzleVelocity: 280,
      bc,
      projectileWeight: 18,
      sightHeight: 50,
      zeroRange: 30,
      maxRange: 100,
      rangeStep: 10,
      weather: {
        temperature: 15,
        humidity: 50,
        pressure: 1013,
        altitude: 0,
        windSpeed: 0,
        windAngle: 0,
        source: 'manual',
        timestamp: '',
      },
    },
  };
}

describe('calibrationInputSchema', () => {
  it('rejects a negative or zero distance', () => {
    expect(() =>
      calibrationInputSchema.parse({ measuredDistance: 0, measuredDropMm: -100 }),
    ).toThrow();
    expect(() =>
      calibrationInputSchema.parse({ measuredDistance: -10, measuredDropMm: -100 }),
    ).toThrow();
  });

  it('rejects a NaN drop', () => {
    expect(() =>
      calibrationInputSchema.parse({ measuredDistance: 50, measuredDropMm: Number.NaN }),
    ).toThrow();
  });

  it('accepts a typical airgun measurement', () => {
    expect(() =>
      calibrationInputSchema.parse({ measuredDistance: 50, measuredDropMm: -120 }),
    ).not.toThrow();
  });
});

describe('calibrateBC — round trip', () => {
  it('returns a factor very close to 1 when measured == engine prediction', () => {
    const session = makeSession(0.025);
    // First, ask the engine what drop it predicts at 50 m via a calibration
    // call with an absurd target — we just want predictedDropMm out of it.
    const probe = calibrateBC({
      session,
      measuredDistance: 50,
      measuredDropMm: -10000, // intentionally extreme to force iteration
    });
    const enginePrediction = probe.predictedDropMm;

    // Now feed the engine's own prediction back in: factor should be ~1.
    const result = calibrateBC({
      session,
      measuredDistance: 50,
      measuredDropMm: enginePrediction,
    });
    expect(result.factor).toBeCloseTo(1, 1);
    expect(result.originalBc).toBe(0.025);
    expect(result.correctedBc).toBeCloseTo(0.025, 3);
    expect(result.warning).toBeUndefined();
  });
});

describe('calibrateBC — physical direction', () => {
  it('returns factor < 1 when the shooter measures MORE drop than predicted', () => {
    // More drop ⇒ engine over-estimates BC ⇒ corrected BC must be smaller.
    const session = makeSession(0.025);
    const probe = calibrateBC({ session, measuredDistance: 50, measuredDropMm: -10000 });
    const measured = probe.predictedDropMm - 50; // 50 mm more drop than engine

    const result = calibrateBC({
      session,
      measuredDistance: 50,
      measuredDropMm: measured,
    });
    expect(result.factor).toBeLessThan(1);
    expect(result.correctedBc).toBeLessThan(0.025);
    // Engine should now reproduce the measurement to within tolerance.
    expect(Math.abs(result.achievedDropMm - measured)).toBeLessThan(1);
  });

  it('returns factor > 1 when the shooter measures LESS drop than predicted', () => {
    const session = makeSession(0.025);
    const probe = calibrateBC({ session, measuredDistance: 50, measuredDropMm: -10000 });
    const measured = probe.predictedDropMm + 30; // 30 mm less drop (less negative)

    const result = calibrateBC({
      session,
      measuredDistance: 50,
      measuredDropMm: measured,
    });
    expect(result.factor).toBeGreaterThan(1);
    expect(result.correctedBc).toBeGreaterThan(0.025);
  });
});

describe('calibrateBC — warnings', () => {
  it('flags the result as `extreme` when the BC factor leaves the plausible window', () => {
    const session = makeSession(0.025);
    // Demand way more drop than physically expected → forces k near K_MIN.
    const probe = calibrateBC({ session, measuredDistance: 50, measuredDropMm: -10000 });
    const measured = probe.predictedDropMm - 5000;

    const result = calibrateBC({
      session,
      measuredDistance: 50,
      measuredDropMm: measured,
    });
    // Either we converged outside the plausible window, OR we couldn't reach
    // the impossible target — both are acceptable warnings.
    expect(result.warning).toBeDefined();
    expect(['extreme', 'noConvergence']).toContain(result.warning);
  });
});

describe('calibrateBC — defensive errors', () => {
  it('throws when the session BC is non-positive', () => {
    expect(() =>
      calibrateBC({
        session: makeSession(0),
        measuredDistance: 50,
        measuredDropMm: -100,
      }),
    ).toThrow(/BC/);
  });

  it('throws when the muzzle velocity is non-positive', () => {
    const s = makeSession(0.025);
    s.input.muzzleVelocity = 0;
    expect(() =>
      calibrateBC({ session: s, measuredDistance: 50, measuredDropMm: -100 }),
    ).toThrow(/muzzle velocity/);
  });

  it('throws when the inputs fail validation', () => {
    expect(() =>
      calibrateBC({
        session: makeSession(0.025),
        measuredDistance: -1,
        measuredDropMm: -100,
      }),
    ).toThrow();
  });
});
