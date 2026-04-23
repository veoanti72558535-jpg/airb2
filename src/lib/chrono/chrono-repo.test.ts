import { describe, it, expect } from 'vitest';
import { chronoStats } from './chrono-repo';
import type { ChronoMeasurement } from './chrono-repo';

describe('chronoStats', () => {
  it('returns zeros for empty array', () => {
    expect(chronoStats([])).toEqual({ avg: 0, es: 0, sd: 0 });
  });

  it('calculates correct stats', () => {
    const ms: ChronoMeasurement[] = [
      { source: 'ble', velocityMs: 250 },
      { source: 'ble', velocityMs: 252 },
      { source: 'ble', velocityMs: 248 },
    ];
    const s = chronoStats(ms);
    expect(s.avg).toBe(250);
    expect(s.es).toBe(4);
    expect(s.sd).toBeCloseTo(1.63, 1);
  });

  it('handles single measurement', () => {
    const ms: ChronoMeasurement[] = [{ source: 'manual', velocityMs: 300 }];
    const s = chronoStats(ms);
    expect(s.avg).toBe(300);
    expect(s.es).toBe(0);
    expect(s.sd).toBe(0);
  });
});